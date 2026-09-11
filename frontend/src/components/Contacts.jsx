import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import API_BASE from '../api';

function Contacts({ token }) {
  const [contacts, setContacts] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef(null);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/contacts`, {
        // Credentials are included automatically for same-origin via vite proxy
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (err) {
      console.error('Failed to fetch contacts', err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [token]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emails: newEmail.trim() })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add contact');
      
      showMessage(data.message);
      setNewEmail('');
      fetchContacts();
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = async (email) => {
    if (!window.confirm(`Are you sure you want to remove ${email}?`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/contacts/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete contact');
      }
      
      fetchContacts();
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Flatten array and find things that look like emails
        const emails = [];
        data.forEach(row => {
          row.forEach(cell => {
            if (typeof cell === 'string' && cell.includes('@') && cell.includes('.')) {
              emails.push(cell.trim().toLowerCase());
            }
          });
        });

        if (emails.length === 0) {
          throw new Error('No valid emails found in the uploaded file');
        }

        const response = await fetch(`${API_BASE}/api/contacts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ emails })
        });

        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Failed to add contacts');

        showMessage(resData.message);
        fetchContacts();
      } catch (err) {
        showMessage(err.message, 'error');
      } finally {
        setLoading(false);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ marginTop: '1rem' }}>
      <h2>Contacts Management</h2>
      
      {message.text && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
          {message.text}
        </div>
      )}

      <div className="contacts-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <form onSubmit={handleAddEmail} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email address"
            required
            style={{ flex: 1, margin: 0, padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.95rem' }}
          />
          <button type="submit" disabled={loading} style={{ margin: 0, whiteSpace: 'nowrap' }}>Add Email</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>or bulk import:</span>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current.click()}
            disabled={loading}
            style={{ margin: 0, backgroundColor: 'var(--accent-color)', width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
          >
            📎 Upload Excel File
          </button>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>(.xlsx, .xls, .csv)</span>
        </div>
      </div>

      <div className="contacts-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '0.75rem' }}>Email</th>
              <th style={{ padding: '0.75rem', width: '100px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan="2" style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  No contacts found. Add some above.
                </td>
              </tr>
            ) : (
              contacts.map(contact => (
                <tr key={contact.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem' }}>{contact.email}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button 
                      onClick={() => handleRemoveEmail(contact.email)}
                      style={{ 
                        margin: 0, 
                        padding: '0.25rem 0.5rem', 
                        backgroundColor: 'var(--error-color)',
                        fontSize: '0.8rem'
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Contacts;
