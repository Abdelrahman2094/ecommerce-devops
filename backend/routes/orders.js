/**
 * routes/orders.js
 * Creates an order from the user's cart items.
 * Requires authentication — user ID always comes from the JWT, never the request body.
 */

const express = require('express');
const { withTransaction } = require('../db/pool');
const { authenticate }    = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/orders
 * Body: { items: [{ productId, quantity, unitPrice }], total }
 * Returns: { orderId }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.sub; // Always from JWT, never from body
    const { items, total } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }
    if (!total || Number(total) <= 0) {
      return res.status(400).json({ error: 'Invalid order total' });
    }

    const orderId = await withTransaction(async (conn) => {
      // Insert order
      const [orderResult] = await conn.execute(
        "INSERT INTO orders (user_id, total, status) VALUES (?, ?, 'pending')",
        [userId, total]
      );
      const newOrderId = orderResult.insertId;

      // Insert order items
      for (const item of items) {
        await conn.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [newOrderId, item.productId, item.quantity, item.unitPrice]
        );
      }
      return newOrderId;
    });

    return res.status(201).json({ orderId });
  } catch (err) {
    console.error('[orders POST /]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
