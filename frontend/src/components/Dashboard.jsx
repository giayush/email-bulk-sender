import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import API_BASE from '../api';

function Dashboard({ token }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  const [contacts, setContacts] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [attachments, setAttachments] = useState([]);
  
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  const fileInputRef = useRef(null);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/contacts`, {
        // Credentials included automatically
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmails(new Set(contacts.map(c => c.email)));
    } else {
      setSelectedEmails(new Set());
    }
  };

  const handleSelectOne = (email, isChecked) => {
    const newSelected = new Set(selectedEmails);
    if (isChecked) {
      newSelected.add(email);
    } else {
      newSelected.delete(email);
    }
    setSelectedEmails(newSelected);
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

        setStatus({ type: 'success', message: resData.message });
        
        // Fetch new contacts, then select them
        const fetchRes = await fetch(`${API_BASE}/api/contacts`, {
          // Credentials included automatically
        });
        if (fetchRes.ok) {
          const newData = await fetchRes.json();
          setContacts(newData);
          // Auto-select the newly found emails if they were added
          const newSelected = new Set(selectedEmails);
          emails.forEach(e => newSelected.add(e));
          setSelectedEmails(newSelected);
        }
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAttachmentSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    let newAttachments = [...attachments];
    let errorMessage = '';

    for (let file of selectedFiles) {
      if (newAttachments.length >= 5) {
        errorMessage = 'You can only attach up to 5 files.';
        break;
      }
      if (file.size > 10 * 1024 * 1024) {
        errorMessage = `File ${file.name} exceeds the 10MB limit.`;
        continue;
      }
      if (!newAttachments.some(a => a.name === file.name && a.size === file.size)) {
        newAttachments.push(file);
      }
    }

    setAttachments(newAttachments);
    if (errorMessage) {
      setStatus({ type: 'error', message: errorMessage });
    }
    e.target.value = '';
  };

  const removeAttachment = (indexToRemove) => {
    setAttachments(attachments.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setResults(null);
    
    const recipientList = Array.from(selectedEmails);

    if (recipientList.length === 0) {
      setStatus({ type: 'error', message: 'Please select at least one recipient.' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('recipients', JSON.stringify(recipientList));
    formData.append('subject', subject);
    formData.append('body', body);
    attachments.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      const response = await fetch(`${API_BASE}/api/email/send`, {
        method: 'POST',
        // Credentials included automatically
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails');
      }

      setStatus({ type: 'success', message: 'Emails sent successfully!' });
      setResults(data.results);
      
      setSubject('');
      setBody('');
      setSelectedEmails(new Set());
      setAttachments([]);
      
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel animate-fade-in">
      <h2 style={{ marginBottom: '1.5rem' }}>Compose Email</h2>
      
      {status.message && (
        <div className={status.type === 'error' ? 'error-message' : 'success-message'}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group recipients-input-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0 }}>Recipients</label>
            <div>
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
                style={{ margin: 0, padding: '0.25rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'var(--secondary-color)' }}
              >
                Upload Excel
              </button>
            </div>
          </div>
          
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '1rem'
          }}>
            {contacts.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, textAlign: 'center' }}>
                No contacts available. Add them in Contacts page or upload Excel here.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={contacts.length > 0 && selectedEmails.size === contacts.length}
                    onChange={handleSelectAll}
                  />
                  Select All ({contacts.length})
                </label>
                {contacts.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedEmails.has(c.email)}
                      onChange={(e) => handleSelectOne(c.email, e.target.checked)}
                    />
                    {c.email}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="recipients-help">
            {selectedEmails.size} recipient(s) selected.
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="subject">Subject</label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Important Update"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="body">Message Body</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email content here..."
            rows={8}
            required
          />
        </div>
        
        <div className="form-group">
          <label>📎 Attachments</label>
          <div style={{
            border: '2px dashed rgba(15, 118, 110, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            background: 'rgba(15, 118, 110, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: attachments.length > 0 ? '0.75rem' : 0 }}>
              <input
                type="file"
                multiple
                onChange={handleAttachmentSelect}
                style={{ display: 'none' }}
                id="attachment-input"
              />
              <button
                type="button"
                onClick={() => document.getElementById('attachment-input').click()}
                disabled={loading || attachments.length >= 5}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', backgroundColor: 'var(--accent-color)', margin: 0, width: 'auto' }}
              >
                Choose Files
              </button>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {attachments.length === 0
                  ? 'Up to 5 files · Max 10MB each · Any file type'
                  : `${attachments.length}/5 file(s) attached`}
              </span>
            </div>
            {attachments.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {attachments.map((file, idx) => (
                  <li key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '78%' }}>
                      📄 {file.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      style={{ margin: 0, padding: '0.2rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'var(--error-color)', width: 'auto' }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? <span className="loader"></span> : 'Send Emails'}
        </button>
      </form>

      {results && (
        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
          <h3>Results ({results.total} total)</h3>
          <p style={{ color: 'var(--success-color)' }}>Successful: {results.successful.length}</p>
          {results.failed.length > 0 && (
            <p style={{ color: 'var(--error-color)' }}>Failed: {results.failed.length}</p>
          )}
          
          {results.failed.length > 0 && (
            <ul style={{ marginTop: '1rem', color: 'var(--error-color)', fontSize: '0.9rem' }}>
              {results.failed.map((fail, idx) => (
                <li key={idx}>{fail.email}: {fail.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
