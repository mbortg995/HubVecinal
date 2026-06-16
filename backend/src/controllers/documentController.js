import Document from '../models/Document.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { streamFile, deleteFile } from '../utils/files.js';

// GET /api/communities/:communityId/documents
export const listDocuments = asyncHandler(async (req, res) => {
  const filter = { community: req.community._id };
  if (req.query.category) filter.category = req.query.category;
  const documents = await Document.find(filter)
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ documents });
});

// POST /api/communities/:communityId/documents  (multipart: file + name + category)
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha adjuntado ningún archivo' });
  }
  const document = await Document.create({
    community: req.community._id,
    name: req.body.name?.trim() || req.file.originalname,
    category: req.body.category || 'otro',
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
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
