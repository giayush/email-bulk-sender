require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./database');

const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const contactsRoutes = require('./routes/contacts');

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow the Vite dev server and, in production, the domain set in ALLOWED_ORIGIN
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173', // vite preview
  process.env.ALLOWED_ORIGIN,       // set this to your real domain when deploying
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-server requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Login: max 10 attempts per 15 minutes per IP (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Email send: max 5 sends per 60 seconds per IP (prevents accidental spam / double-click)
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many send requests. Please wait a moment before trying again.' },
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/email/send', sendLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/contacts', contactsRoutes);

const PORT = process.env.PORT || 5000;
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database', err);
});
