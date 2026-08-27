const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).slice(0, 10);
    const storedName = crypto.randomBytes(16).toString('hex') + safeExt;
    cb(null, storedName);
  }
});

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
  cb(new Error('Unsupported file type. Allowed: PDF, Word, PowerPoint, Excel, text, or image files.'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

function fileMetaFrom(file) {
  return {
    originalName: file.originalname,
    storedName: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    uploadedAt: Date.now()
  };
}

function deleteStoredFile(storedName) {
  if (!storedName) return;
  const p = path.join(UPLOAD_DIR, storedName);
  fs.unlink(p, () => {}); // best-effort, ignore errors (e.g. already gone)
}

module.exports = { upload, UPLOAD_DIR, fileMetaFrom, deleteStoredFile };
