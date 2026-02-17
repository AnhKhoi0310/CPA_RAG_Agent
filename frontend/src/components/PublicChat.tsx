import React from 'react';
import PublicBot from './PublicBot';

const PublicChat: React.FC = () => {
  const backend = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

  const handleLogin = () => {
    // Ensure backend URL has protocol
    const backendUrl = backend.startsWith('http') ? backend : `https://${backend}`;
    window.location.href = `${backendUrl}/auth/login`;
  };

  const goToAgent = () => {
    window.history.pushState({}, '', '/agent');
    const ev = new PopStateEvent('popstate');
    dispatchEvent(ev);
  };

  return (
    <div className="landing-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="company-name">GreenLeaf CPA & Associates</h1>
          <p className="company-tagline">Your Trusted Partner in Financial Excellence Since 1998</p>
          <div className="cta-buttons">
            <button className="btn btn-primary" onClick={handleLogin}>Agent Sign In</button>
            <button className="btn btn-secondary" onClick={goToAgent}>Agent Portal</button>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-number">2,400+</div>
          <div className="stat-label">Clients Served</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">98%</div>
          <div className="stat-label">Client Satisfaction</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">25+</div>
          <div className="stat-label">Years Experience</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">$2.8B+</div>
          <div className="stat-label">Assets Managed</div>
        </div>
      </div>

      <div className="services-section">
        <h2>Our Services</h2>
        <div className="service-grid">
          <div className="service-card">
            <div className="service-icon">📊</div>
            <h3>Tax Planning & Preparation</h3>
            <p>Strategic tax solutions for individuals and businesses. Minimize liability while ensuring full compliance.</p>
          </div>
          <div className="service-card">
            <div className="service-icon">🔍</div>
            <h3>Audit & Assurance</h3>
            <p>Comprehensive audit services that provide confidence to stakeholders and meet regulatory requirements.</p>
          </div>
          <div className="service-card">
            <div className="service-icon">💼</div>
            <h3>Business Advisory</h3>
            <p>Strategic guidance on growth, operations, and financial management to help your business thrive.</p>
          </div>
          <div className="service-card">
            <div className="service-icon">📈</div>
            <h3>Financial Planning</h3>
            <p>Personalized wealth management and retirement planning to secure your financial future.</p>
          </div>
        </div>
      </div>

      <div className="experts-section">
        <h2>Meet Our Expert Team</h2>
        <div className="experts-grid">
          <div className="expert-card">
            <div className="expert-avatar">👨‍💼</div>
            <h4>Michael Patterson, CPA</h4>
            <p className="expert-title">Managing Partner</p>
            <p className="expert-info">28 years experience • Tax & Advisory Specialist</p>
          </div>
          <div className="expert-card">
            <div className="expert-avatar">👩‍💼</div>
            <h4>Sarah Chen, CPA, CFE</h4>
            <p className="expert-title">Audit Partner</p>
            <p className="expert-info">22 years experience • Forensic Accounting Expert</p>
          </div>
          <div className="expert-card">
            <div className="expert-avatar">👨‍💼</div>
            <h4>David Rodriguez, CPA, MST</h4>
            <p className="expert-title">Tax Partner</p>
            <p className="expert-info">19 years experience • International Tax Specialist</p>
          </div>
          <div className="expert-card">
            <div className="expert-avatar">👩‍💼</div>
            <h4>Emily Thompson, CPA, CFP</h4>
            <p className="expert-title">Advisory Partner</p>
            <p className="expert-info">15 years experience • Financial Planning Expert</p>
          </div>
        </div>
      </div>

      <div className="why-choose-section">
        <h2>Why Choose GreenLeaf CPA?</h2>
        <div className="benefits-grid">
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <span>Personalized attention from senior partners</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <span>Proactive tax planning throughout the year</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <span>Industry-specific expertise across 20+ sectors</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <span>Advanced technology and secure client portals</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <span>Same-day response guarantee for urgent matters</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">✓</span>
            <span>Transparent pricing with no hidden fees</span>
          </div>
        </div>
      </div>

      <PublicBot />
    </div>
  );
};

export default PublicChat;
