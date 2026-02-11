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
