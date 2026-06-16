import Document from '../models/Document.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { streamFile, deleteFile, extractPdfText } from '../utils/files.js';

// Escapa una cadena para usarla en una expresión regular.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/communities/:communityId/documents?category=&q=
export const listDocuments = asyncHandler(async (req, res) => {
  const filter = { community: req.community._id };
  if (req.query.category) filter.category = req.query.category;

  // Búsqueda de texto completo (en nombre y texto extraído del PDF).
  const q = (req.query.q || '').trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { text: rx }];
  }

  const docs = await Document.find(filter).populate('uploadedBy', 'name').sort({ createdAt: -1 }).lean();
  // No devolvemos el texto completo en la lista; solo una vista previa.
  const documents = docs.map(({ text, ...rest }) => ({
    ...rest,
    hasText: !!text,
    textPreview: text ? text.slice(0, 280) : '',
  }));
  res.json({ documents });
});

// POST /api/communities/:communityId/documents  (multipart: file + name + category)
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha adjuntado ningún archivo' });
  }
  // Extracción local del texto si es un PDF (para búsqueda y vista previa).
  const text = req.file.mimetype === 'application/pdf' ? await extractPdfText(req.file.filename) : '';
  const document = await Document.create({
    community: req.community._id,
    name: req.body.name?.trim() || req.file.originalname,
    category: req.body.category || 'otro',
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    text,
    uploadedBy: req.user._id,
  });
  res.status(201).json({ document });
});

// GET /api/communities/:communityId/documents/:documentId/download
export const downloadDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.documentId,
    community: req.community._id,
  });
  if (!document) {
    return res.status(404).json({ message: 'Documento no encontrado' });
  }
  streamFile(res, document.filename, document.originalName || document.name, document.mimeType);
});

// DELETE /api/communities/:communityId/documents/:documentId  (gestores)
export const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOneAndDelete({
    _id: req.params.documentId,
    community: req.community._id,
  });
  if (!document) {
    return res.status(404).json({ message: 'Documento no encontrado' });
  }
  deleteFile(document.filename);
  res.json({ message: 'Documento eliminado' });
});
