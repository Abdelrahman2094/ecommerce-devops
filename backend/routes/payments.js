/**
 * routes/payments.js
 * Payment processing endpoint.
 * Requires authentication — a customer can only pay for their own orders.
 */

const express = require('express');
const { query }                        = require('../db/pool');
const { createTransaction, getAndVerifyTransaction } = require('../services/transactionService');
const { authenticate, authorize }      = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/payments
 * Body: { orderId, cardLast4 }
 *
 * Security flow:
 *  1. Verify JWT (authenticate middleware)
 *  2. Verify the order belongs to the requesting user (IDOR prevention)
 *  3. Validate order status is 'pending' (prevent double-payment)
 *  4. Run atomic transaction: stock check → stock deduct → order update → transaction insert + HMAC
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { orderId, cardLast4 } = req.body;
    const userId = req.user.sub; // From JWT — never trust client-supplied userId

    if (!orderId || !cardLast4) {
      return res.status(400).json({ error: 'orderId and cardLast4 are required' });
    }
    if (!/^\d{4}$/.test(String(cardLast4))) {
      return res.status(400).json({ error: 'cardLast4 must be exactly 4 digits' });
    }

    // Fetch order and verify ownership (IDOR prevention: user can only pay their own order)
    const orders = await query(
      "SELECT id, user_id, total, status FROM orders WHERE id = ? AND user_id = ?",
      [orderId, userId]
    );
    if (!orders.length) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];

    if (order.status !== 'pending') {
      return res.status(409).json({ error: `Order is already ${order.status}` });
    }

    // Fetch items for the order (for stock deduction)
    const items = await query(
      'SELECT product_id AS productId, quantity FROM order_items WHERE order_id = ?',
      [orderId]
    );
    if (!items.length) {
      return res.status(400).json({ error: 'Order has no items' });
    }

    // Atomic transaction: stock check + deduct + order update + insert + HMAC
    const { transactionId, hmac } = await createTransaction({
      orderId,
      userId,
      amount:   order.total,
      cardLast4,
      items,
    });

    return res.status(201).json({
      message:       'Payment successful',
      transactionId,
      hmacSignature: hmac,  // Return HMAC so client can independently verify if needed
    });
  } catch (err) {
    if (err.message.startsWith('Insufficient stock')) {
      return res.status(422).json({ error: err.message });
    }
    console.error('[payments POST /]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/payments/:transactionId/verify
 * Admin-only: verify the HMAC integrity of a stored transaction.
 * Returns whether the record has been tampered with since insertion.
 */
router.get('/:transactionId/verify', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { transaction, integrityOk, cardLast4 } = await getAndVerifyTransaction(
      req.params.transactionId,
      query
    );
    return res.status(200).json({
      transactionId: transaction.id,
      orderId:       transaction.order_id,
      amount:        transaction.amount,
      status:        transaction.status,
      cardLast4,               // Decrypted for admin view
      integrityOk,             // true = record matches HMAC; false = tampered
      createdAt:     transaction.created_at,
    });
  } catch (err) {
    if (err.message === 'Transaction not found') {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    console.error('[payments GET /:id/verify]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
