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

// Extrae el texto de un PDF local (capa de texto) con unpdf. Sin IA ni
// servicios externos. Devuelve '' si falla o no hay texto (escaneado →
// futuro fallback OCR local).
export async function extractPdfText(filename) {
  try {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const buffer = new Uint8Array(fs.readFileSync(resolvePath(filename)));
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    return (text || '').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
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
