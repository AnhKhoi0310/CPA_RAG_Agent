from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import os

app = Flask(__name__)
CORS(app)

# Load the embedding model
print("Loading embedding model...")
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
print("Model loaded successfully!")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'model': 'all-MiniLM-L6-v2'})

@app.route('/embed', methods=['POST'])
def embed():
    """Generate embeddings for input text"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing text field'}), 400
        
        text = data['text']
        
        if not text or not isinstance(text, str):
            return jsonify({'error': 'Text must be a non-empty string'}), 400
        
        # Generate embedding
        embedding = model.encode(text, normalize_embeddings=True)
        
        # Convert to list for JSON serialization
        embedding_list = embedding.tolist()
        
        return jsonify({
            'embedding': embedding_list,
            'dimension': len(embedding_list),
            'model': 'all-MiniLM-L6-v2'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/embed/batch', methods=['POST'])
def embed_batch():
    """Generate embeddings for multiple texts"""
    try:
        data = request.get_json()
        
        if not data or 'texts' not in data:
            return jsonify({'error': 'Missing texts field'}), 400
        
        texts = data['texts']
        
        if not isinstance(texts, list) or len(texts) == 0:
            return jsonify({'error': 'texts must be a non-empty array'}), 400
        
        # Generate embeddings
        embeddings = model.encode(texts, normalize_embeddings=True)
        
        # Convert to list for JSON serialization
        embeddings_list = [emb.tolist() for emb in embeddings]
        
        return jsonify({
            'embeddings': embeddings_list,
            'count': len(embeddings_list),
            'dimension': len(embeddings_list[0]) if embeddings_list else 0,
            'model': 'all-MiniLM-L6-v2'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
