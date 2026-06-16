import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Directorio de subidas (configurable). En producción se sustituiría por S3/Cloudinary.
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Nombre aleatorio para no exponer datos ni colisionar; conserva la extensión.
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const maxMb = Number(process.env.MAX_UPLOAD_MB) || 10;

export const upload = multer({
  storage,
  limits: { fileSize: maxMb * 1024 * 1024 },
});
