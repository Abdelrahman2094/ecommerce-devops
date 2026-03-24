/**
 * tests/security.test.js
 * Functional security tests — validates each security mechanism independently
 * without requiring a live database connection.
 *
 * Run with: npx jest tests/security.test.js
 */

// Must set env vars BEFORE requiring modules that read them at load time
process.env.JWT_SECRET     = 'y9F$kL2!zQw8@Xc7!Vb3Nn6*Rt5Yp0Gh';
process.env.ENCRYPTION_KEY = '0011223344556677889900112233445566778899001122334455667788990011';
process.env.HMAC_SECRET    = '3f8a1c9d7e5b4a2f6c8e0d1b9a7f3e2c';

const { hashPassword, verifyPassword, signToken, verifyToken } = require('../services/authService');
const { encrypt, decrypt } = require('../services/cryptoService');
const { verifyTransactionIntegrity } = require('../services/transactionService');
const crypto = require('crypto');

// ── 1. Auth Service Tests ────────────────────────────────────────────────────
describe('Auth Service — bcrypt + JWT', () => {

  test('hashPassword produces a bcrypt hash (not plaintext)', async () => {
    const hash = await hashPassword('MyPassword123');
    expect(hash).toMatch(/^\$2b\$12\$/);       // bcrypt format with cost 12
    expect(hash).not.toContain('MyPassword123'); // never stored in hash output
  });

  test('verifyPassword returns true for correct password', async () => {
    const hash = await hashPassword('CorrectPassword');
    expect(await verifyPassword('CorrectPassword', hash)).toBe(true);
  });

  test('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('CorrectPassword');
    expect(await verifyPassword('WrongPassword', hash)).toBe(false);
  });

  test('two hashes of the same password differ (different salts)', async () => {
    const hash1 = await hashPassword('SamePassword');
    const hash2 = await hashPassword('SamePassword');
    expect(hash1).not.toBe(hash2); // bcrypt uses random salt per hash
  });

  test('signToken produces a three-part JWT string', () => {
    const token = signToken({ id: 42, role: 'customer' });
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  test('verifyToken decodes correct claims', () => {
    const token = signToken({ id: 99, role: 'admin' });
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(99);
    expect(decoded.role).toBe('admin');
  });

  test('verifyToken throws on tampered token', () => {
    const token = signToken({ id: 1, role: 'customer' });
    // Flip one character in the signature segment
    const parts = token.split('.');
    parts[2] = parts[2].slice(0, -1) + (parts[2].endsWith('x') ? 'y' : 'x');
    const tampered = parts.join('.');
    expect(() => verifyToken(tampered)).toThrow();
  });

  test('verifyToken throws on role-escalation attempt in payload', () => {
    // An attacker manually constructs a token claiming role=admin
    const fakePayload = Buffer.from(JSON.stringify({ sub: 1, role: 'admin' })).toString('base64url');
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const fakeToken = `${header}.${fakePayload}.invalidsignature`;
    expect(() => verifyToken(fakeToken)).toThrow();
  });
});

// ── 2. Crypto Service Tests ──────────────────────────────────────────────────
describe('Crypto Service — AES-256-GCM', () => {

  test('encrypt produces "iv:tag:ciphertext" format', () => {
    const result = encrypt('sensitive data');
    const parts  = result.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(24);  // 12 bytes IV → 24 hex chars
    expect(parts[1]).toHaveLength(32);  // 16 bytes auth tag → 32 hex chars
  });

  test('decrypt recovers original plaintext', () => {
    const original  = 'John Doe, 123 Main St, Cairo';
    const encrypted = encrypt(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  test('two encryptions of the same value produce different ciphertexts (random IV)', () => {
    const enc1 = encrypt('hello');
    const enc2 = encrypt('hello');
    expect(enc1).not.toBe(enc2); // different IVs each time
  });

  test('decrypt throws when ciphertext is tampered', () => {
    const encrypted = encrypt('original value');
    // Flip the last hex character of the ciphertext segment
    const parts = encrypted.split(':');
    const last = parts[2];
    parts[2] = last.slice(0, -1) + (last.endsWith('f') ? '0' : 'f');
    expect(() => decrypt(parts.join(':'))).toThrow(); // GCM auth tag mismatch
  });

  test('decrypt throws on malformed input', () => {
    expect(() => decrypt('not:valid')).toThrow();
  });
});

// ── 3. Transaction Integrity (HMAC) Tests ───────────────────────────────────
describe('Transaction Service — HMAC integrity', () => {

  // Simulate a transaction row as stored in the DB
  function makeTx(overrides = {}) {
    const HMAC_SECRET = process.env.HMAC_SECRET || 'test_hmac_secret_that_is_long_enough_32ch';
    const fields = {
      order_id:   1,
      user_id:    42,
      amount:     '99.99',
      created_at: '2025-01-01T00:00:00.000Z',
      ...overrides,
    };
    const canonical = `orderId=${fields.order_id}&userId=${fields.user_id}&amount=${fields.amount}&createdAt=${fields.created_at}`;
    const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(canonical).digest('hex');
    return { ...fields, hmac_signature: hmac };
  }

  test('valid transaction passes integrity check', () => {
    const tx = makeTx();
    expect(verifyTransactionIntegrity(tx)).toBe(true);
  });

  test('tampered amount fails integrity check', () => {
    const tx = makeTx();
    tx.amount = '0.01'; // attacker changes the amount
    expect(verifyTransactionIntegrity(tx)).toBe(false);
  });

  test('tampered user_id fails integrity check', () => {
    const tx = makeTx();
    tx.user_id = 999; // attacker changes the user
    expect(verifyTransactionIntegrity(tx)).toBe(false);
  });

  test('tampered hmac_signature itself fails integrity check', () => {
    const tx = makeTx();
    tx.hmac_signature = 'a'.repeat(64); // random fake signature
    expect(verifyTransactionIntegrity(tx)).toBe(false);
  });
});
