const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH  = 12;
const TAG_LENGTH = 16;

const KEY_HEX = process.env.ENCRYPTION_KEY;
if (!KEY_HEX || KEY_HEX.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
}
const KEY = Buffer.from(KEY_HEX, 'hex');

// Format stored in DB: hex(iv):hex(authTag):hex(ciphertext)
function encrypt(plaintext) {
  const iv     = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(stored) {
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');

  const [ivHex, tagHex, cipherHex] = parts;
  const iv         = Buffer.from(ivHex,     'hex');
  const authTag    = Buffer.from(tagHex,    'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };
