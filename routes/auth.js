const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Teacher Login
router.post('/teacher/login', async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password are required.' });
  }

  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM teachers WHERE name = ?', args: [name] });
  const teacher = result.rows[0];

  if (!teacher) {
    return res.status(401).json({ error: 'Invalid name or password.' });
  }

  const validPassword = bcrypt.compareSync(password, teacher.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid name or password.' });
  }

  const token = jwt.sign(
    { id: teacher.id, name: teacher.name, role: 'teacher' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, name: teacher.name, role: 'teacher' });
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM admin WHERE username = ?', args: [username] });
  const admin = result.rows[0];

  if (!admin) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const validPassword = bcrypt.compareSync(password, admin.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, username: admin.username, role: 'admin' });
});

// Change admin password
router.put('/admin/password', authenticateToken, requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM admin WHERE id = ?', args: [req.user.id] });
  const admin = result.rows[0];

  const validPassword = bcrypt.compareSync(currentPassword, admin.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  await db.execute({ sql: 'UPDATE admin SET password = ? WHERE id = ?', args: [hashedPassword, req.user.id] });

  res.json({ message: 'Password updated successfully.' });
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;
