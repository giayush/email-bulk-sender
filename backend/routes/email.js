const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB per file
});

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

router.post('/send', authenticate, upload.array('attachments', 5), async (req, res) => {
  let recipients;
  try {
    recipients = typeof req.body.recipients === 'string'
      ? JSON.parse(req.body.recipients)
      : req.body.recipients;
  } catch (err) {
    return res.status(400).json({ error: 'Invalid recipients format' });
  }

  const { subject, body } = req.body;
  const files = req.files || [];

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Recipients array is required' });
  }
  if (!subject || !body || typeof subject !== 'string' || typeof body !== 'string') {
    return res.status(400).json({ error: 'Subject and body are required and must be text' });
  }

  // Set up Nodemailer transporter with connection pooling for Brevo SMTP.
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    pool: true,         // enable connection pool
    maxConnections: 5,  // up to 5 concurrent SMTP connections
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });

  // Attachments are prepared once here and reused for every recipient
  const mailAttachments = files.map(file => ({
    filename: file.originalname,
    content: file.buffer,
    contentType: file.mimetype
  }));

  const results = {
    total: recipients.length,
    successful: [],
    failed: [],
  };

  console.log(`[Email] Starting parallel send to ${recipients.length} recipient(s)...`);
  const startTime = Date.now();

  // Send all emails concurrently instead of one-by-one with an artificial delay
  await Promise.all(
    recipients.map(async (email) => {
      try {
        console.log(`[SMTP Debug] Sending email:
  To: ${email}
  CC: (none)
  BCC: (none)`);
        await transporter.sendMail({
          from: `"Pryzm_creations" <${process.env.BREVO_SENDER_EMAIL}>`,
          to: email,
          subject: subject,
          text: body, // plain text fallback
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    ${body.replace(/\n/g, '<br>')}
  </div>
</body>
</html>`,
          attachments: mailAttachments
        });
        results.successful.push(email);
      } catch (error) {
        console.error(`[Email] Failed to send to ${email}:`, error.message);
        results.failed.push({ email, error: error.message });
      }
    })
  );

  transporter.close(); // release pooled connections when done

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Email] Done. ${results.successful.length} sent, ${results.failed.length} failed — took ${elapsed}s`);

  res.json({ message: 'Sending complete', results });
});

module.exports = router;
