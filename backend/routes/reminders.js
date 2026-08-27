const express = require('express');
const { read, write, nextId } = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const router = express.Router();

// Reminders are personal — each student manages their own.

// GET /api/reminders
router.get('/', requireAuth, (req, res) => {
  const db = read();
  const reminders = db.reminders
    .filter(r => r.userId === req.user.id)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  res.json({ reminders });
});

// POST /api/reminders  { title, datetime, note }
router.post('/', requireAuth, (req, res) => {
  const { title, datetime, note } = req.body || {};
  if (!title || !datetime) return res.status(400).json({ error: 'title and datetime are required' });

  const db = read();
  const reminder = { id: nextId(db), userId: req.user.id, title, datetime, note: note || '', createdAt: Date.now() };
  db.reminders.push(reminder);
  write(db);
  res.status(201).json({ reminder });
});

// DELETE /api/reminders/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = read();
  const reminder = db.reminders.find(r => r.id === req.params.id);
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
  if (reminder.userId !== req.user.id) return res.status(403).json({ error: 'Not your reminder' });

  db.reminders = db.reminders.filter(r => r.id !== req.params.id);
  write(db);
  res.json({ ok: true });
});

module.exports = router;
