import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Contacts from './components/Contacts';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('isAuthenticated') === 'true');
  const [view, setView] = useState('compose'); // 'compose' or 'contacts'

  useEffect(() => {
    if (token) {
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      localStorage.removeItem('isAuthenticated');
    }
  }, [token]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setToken(false);
  };

  return (
    <div className="app-container">
      {!token ? (
        <Login setToken={setToken} />
      ) : (
        <div className="main-layout animate-fade-in">
          <header className="app-header">
            <div className="nav-brand">Pryzm_creations</div>
            <nav className="nav-links">
              <button 
                className={`nav-btn ${view === 'compose' ? 'active' : ''}`}
                onClick={() => setView('compose')}
              >
                Compose
              </button>
              <button 
                className={`nav-btn ${view === 'contacts' ? 'active' : ''}`}
                onClick={() => setView('contacts')}
              >
                Contacts
              </button>
            </nav>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </header>
          
          <main className="main-content">
            {view === 'compose' ? (
              <Dashboard token={token} setToken={setToken} />
            ) : (
              <Contacts token={token} />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
