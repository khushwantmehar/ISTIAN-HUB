const express = require('express');
const path = require('path');
const { read, write, nextId } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { upload, UPLOAD_DIR, fileMetaFrom, deleteStoredFile } = require('../lib/upload');

const router = express.Router();

// GET /api/notes — shared, visible to any logged-in user
router.get('/', requireAuth, (req, res) => {
  const db = read();
  const { subject } = req.query;
  let notes = db.notes.sort((a, b) => b.createdAt - a.createdAt);
  if (subject) notes = notes.filter(n => n.subject.toLowerCase() === subject.toLowerCase());
  res.json({ notes: notes.map(n => ({
    id: n.id,
    subject: n.subject,
    title: n.title,
    content: n.content,
    createdAt: n.createdAt,
    hasFile: Boolean(n.file),
    file: n.file ? { originalName: n.file.originalName, size: n.file.size } : null
  })) });
});

// POST /api/notes — admin only, multipart: subject, title, content (opt), file (opt)
router.post('/', requireAuth, requireAdmin, upload.single('file'), (req, res) => {
  const { subject, title, content } = req.body || {};
  if (!subject || !title) return res.status(400).json({ error: 'subject and title are required' });

  const db = read();
  const note = {
    id: nextId(db),
    userId: req.user.id,
    subject,
    title,
    content: content || '',
    createdAt: Date.now(),
    file: req.file ? fileMetaFrom(req.file) : null
  };
  db.notes.push(note);
  write(db);
  res.status(201).json({ note });
});

// GET /api/notes/:id/file — download attached file (any logged-in user)
router.get('/:id/file', requireAuth, (req, res) => {
  const db = read();
  const note = db.notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (!note.file) return res.status(404).json({ error: 'No file attached to this note' });
  const filePath = path.join(UPLOAD_DIR, note.file.storedName);
  res.download(filePath, note.file.originalName);
});

// GET /api/notes/:id/preview — serve file inline for in-browser viewing
router.get('/:id/preview', requireAuth, (req, res) => {
  const db = read();
  const note = db.notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (!note.file) return res.status(404).json({ error: 'No file attached to this note' });
  const filePath = path.join(UPLOAD_DIR, note.file.storedName);
  res.set('Content-Type', note.file.mimetype);
  res.set('Content-Disposition', `inline; filename="${note.file.originalName}"`);
  res.sendFile(filePath);
});

// DELETE /api/notes/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = read();
  const note = db.notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (note.file) deleteStoredFile(note.file.storedName);
  db.notes = db.notes.filter(n => n.id !== req.params.id);
  write(db);
  res.json({ ok: true });
});

module.exports = router;
