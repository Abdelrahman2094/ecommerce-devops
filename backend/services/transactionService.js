const crypto      = require('crypto');
const { encrypt, decrypt } = require('./cryptoService');
const { withTransaction }  = require('../db/pool');
require('dotenv').config();

const HMAC_SECRET = process.env.HMAC_SECRET;
if (!HMAC_SECRET || HMAC_SECRET.length < 32) {
  throw new Error('HMAC_SECRET must be set and at least 32 characters long');
}

function computeHmac({ orderId, userId, amount, createdAt }) {
  const canonical = `orderId=${orderId}&userId=${userId}&amount=${amount}&createdAt=${createdAt}`;
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(canonical)
    .digest('hex');
}

function verifyTransactionIntegrity(tx) {
  const expected = computeHmac({
    orderId:   tx.order_id,
    userId:    tx.user_id,
    amount:    tx.amount,
    createdAt: tx.created_at instanceof Date
      ? tx.created_at.toISOString()
      : tx.created_at,
  });
  return crypto.timingSafeEqual(
    Buffer.from(expected,          'hex'),
    Buffer.from(tx.hmac_signature, 'hex')
  );
}

async function createTransaction({ orderId, userId, amount, cardLast4, items }) {
  return withTransaction(async (conn) => {
    // Lock rows to prevent race conditions on concurrent purchases
    for (const item of items) {
      const [rows] = await conn.execute(
        'SELECT stock FROM products WHERE id = ? FOR UPDATE',
        [item.productId]
      );
      if (!rows.length || rows[0].stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
    }

    for (const item of items) {
      await conn.execute(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.productId]
      );
    }

    await conn.execute(
      "UPDATE orders SET status = 'paid' WHERE id = ? AND user_id = ?",
      [orderId, userId]
    );

    const cardLast4Enc = encrypt(String(cardLast4));
    const createdAt    = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const hmac         = computeHmac({ orderId, userId, amount, createdAt });

    const [result] = await conn.execute(
      `INSERT INTO transactions
         (order_id, user_id, amount, card_last4_enc, hmac_signature, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'success', ?)`,
      [orderId, userId, amount, cardLast4Enc, hmac, createdAt]
    );

    return { transactionId: result.insertId, hmac };
  });
}

async function getAndVerifyTransaction(transactionId, queryFn) {
  const rows = await queryFn(
    'SELECT * FROM transactions WHERE id = ?',
    [transactionId]
  );
  if (!rows.length) throw new Error('Transaction not found');

  const tx          = rows[0];
  const integrityOk = verifyTransactionIntegrity(tx);
  const cardLast4   = decrypt(tx.card_last4_enc);

  return { transaction: tx, integrityOk, cardLast4 };
}

module.exports = { createTransaction, getAndVerifyTransaction, verifyTransactionIntegrity };
