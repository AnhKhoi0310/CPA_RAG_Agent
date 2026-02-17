# CPA RAG Agent Bot

A sophisticated AI-powered assistant system for GreenLeaf CPA & Associates, combining **Retrieval-Augmented Generation (RAG)** with modern web technologies to provide both public-facing customer service and internal agent support with access to a knowledge base.

---

## 🎯 Project Overview

This project implements **two intelligent chatbots**:

1. **Public Bot** - Customer-facing assistant for general CPA, tax, and business inquiries
2. **Private Bot** - Internal agent assistant with RAG-powered access to firm documents, policies, and case histories

### Key Innovation: RAG Architecture

The Private Bot uses **Retrieval-Augmented Generation** to:
- Convert user queries into semantic embeddings
- Search a vector database (Azure AI Search) for relevant documents
- Provide contextual answers by combining retrieved knowledge with AI reasoning
- Fall back to general knowledge when specific information isn't available

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  - Public Landing Page with services, team, benefits            │
│  - Agent Portal with dashboard and analytics                    │
│  - PublicBot: General CPA assistance (Gemini 1.5 Flash)        │
│  - PrivateBot: RAG-powered agent assistant                      │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                    │
             ▼                                    ▼
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Backend (Express.js)   │         │  Python Embedding Service    │
│  - OAuth (Google OIDC)  │◄────────│  - Flask API (port 5001)     │
│  - Session Management   │         │  - sentence-transformers     │
│  - /api/embed proxy     │         │  - all-MiniLM-L6-v2 model   │
│  - /api/search/* proxy  │         │  - 384-dim vectors           │
└────────┬────────────────┘         └──────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Azure AI Search (Vector Database)                   │
│  - Index: cpa-documents                                          │
│  - HNSW algorithm for vector search                             │
│  - Fields: content, content_vector, source_file, chunk_index    │
└─────────────────────────────────────────────────────────────────┘
         ▲
         │
┌────────┴────────────────────┐
│  Python Document Processor  │
│  - Gradio UI for PDF upload │
│  - PyPDF2 text extraction   │
│  - LangChain text splitter  │
│  - Document chunking        │
│  - Index management         │
└─────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend Technologies

#### **React 18 + TypeScript**
- **Component-based architecture**: PublicChat, PrivateChat, PublicBot, PrivateBot
- **Type safety**: Full TypeScript implementation for compile-time error detection
- **State Management**: React hooks (useState, useEffect, useRef)
- **Responsive design**: Mobile-friendly with CSS Grid and Flexbox

#### **Key Features**
- **Fixed resizable bots**: Bottom-right positioned, top-left corner resize handle
- **Markdown rendering**: Bold, italic, headings, code blocks, bullet points
- **Real-time formatting**: `pre-wrap` for spacing, `dangerouslySetInnerHTML` for HTML rendering
- **Beautiful UI**: Light green gradient theme, smooth animations, card-based layouts
- **Company branding**: Stats (2,400+ clients, 98% satisfaction, $2.8B+ assets), expert team profiles

---

### Backend Technologies

#### **Express.js (Node.js)**
- **RESTful API**: JSON endpoints for embeddings and search
- **Middleware stack**: 
  - `cors`: Cross-origin requests from React frontend
  - `express-session`: Server-side session storage
  - `express.json()`: JSON body parsing

#### **OAuth 2.0 / OpenID Connect (Google)**
- **Provider**: Google Accounts (`accounts.google.com`)
- **Flow**: Authorization Code with PKCE (Proof Key for Code Exchange)
- **Implementation**: `openid-client` library
- **Security**: 
  - Code verifier/challenge for PKCE
  - State parameter for CSRF protection
  - Nonce for replay attack prevention
- **Endpoints**:
  - `GET /auth/login` - Initiates OAuth flow
  - `GET /auth/callback` - Handles OAuth redirect
  - `GET /auth/me` - Returns authenticated user info
  - `POST /auth/logout` - Destroys session

#### **Proxy Endpoints**
```javascript
POST /api/embed
  → Proxies to Python embedding service
  → Input: { text: string }
  → Output: { embedding: number[] }

POST /api/search/vector
  → Proxies to Azure AI Search
  → Input: { queryEmbedding: number[] }
  → Output: { value: SearchResult[] }

POST /api/search/text
  → Text-based fallback search
  → Input: { queryText: string }
  → Output: { value: SearchResult[] }
```

**Why proxy?**
- Hides API keys from frontend (security)
- Solves CORS issues
- Centralizes authentication
- Enables request logging and rate limiting

---

### AI & Machine Learning

#### **Google Gemini 1.5 Flash**
- **Provider**: Google AI Studio
- **API**: `@google/generative-ai` SDK
- **Model**: `gemini-1.5-flash` (fast, cost-effective)
- **Capabilities**:
  - Natural language understanding
  - Context-aware responses
  - System instruction support
  - Memory/conversation history (5-turn window)

**Public Bot System Prompt**:
```
You are a helpful assistant for GreenLeaf CPA & Associates. 
Answer tax, audit, and advisory questions professionally.
Format with markdown (bold, lists, structure).
```

**Private Bot System Prompt**:
```
You are an internal CPA agent assistant with access to documents.
1. Check retrieved context first
2. If context is helpful, use it
3. If context is empty, state "I couldn't find in knowledge base" 
   and provide answer from general CPA knowledge
4. Always provide useful answers - never refuse
5. Format with markdown for readability
```

#### **Hugging Face Transformers**
- **Library**: `sentence-transformers`
- **Model**: `all-MiniLM-L6-v2`
- **Specs**:
  - 384-dimensional embeddings
  - ~22M parameters
  - Optimized for semantic similarity
  - CPU-friendly (no GPU required)
- **Use case**: Convert text → vector for semantic search

**Embedding Process**:
```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embedding = model.encode("What are tax deductions for LLCs?")
# Output: [0.056, 0.046, 0.026, ..., -0.040] (384 values)
```

---

### Vector Search & Database

#### **Azure AI Search**
- **Service Type**: Azure Cognitive Search (cloud-hosted)
- **Index Name**: `cpa-documents`
- **Algorithm**: HNSW (Hierarchical Navigable Small World)
  - Graph-based approximate nearest neighbor search
  - O(log N) search complexity
  - 98%+ accuracy with 10x speed improvement over exact search

**Index Schema**:
```json
{
  "id": "p17_1_pdf_701",
  "content": "Partnership Income\nA partnership generally isn't...",
  "content_vector": [0.056, 0.046, ...], // 384 dimensions
  "source_file": "p17_1.pdf",
  "chunk_index": 701,
  "upload_date": "2026-02-06T15:39:07.335Z"
}
```

**Vector Query**:
```json
{
  "vectorQueries": [{
    "vector": [0.12, 0.45, ...],  // Query embedding
    "k": 5,                        // Top 5 results
    "fields": "content_vector"     // Field to search
  }],
  "select": "id,content,source_file,chunk_index,upload_date"
}
```

**Why Azure AI Search?**
- Native vector search support
- Hybrid search (vector + text)
- Scalable (millions of documents)
- Built-in relevance scoring
- REST API integration

---

### Python Services

#### **Flask Embedding Service**
- **Port**: 5001
- **Framework**: Flask with CORS enabled
- **Endpoints**:
  ```
  GET  /health → { status: "healthy", model: "all-MiniLM-L6-v2" }
  POST /embed  → { embedding: [...], dimension: 384 }
  POST /embed/batch → { embeddings: [[...], [...]] }
  ```
- **Model loading**: Cached in memory (loaded once on startup)
- **Performance**: ~50ms per embedding on CPU

#### **Gradio Document Processor**
- **UI Framework**: Gradio (web UI for ML models)
- **Features**:
  - PDF file upload interface
  - Index management (create/delete)
  - Document chunking with LangChain
  - Batch embedding generation
  - Azure upload with progress tracking

**Document Processing Pipeline**:
```
PDF Upload
   ↓
PyPDF2 Text Extraction
   ↓
RecursiveCharacterTextSplitter (LangChain)
   - chunk_size: 1000 characters
   - chunk_overlap: 200 characters
   ↓
Generate Embeddings (sentence-transformers)
   ↓
Upload to Azure AI Search
   - Batch size: 100 documents
   - Metadata: source_file, chunk_index, upload_date
```

---

### Infrastructure & DevOps

#### **Docker Containerization**

**Three Services**:

1. **Embedding Service** (`backend/embeddings/Dockerfile`)
```dockerfile
FROM python:3.9-slim
RUN pip install sentence-transformers flask flask-cors
EXPOSE 5000
CMD ["python", "app.py"]
```

2. **Backend Service** (`backend/Dockerfile`)
```dockerfile
FROM node:18-alpine
RUN npm install
EXPOSE 4000
CMD ["npm", "start"]
```

3. **Frontend Service** (`frontend/Dockerfile`)
```dockerfile
FROM node:18-alpine AS builder
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
```

## 🔐 Security Features

### Authentication
- **OAuth 2.0 with PKCE**: Prevents authorization code interception
- **Session-based auth**: Server-side session storage
- **CORS protection**: Whitelist frontend origin only
- **API key protection**: All keys in backend `.env` (never in frontend)

### Data Security
- **Environment variables**: `.env` files for all sensitive data
- **Git ignored**: `.gitignore` prevents credential commits
- **Proxy pattern**: Frontend never directly calls Azure/Gemini
- **HTTPS ready**: Production Nginx configuration

### Input Sanitization
- **XSS prevention**: HTML escaping before markdown rendering
- **SQL injection**: Azure SDK handles parameterization
- **Rate limiting ready**: Express middleware available

---
## 📊 Performance Metrics

- **Embedding generation**: ~50ms per query
- **Azure vector search**: ~150ms for top-5 results
- **Gemini response**: ~1-2 seconds
- **Total RAG flow**: ~2-3 seconds end-to-end
- **Document chunking**: ~1000 chunks per MB of PDF
- **Index size**: 892 documents (expandable to millions)

---

## 🔮 Future Enhancements

1. **Multi-model support**: Switch between Gemini, GPT-4, Claude
2. **Fine-tuned embeddings**: Custom model for CPA-specific terminology
3. **Citation tracking**: Show exact source chunks in answers
4. **Feedback loop**: User ratings to improve retrieval
5. **Advanced RAG**: Re-ranking, query expansion, hybrid search
6. **Real-time sync**: Webhook-based document updates
7. **Multi-tenancy**: Separate knowledge bases per client
8. **Analytics dashboard**: Query patterns, popular topics, response quality


## 🙏 Acknowledgments

- **Google Gemini**: Fast, cost-effective LLM
- **Hugging Face**: Open-source embedding models
- **Azure AI Search**: Enterprise vector database
- **LangChain**: Document processing utilities
- **Flask + Express**: Lightweight API frameworks
- **React + TypeScript**: Modern frontend stack
- **Docker**: Containerization and orchestration

---

**Built with ❤️ for intelligent CPA assistance**
