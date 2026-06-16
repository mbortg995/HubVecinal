import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR } from '../middleware/upload.js';

// Resuelve la ruta absoluta de un fichero almacenado (a prueba de path traversal).
function resolvePath(filename) {
  return path.join(UPLOAD_DIR, path.basename(filename));
}

// Envía un fichero al cliente (tras haber verificado el acceso en la ruta).
export function streamFile(res, filename, originalName, mimeType) {
  const filePath = resolvePath(filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Archivo no encontrado' });
  }
  if (mimeType) res.type(mimeType);
  if (originalName) {
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
  }
  fs.createReadStream(filePath).pipe(res);
}

// Borra un fichero del almacenamiento (silencioso si no existe).
export function deleteFile(filename) {
  if (!filename) return;
  try {
    fs.unlinkSync(resolvePath(filename));
  } catch {
    /* el fichero ya no existe: no pasa nada */
  }
}
