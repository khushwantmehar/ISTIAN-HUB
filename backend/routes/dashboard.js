const express = require('express');
const { read } = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const router = express.Router();

// GET /api/dashboard/summary — returns latest uploads (timetable + notes + assignments with files)
router.get('/summary', requireAuth, (req, res) => {
  const db = read();
  const uploads = [];

  if (db.timetableFile) {
    uploads.push({
      type: 'timetable',
      subject: 'Timetable',
      title: db.timetableFile.originalName,
      size: db.timetableFile.size,
      uploadedAt: db.timetableFile.uploadedAt || 0,
      downloadPath: '/timetable/file',
      filename: db.timetableFile.originalName
    });
  }

  for (const note of db.notes) {
    if (note.file) {
      uploads.push({
        type: 'note',
        id: note.id,
        subject: note.subject,
        title: note.title,
        size: note.file.size,
        uploadedAt: note.file.uploadedAt || note.createdAt || 0,
        downloadPath: `/notes/${note.id}/file`,
        filename: note.file.originalName
      });
    }
  }

  for (const asg of db.assignments) {
    if (asg.file) {
      uploads.push({
        type: 'assignment',
        id: asg.id,
        subject: asg.subject,
        title: asg.title,
        size: asg.file.size,
        uploadedAt: asg.file.uploadedAt || asg.createdAt || 0,
        downloadPath: `/assignments/${asg.id}/file`,
        filename: asg.file.originalName
      });
    }
  }

  uploads.sort((a, b) => b.uploadedAt - a.uploadedAt);
  res.json({ latestUploads: uploads.slice(0, 8) });
});

module.exports = router;
