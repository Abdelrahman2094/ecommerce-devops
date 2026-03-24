/**
 * routes/products.js
 * Product CRUD — public read, admin-only write.
 * Demonstrates RBAC: customers can browse; only admins can create/update/delete.
 */

const express = require('express');
const { query }                    = require('../db/pool');
const { authenticate, authorize }  = require('../middleware/authMiddleware');

const router = express.Router();

/** GET /api/products — public, no auth required */
router.get('/', async (req, res) => {
  try {
    const products = await query(
      'SELECT id, name, description, price, stock FROM products ORDER BY id DESC'
    );
    return res.status(200).json(products);
  } catch (err) {
    console.error('[products GET /]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /api/products/:id — public */
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, name, description, price, stock FROM products WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('[products GET /:id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /api/products — admin only */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'name and price are required' });
    }
    if (Number(price) < 0 || Number(stock) < 0) {
      return res.status(400).json({ error: 'price and stock must be non-negative' });
    }

    const result = await query(
      'INSERT INTO products (name, description, price, stock, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, price, stock || 0, req.user.sub]
    );
    return res.status(201).json({ id: result.insertId, message: 'Product created' });
  } catch (err) {
    console.error('[products POST /]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /api/products/:id — admin only */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const result = await query(
      `UPDATE products SET
         name        = COALESCE(?, name),
         description = COALESCE(?, description),
         price       = COALESCE(?, price),
         stock       = COALESCE(?, stock)
       WHERE id = ?`,
      [name ?? null, description ?? null, price ?? null, stock ?? null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    return res.status(200).json({ message: 'Product updated' });
  } catch (err) {
    console.error('[products PUT /:id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /api/products/:id — admin only */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    return res.status(200).json({ message: 'Product deleted' });
  } catch (err) {
    console.error('[products DELETE /:id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
