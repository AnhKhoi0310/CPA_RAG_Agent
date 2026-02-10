"""
Main entry point for the document processing pipeline.
Provides a Gradio UI for uploading PDFs and processing them.
"""

import gradio as gr
import os
from pathlib import Path
from document_processor import DocumentProcessor
from azure_search import AzureSearchClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize processor and Azure client
processor = DocumentProcessor()
azure_client = AzureSearchClient()

def process_pdf(pdf_file):
    """
    Process uploaded PDF file: extract text, chunk, embed, and upload to Azure.
    
    Args:
        pdf_file: File object from Gradio file upload
        
    Returns:
        str: Status message
    """
    try:
        if pdf_file is None:
            return "❌ No file uploaded"
        
        # Get file path
        file_path = pdf_file.name
        file_name = Path(file_path).name
        
        # Step 1: Extract text from PDF
        status = f"📄 Processing: {file_name}\n\n"
        status += "⏳ Extracting text from PDF...\n"
        
        text = processor.extract_text_from_pdf(file_path)
        if not text:
            return status + "❌ Error: Could not extract text from PDF"
        
        status += f"✅ Extracted {len(text)} characters\n\n"
        
        # Step 2: Chunk the text
        status += "⏳ Chunking text...\n"
        chunks = processor.chunk_text(text)
        status += f"✅ Created {len(chunks)} chunks\n\n"
        
        # Step 3: Generate embeddings
        status += "⏳ Generating embeddings...\n"
        embeddings = processor.generate_embeddings(chunks)
        status += f"✅ Generated {len(embeddings)} embeddings\n\n"
        
        # Step 4: Upload to Azure AI Search
        status += "⏳ Uploading to Azure AI Search...\n"
        result = azure_client.upload_documents(chunks, embeddings, file_name)
        
        if result['success']:
            status += f"✅ Successfully uploaded {result['count']} documents to Azure\n"
            status += f"📊 Index: {result['index_name']}\n"
        else:
            status += f"❌ Upload failed: {result['error']}\n"
        
        return status
        
    except Exception as e:
        return f"❌ Error processing file: {str(e)}"

def create_index():
    """Create or update the Azure AI Search index."""
    try:
        result = azure_client.create_index()
        if result['success']:
            return f"✅ Index '{result['index_name']}' created successfully"
        else:
            return f"❌ Error creating index: {result['error']}"
    except Exception as e:
        return f"❌ Error: {str(e)}"

def delete_index():
    """Delete the Azure AI Search index."""
    try:
        result = azure_client.delete_index()
        if result['success']:
            return f"✅ {result['message']}"
        else:
            return f"❌ Error deleting index: {result['error']}"
    except Exception as e:
        return f"❌ Error: {str(e)}"

# Create Gradio interface
with gr.Blocks(title="CPA Document Processor", theme=gr.themes.Soft()) as app:
    gr.Markdown("# 📚 CPA Document Processor")
    gr.Markdown("Upload PDF documents to process and index them in Azure AI Search")
    
    with gr.Row():
        with gr.Column(scale=2):
            file_input = gr.File(
                label="Upload PDF Document",
                file_types=[".pdf"],
                type="filepath"
            )
            
            with gr.Row():
                process_btn = gr.Button("🚀 Process Document", variant="primary", size="lg")
                create_index_btn = gr.Button("🔧 Create/Update Index", variant="secondary")
                delete_index_btn = gr.Button("🗑️ Delete Index", variant="stop")
            
            output = gr.Textbox(
                label="Processing Status",
                lines=15,
                max_lines=20,
                interactive=False
            )
        
        with gr.Column(scale=1):
            gr.Markdown("""
            ### ℹ️ How it works:
            
            1. **Upload PDF**: Select a PDF file
            2. **Extract**: Text is extracted from the PDF
            3. **Chunk**: Text is split into meaningful chunks
            4. **Embed**: Chunks are converted to embeddings using HuggingFace
            5. **Index**: Documents are uploaded to Azure AI Search
            
            ### 📝 Configuration:
            
            Make sure to configure your `.env` file with:
            - `AZURE_SEARCH_ENDPOINT`
            - `AZURE_SEARCH_API_KEY`
            - `AZURE_SEARCH_INDEX_NAME`
            
            ### 🔍 Current Settings:
            - **Chunk Size**: 1000 characters
            - **Chunk Overlap**: 200 characters
            - **Embedding Model**: sentence-transformers/all-MiniLM-L6-v2 (384 dims)
            """)
    
    # Event handlers
    process_btn.click(
        fn=process_pdf,
        inputs=[file_input],
        outputs=[output]
    )
    
    create_index_btn.click(
        fn=create_index,
        inputs=[],
        outputs=[output]
    )
    
    delete_index_btn.click(
        fn=delete_index,
        inputs=[],
        outputs=[output]
    )

if __name__ == "__main__":
    print("🚀 Starting CPA Document Processor...")
    print("📝 Make sure to configure your .env file")
    app.launch(
        server_name="0.0.0.0",
        server_port=5000,
        share=False,
        show_error=True
    )
