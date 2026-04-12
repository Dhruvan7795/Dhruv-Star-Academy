const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authenticateToken, requireAdmin, requireTeacher } = require('../middleware/auth');

// Get students (filtered by class and board)
router.get('/', authenticateToken, requireTeacher, (req, res) => {
  const { class: studentClass, board } = req.query;
  const db = getDb();

  let query = 'SELECT * FROM students';
  const params = [];
  const conditions = [];

  if (studentClass) {
    if (studentClass === '1-7') {
      conditions.push('CAST(class AS INTEGER) BETWEEN 1 AND 7');
    } else {
      conditions.push('class = ?');
      params.push(studentClass);
    }
  }
  if (board) {
    conditions.push('board = ?');
    params.push(board);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY sl_no ASC';

  const students = db.prepare(query).all(...params);
  res.json(students);
});

// Get single student
router.get('/:id', authenticateToken, requireTeacher, (req, res) => {
  const db = getDb();
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);

  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  res.json(student);
});

// Add student (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { sl_no, name, contact_number, class: studentClass, board } = req.body;

  if (!sl_no || !name || !contact_number || !studentClass) {
    return res.status(400).json({ error: 'Sl.No, name, contact number, and class are required.' });
  }

  // Validate contact number (Indian format)
  const cleanNumber = contact_number.replace(/\s/g, '');
  if (!/^\+?[0-9]{10,13}$/.test(cleanNumber)) {
    return res.status(400).json({ error: 'Invalid contact number format.' });
  }

  // Validate class
  const validClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  if (!validClasses.includes(String(studentClass))) {
    return res.status(400).json({ error: 'Invalid class. Must be 1-10.' });
  }

  // Board is N/A for classes 1-7
  let finalBoard = 'N/A';
  if (parseInt(studentClass) >= 8) {
    const validBoards = ['State', 'CBSE', 'ICSE'];
    if (!board || !validBoards.includes(board)) {
      return res.status(400).json({ error: 'Board is required for classes 8-10 (State, CBSE, or ICSE).' });
    }
    finalBoard = board;
  }

  const db = getDb();

  try {
    const result = db.prepare(
      'INSERT INTO students (sl_no, name, contact_number, class, board) VALUES (?, ?, ?, ?, ?)'
    ).run(sl_no, name.trim(), cleanNumber, String(studentClass), finalBoard);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Student added successfully.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add student.' });
  }
});

// Update student (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { sl_no, name, contact_number, class: studentClass, board } = req.body;

  if (!sl_no || !name || !contact_number || !studentClass) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const cleanNumber = contact_number.replace(/\s/g, '');
  if (!/^\+?[0-9]{10,13}$/.test(cleanNumber)) {
    return res.status(400).json({ error: 'Invalid contact number format.' });
  }

  let finalBoard = 'N/A';
  if (parseInt(studentClass) >= 8) {
    const validBoards = ['State', 'CBSE', 'ICSE'];
    if (!board || !validBoards.includes(board)) {
      return res.status(400).json({ error: 'Board is required for classes 8-10.' });
    }
    finalBoard = board;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  db.prepare(
    'UPDATE students SET sl_no = ?, name = ?, contact_number = ?, class = ?, board = ? WHERE id = ?'
  ).run(sl_no, name.trim(), cleanNumber, String(studentClass), finalBoard, req.params.id);

  res.json({ message: 'Student updated successfully.' });
});

// Delete student (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ message: 'Student deleted successfully.' });
});

module.exports = router;
