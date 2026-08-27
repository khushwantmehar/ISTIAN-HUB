// Lightweight file-backed JSON datastore.
// Swap for a real database (Postgres/MySQL) if this ever needs to scale
// beyond a single class/school running it themselves.

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.STORAGE_PATH
  ? path.join(process.env.STORAGE_PATH, 'db.json')
  : path.join(__dirname, '..', 'data', 'db.json');

function emptyDb() {
  return {
    users: [],           // [{ id, name, email, passwordHash, role: 'admin'|'student', createdAt }]
    notes: [],            // personal, scoped by userId
    timetable: [],          // shared, admin-managed structured slots: [{ id, day, startTime, endTime, subject, room }]
    timetableFile: null,     // shared, admin-uploaded master timetable file: { originalName, storedName, mimetype, size, uploadedAt }
    assignments: [],          // shared, admin-created, each may have an attached file + per-student completion map
    attendance: [],            // personal, scoped by userId: [{ id, userId, subject, total, attended }]
    reminders: [],               // personal, scoped by userId
    nextId: 1
  };
}

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) write(emptyDb());
}

function read() {
  ensureDb();
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    // backfill any fields an older db.json on disk might be missing
    return Object.assign(emptyDb(), data);
  } catch {
    const fresh = emptyDb();
    write(fresh);
    return fresh;
  }
}

function write(data) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(db) {
  const id = db.nextId || 1;
  db.nextId = id + 1;
  return String(id);
}

module.exports = { read, write, ensureDb, nextId };
