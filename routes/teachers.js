const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all teachers (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const teachers = db.prepare('SELECT id, name, created_at FROM teachers ORDER BY name').all();
  res.json(teachers);
});

// Get all teacher names (for dropdown - any authenticated user)
router.get('/names', authenticateToken, (req, res) => {
  const db = getDb();
  const teachers = db.prepare('SELECT id, name FROM teachers ORDER BY name').all();
  res.json(teachers);
});

// Add teacher (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password are required.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  const db = getDb();

  // Check if teacher name already exists
  const existing = db.prepare('SELECT id FROM teachers WHERE name = ?').get(name.trim());
  if (existing) {
    return res.status(409).json({ error: 'A teacher with this name already exists.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(
      'INSERT INTO teachers (name, password) VALUES (?, ?)'
    ).run(name.trim(), hashedPassword);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Teacher added successfully.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add teacher.' });
  }
});

// Update teacher (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, password } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM teachers WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }

  // Check if new name conflicts with another teacher
  const nameConflict = db.prepare('SELECT id FROM teachers WHERE name = ? AND id != ?').get(name.trim(), req.params.id);
  if (nameConflict) {
    return res.status(409).json({ error: 'A teacher with this name already exists.' });
  }

  if (password && password.length > 0) {
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE teachers SET name = ?, password = ? WHERE id = ?').run(name.trim(), hashedPassword, req.params.id);
  } else {
    db.prepare('UPDATE teachers SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  }

  res.json({ message: 'Teacher updated successfully.' });
});

// Delete teacher (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM teachers WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }

  db.prepare('DELETE FROM teachers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Teacher deleted successfully.' });
});

module.exports = router;
