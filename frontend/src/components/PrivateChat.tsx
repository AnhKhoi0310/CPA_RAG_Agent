import React, { useEffect, useState } from 'react';
import PrivateBot from './PrivateBot';

type User = any;

const PrivateChat: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Normalize backend URL - remove trailing slash
  const backend = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${backend}/auth/me`, { credentials: 'include' });
        if (res.status === 401) {
          setUser(null);
          setError('Not authenticated. Please sign in via the Sign in button on the landing page.');
        } else if (!res.ok) {
          const txt = await res.text();
          setError(`Error: ${res.status} ${txt}`);
        } else {
          const data = await res.json();
          setUser(data.user || data);
        }
      } catch (e: any) {
        setError(e.message || 'Fetch error');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [backend]);

  const handleLogout = async () => {
    try {
      const res = await fetch(`${backend}/auth/logout`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const txt = await res.text();
        alert(`Logout failed: ${res.status} ${txt}`);
      }
    } catch (e: any) {
      console.error('Logout error', e);
      alert(`Logout failed: ${e.message || e}`);
    } finally {
      window.location.href = '/';
    }
  };

  const handleBack = () => {
    window.history.pushState({}, '', '/');
    const pop = new PopStateEvent('popstate');
    dispatchEvent(pop);
  };

  // Extract user display info
  const userName = user?.name || user?.email || user?.sub || 'Agent';
  const userAvatar = user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1a4d2e&color=fff`;

  return (
    <div className="landing-page private-page">
      <div className="agent-topbar">
        <div className="user-info">
          <img src={userAvatar} alt="User avatar" className="user-avatar" />
          <div>
            <h3>{userName}</h3>
            <div className="user-sub">Agent Portal • RAG-Powered Assistant</div>
          </div>
        </div>
        <div className="private-controls">
          <button className="btn btn-outline" onClick={handleBack}>← Home</button>
          <button className="btn btn-outline" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      {loading && <p className="loading-text">Loading agent dashboard...</p>}
      
      {error && (
        <div className="alert">
          <p>{error}</p>
          <p>If you'd like to sign in, click <strong>Agent Sign In</strong> on the landing page.</p>
        </div>
      )}

      {user && (
        <>
          <div className="dashboard-section">
            <h2>Agent Dashboard</h2>
            <div className="stats-section">
              <div className="stat-card">
                <div className="stat-number">147</div>
                <div className="stat-label">Active Cases</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">23</div>
                <div className="stat-label">Pending Reviews</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">892</div>
                <div className="stat-label">Documents Indexed</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">99.2%</div>
                <div className="stat-label">Query Accuracy</div>
              </div>
            </div>
          </div>

          <div className="tools-section">
            <h2>Internal Resources</h2>
            <div className="tool-grid">
              <div className="tool-card">
                <div className="tool-icon">🔍</div>
                <h4>RAG Assistant</h4>
                <p>Query our knowledge base with AI-powered semantic search. Access policies, procedures, and case histories instantly.</p>
              </div>
              <div className="tool-card">
                <div className="tool-icon">📚</div>
                <h4>Document Library</h4>
                <p>Azure AI Search index: <strong>{process.env.REACT_APP_AZURE_SEARCH_INDEX_NAME || 'cpa-documents'}</strong></p>
              </div>
              <div className="tool-card">
                <div className="tool-icon">🎯</div>
                <h4>Case Management</h4>
                <p>Track client cases, deadlines, and deliverables with integrated workflow tools.</p>
              </div>
              <div className="tool-card">
                <div className="tool-icon">📊</div>
                <h4>Analytics & Reporting</h4>
                <p>Generate insights from historical data and client trends with advanced analytics.</p>
              </div>
            </div>
          </div>

          <div className="quick-links-section">
            <h2>Quick Access</h2>
            <div className="quick-links">
              <button className="quick-link">📋 Internal Policies</button>
              <button className="quick-link">⚖️ Compliance Guidelines</button>
              <button className="quick-link">📞 Client Contact Database</button>
              <button className="quick-link">📅 Tax Calendar & Deadlines</button>
              <button className="quick-link">🔒 Security Protocols</button>
              <button className="quick-link">💼 Training Resources</button>
            </div>
          </div>
        </>
      )}

      <PrivateBot />
    </div>
  );
};

export default PrivateChat;
