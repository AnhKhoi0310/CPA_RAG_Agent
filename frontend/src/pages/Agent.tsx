import React, { useEffect, useState } from 'react';

type User = any;

const Agent: React.FC = () => {
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
      // always navigate back to landing so UI isn't stuck
      window.location.href = '/';
    }
  };

  const handleBack = () => {
    window.history.pushState({}, '', '/');
    const pop = new PopStateEvent('popstate');
    dispatchEvent(pop);
  };

  return (
    <div className="agent-container">
      <div className="agent-header">
        <button className="btn btn-outline" onClick={handleBack}>← Back</button>
        <h2>Agent Portal</h2>
      </div>

      <div className="agent-body">
        {loading && <p>Loading user info...</p>}
        {error && (
          <div className="alert">
            <p>{error}</p>
            <p>
              If you'd like to sign in, click <strong>Sign in (Agent)</strong> on the landing page to start the OAuth flow.
            </p>
          </div>
        )}

        {user && (
          <div className="user-card">
            <h3>User information</h3>
            <div className="user-json">
              <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleLogout}>Sign out</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Agent;
