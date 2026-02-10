import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

type Message = { id: string; role: 'user' | 'assistant'; text: string; timestamp: number };

const PublicBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'assistant', text: 'Welcome to GreenLeaf CPA. Ask me about our services, tax requirements, or how we can help your business.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [memory, setMemory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const botRef = useRef<HTMLDivElement | null>(null);

  // Fixed position with resize capability
  const [size, setSize] = useState({ width: 450, height: 650 });
  const [isResizing, setIsResizing] = useState(false);

  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
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

  useEffect(() => {
    if (!apiKey) {
      setError('Gemini API key not configured in .env');
    }
  }, [apiKey]);

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
      const reply = await callGemini(text, memory);
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

  const callGemini = async (text: string, mem: string[]): Promise<string> => {
    if (!genAI) throw new Error('Gemini API key not configured');

    const memoryContext = mem.slice(-5).join('\n');
    const systemPrompt = `You are a helpful assistant for GreenLeaf CPA & Associates. You answer general tax, audit, and advisory questions for businesses and individuals. Be professional, concise, and helpful. Our firm has been serving clients since 1998 with expertise in tax planning, audit services, business advisory, and financial planning.\n\nFormat your responses with proper spacing, bullet points, and structure for readability. Use markdown formatting when appropriate (bold, lists, numbered steps).`;
    const fullPrompt = `Context from conversation history:\n${memoryContext}\n\nCurrent question: ${text}`;

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
      className="fixed-bot public-fixed-bot"
      style={{
        width: `${size.width}px`,
        height: `${size.height}px`
      }}
    >
      <div className="public-bot" aria-label="CPA chatbot" style={{ height: '100%' }}>
        <div className="bot-header">
          <div>
            <h3>💬 Ask GreenLeaf CPA</h3>
            <div className="bot-sub">General assistance for tax & business questions</div>
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
            placeholder="Ask about our services..."
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !apiKey}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>

        <div className="bot-resize-handle" onMouseDown={startResize} title="Drag to resize" />
      </div>
    </div>
  );
};

export default PublicBot;
