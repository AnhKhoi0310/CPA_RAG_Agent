"""
Document processing module: PDF extraction, chunking, and embedding generation.
"""

from typing import List
import PyPDF2
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import numpy as np

class DocumentProcessor:
    """Handles document processing: extraction, chunking, and embedding."""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        """
        Initialize the document processor.
        
        Args:
            chunk_size: Maximum size of each text chunk
            chunk_overlap: Number of characters to overlap between chunks
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        # Initialize embedding model
        print("⏳ Loading embedding model...")
        self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        print("✅ Embedding model loaded")
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extract text content from a PDF file.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            str: Extracted text content
        """
        try:
            text = ""
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n\n--- Page {page_num + 1} ---\n\n"
                        text += page_text
            
            return text.strip()
            
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {str(e)}")
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into chunks using RecursiveCharacterTextSplitter.
        
        Args:
            text: Input text to split
            
        Returns:
            List[str]: List of text chunks
        """
        try:
            chunks = self.text_splitter.split_text(text)
            return chunks
            
        except Exception as e:
            raise Exception(f"Error chunking text: {str(e)}")
    
    def generate_embeddings(self, chunks: List[str]) -> List[List[float]]:
        """
        Generate embeddings for text chunks using HuggingFace model.
        
        Args:
            chunks: List of text chunks
            
        Returns:
            List[List[float]]: List of embedding vectors
        """
        try:
            # Generate embeddings
            embeddings = self.embedding_model.encode(
                chunks,
                show_progress_bar=True,
                convert_to_numpy=True
            )
            
            # Convert to list format
            return embeddings.tolist()
            
        except Exception as e:
            raise Exception(f"Error generating embeddings: {str(e)}")
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of the embedding vectors."""
        return self.embedding_model.get_sentence_embedding_dimension()
