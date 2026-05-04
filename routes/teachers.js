const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all teachers (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  const db = getDb();
  const result = await db.execute('SELECT id, name, created_at FROM teachers ORDER BY name');
  res.json(result.rows);
});

// Get all teacher names (for dropdown - any authenticated user)
router.get('/names', authenticateToken, async (req, res) => {
  const db = getDb();
  const result = await db.execute('SELECT id, name FROM teachers ORDER BY name');
  res.json(result.rows);
});

// Add teacher (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password are required.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  const db = getDb();

  const existing = await db.execute({ sql: 'SELECT id FROM teachers WHERE name = ?', args: [name.trim()] });
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'A teacher with this name already exists.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const result = await db.execute({
      sql: 'INSERT INTO teachers (name, password) VALUES (?, ?)',
      args: [name.trim(), hashedPassword]
    });

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      message: 'Teacher added successfully.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add teacher.' });
  }
});

// Update teacher (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, password } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const db = getDb();
  const existing = await db.execute({ sql: 'SELECT id FROM teachers WHERE id = ?', args: [req.params.id] });
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }

  const nameConflict = await db.execute({ sql: 'SELECT id FROM teachers WHERE name = ? AND id != ?', args: [name.trim(), req.params.id] });
  if (nameConflict.rows.length > 0) {
    return res.status(409).json({ error: 'A teacher with this name already exists.' });
  }

  if (password && password.length > 0) {
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.execute({ sql: 'UPDATE teachers SET name = ?, password = ? WHERE id = ?', args: [name.trim(), hashedPassword, req.params.id] });
  } else {
    await db.execute({ sql: 'UPDATE teachers SET name = ? WHERE id = ?', args: [name.trim(), req.params.id] });
  }

  res.json({ message: 'Teacher updated successfully.' });
});

// Delete teacher (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const db = getDb();
  const existing = await db.execute({ sql: 'SELECT id FROM teachers WHERE id = ?', args: [req.params.id] });
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }

  await db.execute({ sql: 'DELETE FROM teachers WHERE id = ?', args: [req.params.id] });
  res.json({ message: 'Teacher deleted successfully.' });
});

module.exports = router;
