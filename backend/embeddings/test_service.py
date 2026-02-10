"""
Test script for embedding service
Run this to verify the embedding service is working correctly
"""

import requests
import json

def test_embedding_service():
    base_url = "http://localhost:5000"
    
    print("Testing Embedding Service...")
    print("-" * 50)
    
    # Test 1: Health check
    print("\n1. Health Check")
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Test 2: Single embedding
    print("\n2. Single Text Embedding")
    try:
        response = requests.post(
            f"{base_url}/embed",
            json={"text": "What are the tax implications for small businesses?"}
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Dimension: {data.get('dimension')}")
        print(f"Model: {data.get('model')}")
        print(f"Embedding (first 5 values): {data.get('embedding', [])[:5]}")
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Test 3: Batch embeddings
    print("\n3. Batch Text Embeddings")
    try:
        response = requests.post(
            f"{base_url}/embed/batch",
            json={
                "texts": [
                    "Tax filing deadline",
                    "Audit procedures",
                    "Financial reporting"
                ]
            }
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Count: {data.get('count')}")
        print(f"Dimension: {data.get('dimension')}")
        print(f"Model: {data.get('model')}")
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    print("\n" + "-" * 50)
    print("✅ All tests passed!")

if __name__ == "__main__":
    test_embedding_service()
