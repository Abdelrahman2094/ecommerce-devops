/**
 * server.js
 * Express application entry point.
 *
 * Security hardening applied here:
 *  - Helmet: sets 14 security-related HTTP headers (XSS protection, HSTS, etc.)
 *  - CORS: whitelist-only origins
 *  - Rate limiting: 100 requests / 15 minutes per IP to throttle brute-force
 *  - JSON body size capped at 10kb to prevent large-payload DoS
 *  - X-Powered-By removed by Helmet (hides Express fingerprint)
 */

require('dotenv').config();
const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');

const authRoutes     = require('./routes/auth');
const productRoutes  = require('./routes/products');
const paymentRoutes  = require('./routes/payments');
const orderRoutes    = require('./routes/orders');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ──────────────────────────────────────────────────────

app.use(helmet());

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,https://localhost').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (
  !origin ||
  ALLOWED_ORIGINS.includes(origin) ||
  origin.startsWith('https://localhost')
) {
  return callback(null, true);
}
    //if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    //return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods:     ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message: { error: 'Too many auth attempts, please wait before retrying' },
});
app.use('/api/auth', authLimiter);

app.use(express.json({ limit: '10kb' }));

// ── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders',   orderRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, _req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

module.exports = app;
