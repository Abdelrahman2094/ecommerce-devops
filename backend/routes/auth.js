/**
 * routes/auth.js
 * Public auth endpoints: registration and login.
 * No authentication required on these routes.
 */

const express = require('express');
const { query }                        = require('../db/pool');
const { hashPassword, verifyPassword, signToken } = require('../services/authService');
const { encrypt }                      = require('../services/cryptoService');

const router = express.Router();

/**
 * POST /api/auth/register
 * Body: { email, password, fullName, phone?, address? }
 *
 * Security:
 *  - Email uniqueness enforced at DB level (UNIQUE index)
 *  - Password hashed with bcrypt before any DB write
 *  - PII (phone, address) encrypted with AES-256-GCM
 *  - Never echo back the password or hash in any response
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, phone, address } = req.body;

    // Basic input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Hash password — never store plaintext
    const passwordHash = await hashPassword(password);

    // Encrypt optional PII fields
    const phoneEnc   = phone   ? encrypt(phone)   : null;
    const addressEnc = address ? encrypt(address)  : null;

    // Parameterized INSERT — SQL injection is structurally impossible
    await query(
      `INSERT INTO users (email, password, full_name, phone_enc, address_enc)
       VALUES (?, ?, ?, ?, ?)`,
      [email.toLowerCase().trim(), passwordHash, fullName || null, phoneEnc, addressEnc]
    );

    return res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    // Duplicate email — DB unique constraint violation (error code 1062)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error('[register]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token } — JWT valid for 1 hour
 *
 * Security:
 *  - Generic error message regardless of whether email exists (prevents user enumeration)
 *  - bcrypt.compare is constant-time (prevents timing attacks)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Fetch user — parameterized query
    const users = await query(
      'SELECT id, email, password, role FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    // Use the same generic message for "not found" and "wrong password"
    // This prevents attackers from knowing whether an email is registered
    const INVALID_MSG = 'Invalid email or password';

    if (!users.length) {
      // Still run bcrypt to prevent timing side-channel (user enumeration via response time)
      await verifyPassword(password, '$2b$12$invalidhashpadding000000000000000000000000000000000000000');
      return res.status(401).json({ error: INVALID_MSG });
    }

    const user = users[0];
    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: INVALID_MSG });
    }

    const token = signToken({ id: user.id, role: user.role });
    return res.status(200).json({ token });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
