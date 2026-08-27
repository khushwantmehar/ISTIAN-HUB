const express = require('express');
const { read, write, nextId } = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const router = express.Router();

// Attendance is personal — each student tracks their own subjects.

function withPercent(rec) {
  const pct = rec.total > 0 ? Math.round((rec.attended / rec.total) * 1000) / 10 : 0;
  return { ...rec, percentage: pct, safe: pct >= 75 };
}

// GET /api/attendance
router.get('/', requireAuth, (req, res) => {
  const db = read();
  const mine = db.attendance.filter(a => a.userId === req.user.id);
  res.json({ attendance: mine.map(withPercent) });
});

// POST /api/attendance  { subject }  — registers a new subject to track, starts at 0/0
router.post('/', requireAuth, (req, res) => {
  const { subject } = req.body || {};
  if (!subject) return res.status(400).json({ error: 'subject is required' });

  const db = read();
  if (db.attendance.some(a => a.userId === req.user.id && a.subject.toLowerCase() === subject.toLowerCase())) {
    return res.status(409).json({ error: 'Subject is already being tracked' });
  }
  const rec = { id: nextId(db), userId: req.user.id, subject, total: 0, attended: 0 };
  db.attendance.push(rec);
  write(db);
  res.status(201).json({ attendance: withPercent(rec) });
});

// POST /api/attendance/:subject/mark  { present: true|false }
router.post('/:subject/mark', requireAuth, (req, res) => {
  const { present } = req.body || {};
  if (typeof present !== 'boolean') return res.status(400).json({ error: 'present must be true or false' });

  const db = read();
  const rec = db.attendance.find(a => a.userId === req.user.id && a.subject.toLowerCase() === req.params.subject.toLowerCase());
  if (!rec) return res.status(404).json({ error: 'Subject not found' });

  rec.total += 1;
  if (present) rec.attended += 1;
  write(db);
  res.json({ attendance: withPercent(rec) });
});

// DELETE /api/attendance/:subject
router.delete('/:subject', requireAuth, (req, res) => {
  const db = read();
  const before = db.attendance.length;
  db.attendance = db.attendance.filter(a => !(a.userId === req.user.id && a.subject.toLowerCase() === req.params.subject.toLowerCase()));
  if (db.attendance.length === before) return res.status(404).json({ error: 'Subject not found' });
  write(db);
  res.json({ ok: true });
});

module.exports = router;
