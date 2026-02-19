// server.js
import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import cors from 'cors';

// We'll dynamically import 'openid-client' at runtime to avoid CJS/ESM export issues
let Issuer;
let generators;

// Load .env file if it exists (for local development outside Docker)
// In Docker, environment variables are provided by docker-compose env_file
try {
  dotenv.config();
} catch (e) {
  // Silent fail - env vars provided by docker-compose
}

// Debug: Log environment configuration
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  OIDC_ISSUER: process.env.OIDC_ISSUER ? 'set' : 'NOT SET',
  SESSION_SECRET: process.env.SESSION_SECRET ? 'set' : 'NOT SET',
  AZURE_SEARCH_ENDPOINT: process.env.AZURE_SEARCH_ENDPOINT ? 'set' : 'NOT SET'
});

const app = express();

// CORS configuration - normalize frontend URL (remove trailing slash)
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
app.use(cors({ 
  origin: frontendUrl, 
  credentials: true, 
  methods: ['GET','POST','OPTIONS','PUT','DELETE']
}));
app.use(express.json());

// Session configuration - using MemoryStore for development
// TODO: For production, use Redis or another persistent session store
app.use(session({
  store: new session.MemoryStore(),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }, // in production set secure:true and use HTTPS
}));

app.get('/', (req, res) => {
  res.send('Hello World');
});

// OIDC client will be initialized asynchronously
let client;

(async () => {
  try {
    if (!process.env.OIDC_ISSUER) {
      console.warn('OIDC_ISSUER not set. OAuth endpoints will not be available.');
    } else {
      // dynamic import to handle different module formats
      const openid = await import('openid-client');
      Issuer = openid.Issuer || openid.default?.Issuer;
      generators = openid.generators || openid.default?.generators;
      if (!Issuer || !generators) throw new Error('openid-client exports not found (Issuer/generators)');

      const issuer = await Issuer.discover(process.env.OIDC_ISSUER);
      client = new issuer.Client({
        client_id: process.env.OIDC_CLIENT_ID,
        client_secret: process.env.OIDC_CLIENT_SECRET,
        redirect_uris: [process.env.OIDC_REDIRECT_URI || 'http://localhost:4000/auth/callback'],
        response_types: ['code'],
      });
      console.log('OIDC client configured for issuer', issuer.issuer);
    }
  } catch (err) {
    console.error('Error setting up OIDC client', err);
  }

  // Start OAuth2 / OIDC login flow with PKCE
  app.get('/auth/login', (req, res) => {
    if (!client) return res.status(500).send('OIDC client not configured');

    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);
    const state = generators.random();
    const nonce = generators.random();

    // store PKCE and state in session for callback verification
    req.session.code_verifier = code_verifier;
    req.session.state = state;
    req.session.nonce = nonce;

    const authUrl = client.authorizationUrl({
      scope: 'openid email profile',
      code_challenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    });

    res.redirect(authUrl);
  });

  // Callback endpoint
  app.get('/auth/callback', async (req, res, next) => {
    if (!client) return res.status(500).send('OIDC client not configured');
    try {
      const params = client.callbackParams(req);

      if (req.session.state && params.state !== req.session.state) {
        return res.status(400).send('Invalid state');
      }

      const tokenSet = await client.callback(process.env.OIDC_REDIRECT_URI || 'http://localhost:4000/auth/callback', params, { code_verifier: req.session.code_verifier, state: req.session.state, nonce: req.session.nonce });

      req.session.tokenSet = tokenSet;

      try {
        const userinfo = await client.userinfo(tokenSet.access_token);
        req.session.user = userinfo;
      } catch (e) {
        console.warn('Failed to fetch userinfo', e);
      }

      // Redirect back to frontend app
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000/agent');
    } catch (err) {
      next(err);
    }
  });

  // Simple endpoint to check authentication
  app.get('/auth/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'not_authenticated' });
    res.json({ user: req.session.user, tokenSet: req.session.tokenSet });
  });

  // Redirect logout (for browser direct navigation)
  app.get('/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
    });
  });

  // JSON logout endpoint for XHR/fetch requests (avoids following redirects)
  app.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      res.clearCookie('connect.sid');
      if (err) return res.status(500).json({ ok: false, error: 'logout_failed' });
      res.json({ ok: true });
    });
  });

  // Embedding service endpoint - proxies to Python embedding container
  app.post('/api/embed', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid text field' });
      }

      const embeddingServiceUrl = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${embeddingServiceUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Embedding service error:', errorText);
        return res.status(response.status).json({ error: 'Embedding service failed', details: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error('Error calling embedding service:', err);
      res.status(500).json({ error: 'Failed to generate embedding', details: err.message });
    }
  });

  // Azure Search proxy endpoint - vector search
  app.post('/api/search/vector', async (req, res) => {
    try {
      const { queryEmbedding } = req.body;
      
      if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
        return res.status(400).json({ error: 'Missing or invalid queryEmbedding field' });
      }

      const azureSearchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
      const azureSearchKey = process.env.AZURE_SEARCH_API_KEY;
      const azureSearchIndex = process.env.AZURE_SEARCH_INDEX_NAME || 'cpa-documents';

      if (!azureSearchEndpoint || !azureSearchKey) {
        return res.status(500).json({ error: 'Azure Search not configured' });
      }

      const searchUrl = `${azureSearchEndpoint}/indexes/${azureSearchIndex}/docs/search?api-version=2023-11-01`;
      
      const requestBody = {
        vectorQueries: [
          {
            kind: 'vector',
            vector: queryEmbedding,
            k: 5,
            fields: 'content_vector'
          }
        ],
        select: 'id,content,source_file,chunk_index,upload_date'
      };

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureSearchKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure Search error:', errorText);
        return res.status(response.status).json({ error: 'Azure Search failed', details: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error('Error calling Azure Search:', err);
      res.status(500).json({ error: 'Failed to search Azure', details: err.message });
    }
  });

  // Azure Search proxy endpoint - text search (fallback)
  app.post('/api/search/text', async (req, res) => {
    try {
      const { queryText } = req.body;
      
      if (!queryText || typeof queryText !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid queryText field' });
      }

      const azureSearchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
      const azureSearchKey = process.env.AZURE_SEARCH_API_KEY;
      const azureSearchIndex = process.env.AZURE_SEARCH_INDEX_NAME || 'cpa-documents';

      if (!azureSearchEndpoint || !azureSearchKey) {
        return res.status(500).json({ error: 'Azure Search not configured' });
      }

      const searchUrl = `${azureSearchEndpoint}/indexes/${azureSearchIndex}/docs/search?api-version=2023-11-01`;
      
      const requestBody = {
        search: queryText,
        top: 5,
        select: 'id,content,source_file,chunk_index,upload_date'
      };

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureSearchKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure Search error:', errorText);
        return res.status(response.status).json({ error: 'Azure Search failed', details: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error('Error calling Azure Search:', err);
      res.status(500).json({ error: 'Failed to search Azure', details: err.message });
    }
  });

  // global error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Server error');
  });

  app.listen(4000, () => console.log('Server running on http://localhost:4000'));
})();
