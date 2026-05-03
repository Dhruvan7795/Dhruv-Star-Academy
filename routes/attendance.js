const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authenticateToken, requireTeacher } = require('../middleware/auth');

// Send SMS via Android SMS Gateway (capcom6)
async function sendSMS(to, message) {
  const apiUrl = process.env.SMS_GATEWAY_URL;
  const username = process.env.SMS_GATEWAY_USERNAME;
  const password = process.env.SMS_GATEWAY_PASSWORD;

  if (!apiUrl || !username || username === 'your_username') {
    console.log(`[SMS DEMO] To: ${to} | Message: ${message}`);
    return { success: true, demo: true };
  }

  // Ensure number is in proper format (with country code)
  let phoneNumber = to.replace(/\s/g, '');
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+91' + phoneNumber.replace(/^0/, '');
  }

  try {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify({
        message: message,
        phoneNumbers: [phoneNumber]
      })
    });

    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (response.ok) {
      console.log(`[SMS SENT] To: ${phoneNumber} | Status: OK`);
      return { success: true };
    } else {
      console.error(`[SMS ERROR] To: ${phoneNumber} | Error: ${JSON.stringify(data)}`);
      return { success: false, error: data.message || 'Failed to send' };
    }
  } catch (err) {
    console.error(`[SMS ERROR] To: ${phoneNumber} | Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// Submit attendance
router.post('/', authenticateToken, requireTeacher, async (req, res) => {
  const { attendance, class: studentClass, board } = req.body;
  const teacherId = req.user.id;
  const academyName = process.env.ACADEMY_NAME || 'Dhruv Star Academy';

  if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
    return res.status(400).json({ error: 'Attendance data is required.' });
  }

  if (!studentClass) {
    return res.status(400).json({ error: 'Class is required.' });
  }

  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // Check if attendance already submitted for this class/board/teacher/date
  const existing = db.prepare(
    'SELECT id FROM attendance WHERE teacher_id = ? AND class = ? AND board = ? AND date = ? LIMIT 1'
  ).get(teacherId, studentClass, board || 'N/A', today);

  if (existing) {
    return res.status(409).json({ error: 'Attendance already submitted for this class today.' });
  }

  const insertStmt = db.prepare(
    'INSERT INTO attendance (student_id, teacher_id, class, board, status, date) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((records) => {
    for (const record of records) {
      insertStmt.run(
        record.student_id,
        teacherId,
        studentClass,
        board || 'N/A',
        record.status,
        today
      );
    }
  });

  try {
    insertMany(attendance);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save attendance.' });
  }

  // Send SMS messages to parents
  const smsResults = [];

  for (const record of attendance) {
    const student = db.prepare('SELECT name, contact_number FROM students WHERE id = ?').get(record.student_id);
    if (!student) continue;

    let message;
    if (record.status === 'Present') {
      message = `Dear Parent, your child ${student.name} is PRESENT for tuition today at ${academyName}. Thank you!`;
    } else if (record.status === 'Late') {
      message = `Dear Parent, your child ${student.name} arrived LATE for tuition today at ${academyName}. Thank you!`;
    } else {
      message = `Dear Parent, your child ${student.name} is ABSENT from tuition today at ${academyName}. Please ensure regular attendance. Thank you!`;
    }

    const result = await sendSMS(student.contact_number, message);
    smsResults.push({
      student: student.name,
      status: record.status,
      sms: result.success ? 'sent' : 'failed',
      demo: result.demo || false
    });
  }

  res.json({
    message: 'Attendance submitted successfully!',
    date: today,
    results: smsResults
  });
});

// Get attendance history (for admin)
router.get('/history', authenticateToken, (req, res) => {
  const { date, class: studentClass, board } = req.query;
  const db = getDb();

  let query = `
    SELECT a.*, s.name as student_name, s.sl_no, t.name as teacher_name
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN teachers t ON a.teacher_id = t.id
  `;
  const params = [];
  const conditions = [];

  if (date) {
    conditions.push('a.date = ?');
    params.push(date);
  }
  if (studentClass) {
    conditions.push('a.class = ?');
    params.push(studentClass);
  }
  if (board) {
    conditions.push('a.board = ?');
    params.push(board);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY a.date DESC, s.sl_no ASC';

  const records = db.prepare(query).all(...params);
  res.json(records);
});

module.exports = router;
