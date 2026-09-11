// In local dev, Vite proxies '/api' → localhost:5000, so we use '' (empty base).
// In production (Vercel), VITE_API_BASE_URL points to the deployed Render backend.
const API_BASE =
  import.meta.env.VITE_API_BASE_URL && import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_API_BASE_URL
    : '';

export default API_BASE;
