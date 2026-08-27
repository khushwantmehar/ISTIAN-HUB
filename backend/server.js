require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { ensureDb, read, write, nextId } = require('./lib/db');
const { hashPassword } = require('./lib/auth');

const authRouter = require('./routes/auth');
const notesRouter = require('./routes/notes');
const timetableRouter = require('./routes/timetable');
const assignmentsRouter = require('./routes/assignments');
const dashboardRouter = require('./routes/dashboard');

ensureDb();
seedAdminIfConfigured();

const app = express();
const PORT = process.env.PORT || 4100;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Allow blob: URLs for images and scripts (needed for PDF/image preview in browser)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "img-src 'self' data: blob: https:; " +
    "media-src 'self' blob:; " +
    "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https:; " +
    "frame-src 'self' blob:;"
  );
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'istianhub-backend' }));

app.use('/api/auth', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/timetable', timetableRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/dashboard', dashboardRouter);

// Serve frontend static files from backend/public/
const path = require('path');
const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));

// Catch-all: serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Central error handler — also catches Multer errors (bad file type, too large)
// thrown by the upload middleware in the timetable/assignments routes.
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  if (err && /Unsupported file type/.test(err.message || '')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function seedAdminIfConfigured() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('No ADMIN_EMAIL/ADMIN_PASSWORD set in .env — skipping admin account seed. See .env.example.');
    return;
  }
  const db = read();
  const exists = db.users.some(u => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (exists) return;

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  db.users.push({
    id: nextId(db),
    name: ADMIN_NAME || 'Admin',
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: 'admin',
    createdAt: Date.now()
  });
  write(db);
  console.log(`Admin account ready: ${ADMIN_EMAIL}`);
}

app.listen(PORT, () => {
  console.log(`ISTIAN HUB backend running on http://localhost:${PORT}`);
});
