const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ─── Helper: verify class ownership ─────────────────────────────────────────
function getOwnedClass(classId, userId) {
  return db.prepare('SELECT * FROM classes WHERE id = ? AND user_id = ?').get(classId, userId);
}

// ─── GET /api/attendance/:classId ────────────────────────────────────────────
// Returns all student attendance summaries for a class
router.get('/:classId', (req, res) => {
  const cls = getOwnedClass(req.params.classId, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  const totalDays = db.prepare(
    'SELECT COUNT(*) as count FROM attendance_sessions WHERE class_id = ?'
  ).get(req.params.classId).count;

  // Build per-student summary
  const students = [];
  for (let roll = 1; roll <= cls.num_students; roll++) {
    const presentCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM attendance_records ar
      JOIN attendance_sessions s ON ar.session_id = s.id
      WHERE ar.class_id = ? AND ar.roll_no = ? AND ar.is_present = 1
    `).get(req.params.classId, roll).count;

    students.push({
      roll_no: roll,
      total_present: presentCount,
      total_days: totalDays,
      percentage: totalDays > 0 ? parseFloat(((presentCount / totalDays) * 100).toFixed(1)) : 0
    });
  }

  res.json({ success: true, class_name: cls.subject, total_days: totalDays, students });
});

// ─── POST /api/attendance/:classId/submit ────────────────────────────────────
// Body: { present_rolls: [1, 3, 5, ...], date: "2024-04-17" (optional) }
router.post('/:classId/submit', (req, res) => {
  const cls = getOwnedClass(req.params.classId, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  const presentRolls = req.body.present_rolls || [];
  const sessionDate = req.body.date || new Date().toISOString().split('T')[0];

  // Create a new session
  const session = db.prepare(
    'INSERT INTO attendance_sessions (class_id, session_date) VALUES (?, ?)'
  ).run(req.params.classId, sessionDate);

  const sessionId = session.lastInsertRowid;

  // Insert records for all students
  const insertRecord = db.prepare(
    'INSERT INTO attendance_records (session_id, class_id, roll_no, is_present) VALUES (?, ?, ?, ?)'
  );

  const insertAll = db.transaction(() => {
    for (let roll = 1; roll <= cls.num_students; roll++) {
      const isPresent = presentRolls.includes(roll) ? 1 : 0;
      insertRecord.run(sessionId, req.params.classId, roll, isPresent);
    }
  });

  insertAll();

  const totalDays = db.prepare(
    'SELECT COUNT(*) as count FROM attendance_sessions WHERE class_id = ?'
  ).get(req.params.classId).count;

  res.json({ success: true, message: 'Attendance submitted!', session_id: sessionId, total_days: totalDays });
});

// ─── GET /api/attendance/:classId/sessions ───────────────────────────────────
// Returns all sessions (for history view)
router.get('/:classId/sessions', (req, res) => {
  const cls = getOwnedClass(req.params.classId, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  const sessions = db.prepare(
    'SELECT * FROM attendance_sessions WHERE class_id = ? ORDER BY session_date DESC'
  ).all(req.params.classId);

  res.json({ success: true, sessions });
});

// ─── DELETE /api/attendance/:classId/sessions/:sessionId ─────────────────────
// Undo a submitted session
router.delete('/:classId/sessions/:sessionId', (req, res) => {
  const cls = getOwnedClass(req.params.classId, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  db.prepare('DELETE FROM attendance_sessions WHERE id = ? AND class_id = ?').run(req.params.sessionId, req.params.classId);
  res.json({ success: true, message: 'Session deleted.' });
});

module.exports = router;