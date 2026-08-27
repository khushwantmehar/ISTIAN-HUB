const express = require('express');
const path = require('path');
const { read, write, nextId } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { upload, UPLOAD_DIR, fileMetaFrom, deleteStoredFile } = require('../lib/upload');

const router = express.Router();

function toClientShape(a, userId) {
  const { completions, ...rest } = a;
  return {
    ...rest,
    hasFile: Boolean(a.file),
    file: a.file ? { originalName: a.file.originalName, size: a.file.size, mimetype: a.file.mimetype } : null,
    myStatus: (completions && completions[userId]) || 'pending'
  };
}

// GET /api/assignments — visible to any logged-in user (student or admin)
router.get('/', requireAuth, (req, res) => {
  const db = read();
  const assignments = db.assignments
    .slice()
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .map(a => toClientShape(a, req.user.id));
  res.json({ assignments });
});

// POST /api/assignments — admin only, multipart/form-data with optional "file" field
router.post('/', requireAuth, requireAdmin, upload.single('file'), (req, res) => {
  const { title, subject, dueDate, notes } = req.body || {};
  if (!title || !subject || !dueDate) {
    return res.status(400).json({ error: 'title, subject and dueDate are required' });
  }
  const db = read();
  const assignment = {
    id: nextId(db), title, subject, dueDate, notes: notes || '',
    file: req.file ? fileMetaFrom(req.file) : null,
    completions: {}, // { [userId]: 'pending' | 'done' }
    createdBy: req.user.id,
    createdAt: Date.now()
  };
  db.assignments.push(assignment);
  write(db);
  res.status(201).json({ assignment: toClientShape(assignment, req.user.id) });
});

// GET /api/assignments/:id/file — download the attached file (any logged-in user)
router.get('/:id/file', requireAuth, (req, res) => {
  const db = read();
  const a = db.assignments.find(x => x.id === req.params.id);
  if (!a || !a.file) return res.status(404).json({ error: 'No file attached to this assignment' });
  const filePath = path.join(UPLOAD_DIR, a.file.storedName);
  res.download(filePath, a.file.originalName);
});

// GET /api/assignments/:id/preview — serve file inline for in-browser viewing
router.get('/:id/preview', requireAuth, (req, res) => {
  const db = read();
  const a = db.assignments.find(x => x.id === req.params.id);
  if (!a || !a.file) return res.status(404).json({ error: 'No file attached to this assignment' });
  const filePath = path.join(UPLOAD_DIR, a.file.storedName);
  res.set('Content-Type', a.file.mimetype);
  res.set('Content-Disposition', `inline; filename="${a.file.originalName}"`);
  res.sendFile(filePath);
});

// PATCH /api/assignments/:id — student marks their own completion status
router.patch('/:id', requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'done'].includes(status)) {
    return res.status(400).json({ error: "status must be 'pending' or 'done'" });
  }
  const db = read();
  const a = db.assignments.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Assignment not found' });

  if (!a.completions) a.completions = {};
  a.completions[req.user.id] = status;
  write(db);
  res.json({ assignment: toClientShape(a, req.user.id) });
});

// DELETE /api/assignments/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = read();
  const a = db.assignments.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Assignment not found' });
  if (a.file) deleteStoredFile(a.file.storedName);
  db.assignments = db.assignments.filter(x => x.id !== req.params.id);
  write(db);
  res.json({ ok: true });
});

module.exports = router;
