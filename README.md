# Email Bulk Sender

A full-stack web app for sending bulk emails to a saved contact list, with admin-only access, Excel-based contact import, file attachments, and reliable delivery via Brevo SMTP.

## Features

- **Admin-only login** — single admin account (JWT-based auth), no public signup
- **Contacts management** — add emails manually or bulk-import via Excel (.xlsx) upload, with duplicate skipping and a remove option
- **Compose & send** — select recipients from saved contacts, write a subject and message body, and send to all selected recipients at once
- **File attachments** — attach up to 5 files (images, PDFs, Excel, Word docs, etc.) per email
- **Delivery tracking** — see a live success/failure count after each send
- **Reliable bulk delivery** — uses Brevo (Sendinblue) SMTP relay instead of personal Gmail SMTP, avoiding rate limits and spam flags on large sends

## Tech Stack

**Frontend:** React (Vite)
**Backend:** Node.js + Express
**Email delivery:** Brevo SMTP relay (via Nodemailer)
**Auth:** JWT (JSON Web Tokens)

## Getting Started

### Prerequisites
- Node.js installed
- A Brevo (Sendinblue) account with SMTP credentials
- Your IP address authorized in Brevo's dashboard (Settings → Security → Authorized IPs)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/giayush/email-bulk-sender.git
   cd email-bulk-sender
   ```

2. Install dependencies for both frontend and backend:
   ```
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. Create a `.env` file in the `backend` folder (use `.env.example` as a reference) and fill in:
   - `PORT`
   - `JWT_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD_HASH`
   - `BREVO_SMTP_LOGIN`
   - `BREVO_SMTP_KEY`
   - `BREVO_SENDER_EMAIL`

4. Start the backend:
   ```
   cd backend
   npm start
   ```

5. Start the frontend:
   ```
   cd frontend
   npm run dev
   ```

6. Open the app in your browser (usually `http://localhost:5173`) and log in with your admin credentials.

## Notes

- Only the single admin account configured via environment variables can log in — there is no self-registration.
- Recipient IP restrictions in Brevo must be updated if the backend is deployed to a new host or your local IP changes.
- Never commit your real `.env` file — only `.env.example` with placeholder values should be pushed to version control.

## License

This project is for internal/company use.
