const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

function getOwnedClass(classId, userId) {
  return db.prepare('SELECT * FROM classes WHERE id = ? AND user_id = ?').get(classId, userId);
}

// ─── GET /api/planner/:classId ───────────────────────────────────────────────
router.get('/:classId', (req, res) => {
  const cls = getOwnedClass(req.params.classId, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  const items = db.prepare(
    'SELECT * FROM planner_items WHERE class_id = ? ORDER BY day_no ASC'
  ).all(req.params.classId);

  res.json({ success: true, items, syllabus_text: cls.syllabus_text, num_days: cls.num_days });
});

// ─── POST /api/planner/:classId/save ─────────────────────────────────────────
// Body: { items: [{ day_no, topic, is_done }, ...] }
router.post('/:classId/save', (req, res) => {
  const cls = getOwnedClass(req.params.classId, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'items array is required.' });
  }

  // Clear old items and insert new ones transactionally
  const deleteOld = db.prepare('DELETE FROM planner_items WHERE class_id = ?');
  const insertItem = db.prepare(
    'INSERT INTO planner_items (class_id, day_no, topic, is_done) VALUES (?, ?, ?, ?)'
  );

  const saveAll = db.transaction(() => {
    deleteOld.run(req.params.classId);
    items.forEach((item, i) => {
      insertItem.run(req.params.classId, item.day_no || i + 1, item.topic, item.is_done ? 1 : 0);
    });
  });

  saveAll();
  res.json({ success: true, message: 'Planner saved!' });
});

// ─── PATCH /api/planner/:classId/toggle/:dayNo ───────────────────────────────
// Toggle is_done for a single day
router.patch('/:classId/toggle/:dayNo', (req, res) => {
  const cls = getOwnedClass(req.params.classId, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  const item = db.prepare(
    'SELECT * FROM planner_items WHERE class_id = ? AND day_no = ?'
  ).get(req.params.classId, req.params.dayNo);

  if (!item) return res.status(404).json({ success: false, message: 'Planner item not found.' });

  const newDone = item.is_done ? 0 : 1;
  db.prepare('UPDATE planner_items SET is_done = ? WHERE id = ?').run(newDone, item.id);
  res.json({ success: true, is_done: newDone });
});

// ─── PATCH /api/planner/:classId/update/:dayNo ───────────────────────────────
// Update topic text for a day
router.patch('/:classId/update/:dayNo', (req, res) => {
  const cls = getOwnedClass(req.params.classId, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  const { topic } = req.body;
  db.prepare('UPDATE planner_items SET topic = ? WHERE class_id = ? AND day_no = ?')
    .run(topic, req.params.classId, req.params.dayNo);
  res.json({ success: true, message: 'Topic updated.' });
});

// ─── DELETE /api/planner/:classId ────────────────────────────────────────────
// Clear all planner items for a class (for regeneration)
router.delete('/:classId', (req, res) => {
  const cls = getOwnedClass(req.params.classId, req.user.id);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  db.prepare('DELETE FROM planner_items WHERE class_id = ?').run(req.params.classId);
  res.json({ success: true, message: 'Planner cleared.' });
});

module.exports = router;