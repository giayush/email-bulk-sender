const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  if (!adminEmail || !adminPasswordHash) {
    console.error('[Auth] ADMIN_EMAIL or ADMIN_PASSWORD_HASH not set in .env');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!jwtSecret) {
    console.error('[Auth] JWT_SECRET not set in .env — refusing to issue tokens');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ── WHITELIST CHECK ───────────────────────────────────────────────────────
  // ALLOWED_EMAILS in .env is a comma-separated list of authorised email addresses.
  // Example: ALLOWED_EMAILS=alice@company.com,bob@company.com
  const rawAllowedEmails = process.env.ALLOWED_EMAILS || '';
  const allowedEmails = rawAllowedEmails
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length > 0 && !allowedEmails.includes(email.trim().toLowerCase())) {
    return res.status(403).json({
      error: 'Access denied. This email is not authorized to access this system. Please contact your administrator.'
    });
  }
  // ── END WHITELIST CHECK ───────────────────────────────────────────────────

  // Case-insensitive, whitespace-trimmed email comparison against admin account
  if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    const isMatch = await bcrypt.compare(password.trim(), adminPasswordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Credentials valid — issue token as httpOnly cookie
    const token = jwt.sign(
      { email: adminEmail },
      jwtSecret,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});
