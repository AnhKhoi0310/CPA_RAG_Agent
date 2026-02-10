# CPA Agent Bot - Docker Setup

## Architecture

This application consists of three containerized services:

1. **Embeddings Service** (Python/Flask) - Generates semantic embeddings using sentence-transformers
2. **Backend** (Node.js/Express) - OAuth authentication and API proxy
3. **Frontend** (React) - User interface with RAG chatbot

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v3.8 or higher

## Quick Start

### 1. Create Environment File

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your:
- OAuth/OIDC credentials (Google, Azure AD, Auth0, etc.)
- Gemini API key
- Azure AI Search credentials

### 2. Build and Start Services

```bash
docker-compose up --build
```

This will:
- Build all three Docker images
- Start the embedding service on port 5000
- Start the backend on port 4000
- Start the frontend on port 3000

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Embedding Service**: http://localhost:5000

## Service Details

### Embeddings Service (Port 5000)

**Endpoints:**
- `GET /health` - Health check
- `POST /embed` - Generate embedding for single text
  ```json
  {
    "text": "your query here"
  }
  ```
- `POST /embed/batch` - Generate embeddings for multiple texts
  ```json
  {
    "texts": ["query 1", "query 2"]
  }
  ```

**Model:** sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)

### Backend (Port 4000)

**Endpoints:**
- `GET /auth/login` - Start OAuth flow
- `GET /auth/callback` - OAuth callback
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout
- `POST /api/embed` - Proxy to embedding service

### Frontend (Port 3000)

**Routes:**
- `/` - Public landing page with chatbot
- `/agent` - Authenticated agent portal with RAG bot
- `/public` - Public chat page

## Development Mode

To run services individually for development:

### Embedding Service Only
```bash
cd backend/embeddings
pip install -r requirements.txt
python app.py
```

### Backend Only
```bash
cd backend
npm install
npm start
```

### Frontend Only
```bash
cd frontend
npm install
npm start
```

## Environment Variables

### Backend (.env or docker-compose)
- `EMBEDDING_SERVICE_URL` - URL of embedding service (default: http://localhost:5000)
- `FRONTEND_URL` - URL of frontend (default: http://localhost:3000)
- `SESSION_SECRET` - Secret for sessions
- `OIDC_ISSUER` - OAuth issuer URL
- `OIDC_CLIENT_ID` - OAuth client ID
- `OIDC_CLIENT_SECRET` - OAuth client secret
- `OIDC_REDIRECT_URI` - OAuth callback URL

### Frontend (.env)
- `REACT_APP_BACKEND_URL` - Backend API URL
- `REACT_APP_GEMINI_API_KEY` - Google Gemini API key
- `REACT_APP_AZURE_SEARCH_ENDPOINT` - Azure Search endpoint
- `REACT_APP_AZURE_SEARCH_API_KEY` - Azure Search API key
- `REACT_APP_AZURE_SEARCH_INDEX_NAME` - Azure Search index name

## Docker Commands

### Start services in background
```bash
docker-compose up -d
```

### View logs
```bash
docker-compose logs -f
```

### Stop services
```bash
docker-compose down
```

### Rebuild after code changes
```bash
docker-compose up --build
```

### Remove all containers and volumes
```bash
docker-compose down -v
```

## Troubleshooting

### Embedding service fails to start
- Check if port 5000 is available
- Ensure sufficient disk space for model download (~100MB)
- Check logs: `docker-compose logs embeddings`

### Backend can't connect to embedding service
- Ensure embeddings service is healthy: `docker-compose ps`
- Check network: `docker network ls`
- Verify EMBEDDING_SERVICE_URL uses service name: `http://embeddings:5000`

### Frontend build fails
- Check Node.js version in Dockerfile (requires Node 18+)
- Verify all environment variables are set
- Check build logs: `docker-compose logs frontend`

## Production Deployment

For production:

1. Update `docker-compose.yml`:
   - Remove port mappings for internal services
   - Add nginx reverse proxy
   - Enable HTTPS
   - Set `NODE_ENV=production`

2. Use secrets management instead of .env files

3. Configure proper health checks and restart policies

4. Set up monitoring and logging

## License

[Your License]
