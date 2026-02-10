import React, { useEffect, useState } from 'react';
import './App.css';
import PublicChat from './components/PublicChat';
import PrivateChat from './components/PrivateChat';

function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setRoute(to);
  };

  const handleLogin = () => {
    // Redirect to backend OAuth 2.0 / OIDC start endpoint (dev backend)
    window.location.href = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000') + '/auth/login';
  };

  // Simple router: support '/', '/agent', '/public'
  if (route === '/agent') {
    return <PrivateChat />;
  }

  if (route === '/public') {
    return <PublicChat />;
  }

  // Landing page is the public chatbot so render the PublicChat component
  return <PublicChat />;
}

export default App;
