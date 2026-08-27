const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { read, write } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { UPLOAD_DIR, fileMetaFrom, deleteStoredFile } = require('../lib/upload');

const router = express.Router();

// Image-only multer for timetable
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const safeExt = path.extname(file.originalname).slice(0, 10);
      cb(null, crypto.randomBytes(16).toString('hex') + safeExt);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
    if (allowed.has(file.mimetype)) return cb(null, true);
    cb(new Error('Timetable must be an image file (PNG, JPG, WEBP, GIF).'));
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

// GET /api/timetable — shared, visible to any logged-in user
router.get('/', requireAuth, (req, res) => {
  const db = read();
  const file = db.timetableFile
    ? { originalName: db.timetableFile.originalName, size: db.timetableFile.size, mimetype: db.timetableFile.mimetype, uploadedAt: db.timetableFile.uploadedAt }
    : null;
  res.json({ timetable: [], file });
});

// POST /api/timetable/file — admin only, uploads/replaces the timetable image
router.post('/file', requireAuth, requireAdmin, imageUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  const db = read();
  if (db.timetableFile) deleteStoredFile(db.timetableFile.storedName);
  db.timetableFile = fileMetaFrom(req.file);
  write(db);
  res.status(201).json({
    file: { originalName: db.timetableFile.originalName, size: db.timetableFile.size, mimetype: db.timetableFile.mimetype }
  });
});

// GET /api/timetable/file — force-download the timetable image (any logged-in user)
router.get('/file', requireAuth, (req, res) => {
  const db = read();
  if (!db.timetableFile) return res.status(404).json({ error: 'No timetable image uploaded yet' });
  const filePath = path.join(UPLOAD_DIR, db.timetableFile.storedName);
  res.download(filePath, db.timetableFile.originalName);
});

// GET /api/timetable/image — serve image inline (for <img> display, no forced download)
router.get('/image', requireAuth, (req, res) => {
  const db = read();
  if (!db.timetableFile) return res.status(404).json({ error: 'No timetable image uploaded yet' });
  const filePath = path.join(UPLOAD_DIR, db.timetableFile.storedName);
  res.set('Content-Type', db.timetableFile.mimetype);
  res.set('Content-Disposition', 'inline');
  res.sendFile(filePath);
});

// DELETE /api/timetable/file — admin only
router.delete('/file', requireAuth, requireAdmin, (req, res) => {
  const db = read();
  if (db.timetableFile) {
    deleteStoredFile(db.timetableFile.storedName);
    db.timetableFile = null;
    write(db);
  }
  res.json({ ok: true });
});

module.exports = router;
