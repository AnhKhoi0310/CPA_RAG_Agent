# CPA Document Processor

Python-based document processing pipeline for CPA documents with Azure AI Search integration.

## Features

- 📄 **PDF Import**: Upload and process PDF documents
- ✂️ **Smart Chunking**: RecursiveCharacterTextSplitter from LangChain
- 🧠 **Embeddings**: HuggingFace sentence-transformers
- ☁️ **Azure Integration**: Upload to Azure AI Search with vector search

## Setup

### 1. Install Dependencies

```bash
cd python-processor
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Azure credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your_admin_api_key_here
AZURE_SEARCH_INDEX_NAME=cpa-documents
```

### 3. Run the Application

```bash
python main.py
```

The Gradio UI will open at: http://localhost:7860

## Usage

1. **Create Index** (first time only):
   - Click "Create/Update Index" button
   - This creates the vector search index in Azure

2. **Process Documents**:
   - Upload a PDF file
   - Click "Process Document"
   - Monitor the processing status

3. **What Happens**:
   - Text is extracted from PDF
   - Text is chunked into ~1000 character segments
   - Each chunk is converted to a 384-dimensional embedding
   - All chunks are uploaded to Azure AI Search

## Configuration

### Chunking Parameters
Edit `document_processor.py`:
- `chunk_size`: Maximum chunk size (default: 1000)
- `chunk_overlap`: Overlap between chunks (default: 200)

### Embedding Model
Default: `sentence-transformers/all-MiniLM-L6-v2`
- Dimension: 384
- Fast and efficient for semantic search

To change, edit `document_processor.py`:
```python
self.embedding_model = SentenceTransformer('your-model-name')
```

## Files

- `main.py`: Gradio UI and main entry point
- `document_processor.py`: PDF extraction, chunking, embeddings
- `azure_search.py`: Azure AI Search integration
- `requirements.txt`: Python dependencies
- `.env`: Configuration (create from `.env.example`)

## Troubleshooting

### Azure Connection Issues
- Verify `AZURE_SEARCH_ENDPOINT` is correct
- Check API key has admin permissions
- Ensure network allows outbound HTTPS

### Embedding Errors
- First run downloads the model (~90MB)
- Ensure internet connection for model download
- Check disk space for model cache

### PDF Processing Issues
- Ensure PDF is not encrypted
- Some scanned PDFs may need OCR
- Check PDF has extractable text
