const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

// Middleware to protect route
const authenticate = (req, res, next) => {
  let token;
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((res, c) => {
      const [key, val] = c.trim().split('=').map(decodeURIComponent);
      res[key] = val;
      return res;
    }, {});
    token = cookies.token;
  }
  
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Apply auth middleware to all contacts routes
router.use(authenticate);

// GET all contacts
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const contacts = await db.all('SELECT * FROM contacts ORDER BY id DESC');
    res.json(contacts);
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST to add new contacts (single or array)
router.post('/', async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails) {
      return res.status(400).json({ error: 'Emails are required' });
    }

    const emailList = Array.isArray(emails) ? emails : [emails];
    
    // Filter and trim valid looking emails
    // Validate with a proper email regex (RFC-5322 simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emailList
      .map(e => e.trim().toLowerCase())
      .filter(e => emailRegex.test(e));

    if (validEmails.length === 0) {
      return res.status(400).json({ error: 'No valid emails provided' });
    }

    const db = await getDb();
    
    let addedCount = 0;
    for (const email of validEmails) {
      try {
        const result = await db.run('INSERT OR IGNORE INTO contacts (email) VALUES (?)', email);
        if (result.changes > 0) {
          addedCount++;
        }
      } catch (err) {
        console.error('Insert error for email', email, err);
      }
    }

    res.json({ message: `Successfully added ${addedCount} new contacts (ignored duplicates)` });
  } catch (error) {
    console.error('Failed to add contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE a contact
router.delete('/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const db = await getDb();
    await db.run('DELETE FROM contacts WHERE email = ?', email);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Failed to delete contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
