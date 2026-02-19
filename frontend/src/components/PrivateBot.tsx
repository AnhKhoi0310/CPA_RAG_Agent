import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

type Message = { id: string; role: 'user' | 'assistant'; text: string; timestamp: number };

interface SearchResult {
  id: string;
  content: string;
  source_file: string;
  chunk_index: number;
  upload_date: string;
  score: number;
}

const PrivateBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'assistant', text: 'Welcome to your RAG-powered Agent Assistant. Ask questions about internal policies, client cases, tax regulations, and firm workflows.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [memory, setMemory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embeddingServiceAvailable, setEmbeddingServiceAvailable] = useState(false);
  const [checkingService, setCheckingService] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);
  const botRef = useRef<HTMLDivElement | null>(null);

  // Fixed position with resize capability
  const [size, setSize] = useState({ width: 450, height: 650 });
  const [isResizing, setIsResizing] = useState(false);

  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  // Normalize backend URL - remove trailing slash
  const backend = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
  const azureSearchEndpoint = process.env.REACT_APP_AZURE_SEARCH_ENDPOINT;
  const azureSearchKey = process.env.REACT_APP_AZURE_SEARCH_API_KEY;
  
  const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

  // Format markdown text to HTML
  const formatMarkdown = (text: string): string => {
    // First escape HTML to prevent XSS
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Then apply markdown formatting
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // Bold
      .replace(/\*(.+?)\*/g, '<em>$1</em>')              // Italic
      .replace(/`(.+?)`/g, '<code>$1</code>')            // Inline code
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')           // H3
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')            // H2
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')             // H1
      .replace(/^- (.+)$/gm, '• $1')                    // Bullet points
      .replace(/^\d+\. (.+)$/gm, (match) => match);    // Numbered lists
  };

  // Check if embedding service is available
  useEffect(() => {
    async function checkEmbeddingService() {
      try {
        setCheckingService(true);
        const response = await fetch(`${backend}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'test' })
        });
        setEmbeddingServiceAvailable(response.ok);
        console.log('Embedding service available');
      } catch (e) {
        console.log('Embedding service not available, will use text search');
        setEmbeddingServiceAvailable(false);
      } finally {
        setCheckingService(false);
      }
    }
    checkEmbeddingService();
  }, [backend]);

  useEffect(() => {
    if (!apiKey) {
      setError('Gemini API key not configured in .env');
    }
    if (!azureSearchEndpoint || !azureSearchKey) {
      setError('Azure Search credentials not configured in .env');
    }
  }, [apiKey, azureSearchEndpoint, azureSearchKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && botRef.current) {
        const rect = botRef.current.getBoundingClientRect();
        const newWidth = Math.max(320, Math.min(rect.right - e.clientX, 800));
        const newHeight = Math.max(400, Math.min(rect.bottom - e.clientY, window.innerHeight - 40));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, size]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const generateEmbedding = async (text: string): Promise<number[]> => {
    const response = await fetch(`${backend}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error('Failed to generate embedding');
    }

    const data = await response.json();
    return data.embedding;
  };

  const searchAzure = async (queryEmbedding: number[]): Promise<SearchResult[]> => {
    const response = await fetch(`${backend}/api/search/vector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryEmbedding })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Search failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const results: SearchResult[] = (data.value || []).map((doc: any) => ({
      id: doc.id,
      content: doc.content,
      source_file: doc.source_file,
      chunk_index: doc.chunk_index,
      upload_date: doc.upload_date,
      score: doc['@search.score'] || 0
    }));

    return results;
  };

  const searchAzureTextFallback = async (queryText: string): Promise<SearchResult[]> => {
    const response = await fetch(`${backend}/api/search/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryText })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Search failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const results: SearchResult[] = (data.value || []).map((doc: any) => ({
      id: doc.id,
      content: doc.content,
      source_file: doc.source_file,
      chunk_index: doc.chunk_index,
      upload_date: doc.upload_date,
      score: doc['@search.score'] || 0
    }));

    return results;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !apiKey) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text, timestamp: Date.now() };
    setMessages((s) => [...s, userMsg]);
    setMemory((m) => [...m, text]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      let searchResults: SearchResult[];
      
      if (embeddingServiceAvailable) {
        // Use vector search with embeddings from backend
        const queryEmbedding = await generateEmbedding(text);
        searchResults = await searchAzure(queryEmbedding);
      } else {
        // Fallback to text-based search
        searchResults = await searchAzureTextFallback(text);
      }

      // Call Gemini with context
      const reply = await callGemini(text, memory, searchResults);
      const assistantMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', text: reply, timestamp: Date.now() };
      setMessages((s) => [...s, assistantMsg]);
    } catch (e: any) {
      const errText = e.message || String(e);
      const errMsg: Message = { id: `e-${Date.now()}`, role: 'assistant', text: `Error: ${errText}`, timestamp: Date.now() };
      setMessages((s) => [...s, errMsg]);
      setError(errText);
    } finally {
      setLoading(false);
    }
  };

  const callGemini = async (text: string, mem: string[], searchResults: SearchResult[]): Promise<string> => {
    if (!genAI) throw new Error('Gemini API key not configured');

    const memoryContext = mem.slice(-5).join('\n');
    
    // Build context from search results
    const retrievedContext = searchResults.length > 0
      ? searchResults.map((r, i) => `[Document ${i + 1} - Source: ${r.source_file}, Chunk: ${r.chunk_index}]:\n${r.content}`).join('\n\n')
      : 'No relevant documents found in the knowledge base.';

    const systemPrompt = `You are an internal CPA agent assistant for GreenLeaf CPA & Associates with access to firm documents, cases, workflows, and policies. 

IMPORTANT INSTRUCTIONS:
- First, check if the retrieved context contains relevant information to answer the question.
- If the context is helpful, use it to provide a detailed, accurate answer.
- If the context doesn't contain the answer or is empty, clearly state "I couldn't find specific information about this in our knowledge base" and then provide a helpful answer based on your general CPA and tax knowledge.
- Always provide a useful answer - never just say you don't know without offering guidance.
- Format your responses with proper spacing, bullet points, and structure for readability.
- Use markdown formatting when appropriate (bold, lists, code blocks).`;
    console.log("context: ",retrievedContext);
    const fullPrompt = `Retrieved Context from Knowledge Base:
${retrievedContext}

Conversation History:
${memoryContext}

Current Question: ${text}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }]
        }
      ],
      systemInstruction: systemPrompt
    });

    const reply = response.response.text();
    return reply;
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) sendMessage();
  };

  return (
    <div
      ref={botRef}
      className="fixed-bot private-fixed-bot"
      style={{
        width: `${size.width}px`,
        height: `${size.height}px`
      }}
    >
      <div className="private-bot" aria-label="CPA agent chatbot with RAG" style={{ height: '100%' }}>
        <div className="bot-header" style={{ background: '#1a4d2e' }}>
          <div>
            <h3>🤖 Agent RAG Assistant</h3>
            <div className="bot-sub">
              {checkingService 
                ? 'Checking embedding service...' 
                : embeddingServiceAvailable 
                  ? '✅ Vector search enabled' 
                  : '⚠️ Text search mode'}
            </div>
          </div>
        </div>

        {error && <div className="bot-error">{error}</div>}

        <div className="bot-body">
          {messages.map((m) => (
            <div key={m.id} className={`bot-msg ${m.role}`}>
              <div className="msg-text" dangerouslySetInnerHTML={{ __html: formatMarkdown(m.text) }} />
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="bot-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about policies, cases, workflows..."
            disabled={loading || checkingService}
          />
          <button 
            className="btn btn-primary" 
            onClick={sendMessage} 
            disabled={loading || !apiKey || checkingService}
          >
            {loading ? 'Searching...' : 'Send'}
          </button>
        </div>

        <div className="bot-resize-handle" onMouseDown={startResize} title="Drag to resize" />
      </div>
    </div>
  );
};

export default PrivateBot;
