"""
Azure AI Search integration module for uploading and searching documents.
"""

from typing import List, Dict, Any
import os
from datetime import datetime
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchField,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SearchFieldDataType
)
from dotenv import load_dotenv

load_dotenv()

class AzureSearchClient:
    """Handles Azure AI Search operations: index creation and document upload."""
    
    def __init__(self):
        """Initialize Azure Search client."""
        self.endpoint = os.getenv('AZURE_SEARCH_ENDPOINT')
        self.api_key = os.getenv('AZURE_SEARCH_API_KEY')
        self.index_name = os.getenv('AZURE_SEARCH_INDEX_NAME', 'cpa-documents')
        
        if not self.endpoint or not self.api_key:
            raise ValueError("Missing Azure Search credentials in .env file")
        
        self.credential = AzureKeyCredential(self.api_key)
        self.index_client = SearchIndexClient(self.endpoint, self.credential)
        self.search_client = SearchClient(self.endpoint, self.index_name, self.credential)
    
    def delete_index(self) -> Dict[str, Any]:
        """
        Delete the Azure AI Search index.
        
        Returns:
            Dict with success status
        """
        try:
            self.index_client.delete_index(self.index_name)
            return {
                'success': True,
                'message': f"Index '{self.index_name}' deleted successfully"
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_index(self, embedding_dim: int = 384) -> Dict[str, Any]:
        """
        Create or update the Azure AI Search index.
        
        Args:
            embedding_dim: Dimension of embedding vectors (default: 384 for all-MiniLM-L6-v2)
            
        Returns:
            Dict with success status and index name
        """
        try:
            # Define vector search configuration
            vector_search = VectorSearch(
                algorithms=[
                    HnswAlgorithmConfiguration(
                        name="hnsw-config",
                        parameters={
                            "m": 4,
                            "efConstruction": 400,
                            "efSearch": 500,
                            "metric": "cosine"
                        }
                    )
                ],
                profiles=[
                    VectorSearchProfile(
                        name="vector-profile",
                        algorithm_configuration_name="hnsw-config"
                    )
                ]
            )
            
            # Define index fields
            fields = [
                SimpleField(name="id", type=SearchFieldDataType.String, key=True),
                SearchableField(name="content", type=SearchFieldDataType.String),
                SearchableField(name="source_file", type=SearchFieldDataType.String, filterable=True),
                SimpleField(name="chunk_index", type=SearchFieldDataType.Int32, filterable=True),
                SimpleField(name="upload_date", type=SearchFieldDataType.DateTimeOffset, filterable=True),
                SearchField(
                    name="content_vector",
                    type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                    searchable=True,
                    vector_search_dimensions=embedding_dim,
                    vector_search_profile_name="vector-profile"
                )
            ]
            
            # Create index definition
            index = SearchIndex(
                name=self.index_name,
                fields=fields,
                vector_search=vector_search
            )
            
            # Create or update index
            result = self.index_client.create_or_update_index(index)
            
            return {
                'success': True,
                'index_name': result.name,
                'message': f"Index '{result.name}' created/updated successfully"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_documents(
        self,
        chunks: List[str],
        embeddings: List[List[float]],
        source_file: str
    ) -> Dict[str, Any]:
        """
        Upload document chunks and embeddings to Azure AI Search.
        
        Args:
            chunks: List of text chunks
            embeddings: List of embedding vectors
            source_file: Name of the source file
            
        Returns:
            Dict with success status and count
        """
        try:
            if len(chunks) != len(embeddings):
                raise ValueError("Number of chunks must match number of embeddings")
            
            # Prepare documents
            documents = []
            upload_time = datetime.utcnow().isoformat() + "Z"
            
            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                doc = {
                    "id": f"{source_file.replace('.', '_')}_{idx}",
                    "content": chunk,
                    "source_file": source_file,
                    "chunk_index": idx,
                    "upload_date": upload_time,
                    "content_vector": embedding
                }
                documents.append(doc)
            
            # Upload to Azure Search
            result = self.search_client.upload_documents(documents=documents)
            
            return {
                'success': True,
                'count': len(documents),
                'index_name': self.index_name,
                'message': f"Uploaded {len(documents)} documents successfully"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def search_similar(
        self,
        query_embedding: List[float],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using vector search.
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            
        Returns:
            List of search results
        """
        try:
            results = self.search_client.search(
                search_text=None,
                vector_queries=[{
                    "vector": query_embedding,
                    "k_nearest_neighbors": top_k,
                    "fields": "content_vector"
                }],
                select=["content", "source_file", "chunk_index"]
            )
            
            return [
                {
                    'content': result['content'],
                    'source': result['source_file'],
                    'chunk': result['chunk_index'],
                    'score': result.get('@search.score', 0)
                }
                for result in results
            ]
            
        except Exception as e:
            raise Exception(f"Error searching documents: {str(e)}")
