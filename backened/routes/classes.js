const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// All class routes require auth
router.use(authMiddleware);

// ─── GET /api/classes ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const classes = db.prepare(
    'SELECT id, subject, num_students, num_days, created_at FROM classes WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json({ success: true, classes });
});

// ─── POST /api/classes ───────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { subject, num_students, num_days, syllabus_text } = req.body;

  if (!subject || !num_students || !num_days) {
    return res.status(400).json({ success: false, message: 'Subject, students, and days are required.' });
  }

  const result = db.prepare(
    'INSERT INTO classes (user_id, subject, num_students, num_days, syllabus_text) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, subject.trim(), parseInt(num_students), parseInt(num_days), syllabus_text || '');

  const newClass = db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, message: 'Class created!', class: newClass });
});

// ─── GET /api/classes/:id ────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
  res.json({ success: true, class: cls });
});

// ─── PUT /api/classes/:id ────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { subject, num_students, num_days } = req.body;
  const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  db.prepare('UPDATE classes SET subject = ?, num_students = ?, num_days = ? WHERE id = ?').run(
    subject, parseInt(num_students), parseInt(num_days), req.params.id
  );
  res.json({ success: true, message: 'Class updated.' });
});

// ─── DELETE /api/classes/:id ─────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const cls = db.prepare('SELECT id FROM classes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Class deleted.' });
});

module.exports = router;