import Incident from '../models/Incident.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { streamFile, deleteFile } from '../utils/files.js';
import { sendEmail, baseTemplate } from '../utils/email.js';

const statusLabels = { open: 'Abierta', in_progress: 'En curso', resolved: 'Resuelta' };

function populateIncident(query) {
  return query
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .populate('comments.author', 'name');
}

// GET /api/communities/:communityId/incidents
export const listIncidents = asyncHandler(async (req, res) => {
  const filter = { community: req.community._id };
  if (['open', 'in_progress', 'resolved'].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  const incidents = await populateIncident(Incident.find(filter)).sort({ updatedAt: -1 });
  res.json({ incidents });
});

// POST /api/communities/:communityId/incidents  (cualquier miembro; multipart con fotos)
export const createIncident = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'El título de la incidencia es obligatorio' });
  }
  const photos = (req.files || []).map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    mimeType: f.mimetype,
  }));
  const incident = await Incident.create({
    community: req.community._id,
    title,
    description: description || '',
    photos,
    createdBy: req.user._id,
  });
  const populated = await populateIncident(Incident.findById(incident._id));
  res.status(201).json({ incident: populated });
});

// PATCH /api/communities/:communityId/incidents/:incidentId  (gestores: estado / asignación)
export const updateIncident = asyncHandler(async (req, res) => {
  const incident = await populateIncident(
    Incident.findOne({ _id: req.params.incidentId, community: req.community._id })
  );
  if (!incident) {
    return res.status(404).json({ message: 'Incidencia no encontrada' });
  }

  const { status, assignedTo } = req.body;
  const prevStatus = incident.status;

  if (status !== undefined && ['open', 'in_progress', 'resolved'].includes(status)) {
    incident.status = status;
  }
  if (assignedTo !== undefined) {
    incident.assignedTo = assignedTo || null;
  }
  await incident.save();

  // Notifica al autor si ha cambiado el estado.
  if (status !== undefined && status !== prevStatus && incident.createdBy?.email) {
    const { html, text } = baseTemplate({
      title: `Tu incidencia "${incident.title}" ahora está: ${statusLabels[status]}`,
      body: `El estado de la incidencia que reportaste en ${req.community.name} ha cambiado a <strong>${statusLabels[status]}</strong>.`,
    });
    await sendEmail({
      to: incident.createdBy.email,
      subject: `Incidencia actualizada: ${incident.title}`,
      html,
      text,
    });
  }

  const result = await populateIncident(Incident.findById(incident._id));
  res.json({ incident: result });
});

// POST /api/communities/:communityId/incidents/:incidentId/comments  (cualquier miembro)
export const addComment = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ message: 'El comentario no puede estar vacío' });
  }
  const incident = await Incident.findOne({
    _id: req.params.incidentId,
    community: req.community._id,
  });
  if (!incident) {
    return res.status(404).json({ message: 'Incidencia no encontrada' });
  }
  incident.comments.push({ author: req.user._id, text: text.trim() });
  await incident.save();
  const result = await populateIncident(Incident.findById(incident._id));
  res.status(201).json({ incident: result });
});

// GET /api/communities/:communityId/incidents/:incidentId/photos/:index/download
export const downloadPhoto = asyncHandler(async (req, res) => {
  const incident = await Incident.findOne({
    _id: req.params.incidentId,
    community: req.community._id,
  });
  if (!incident) {
    return res.status(404).json({ message: 'Incidencia no encontrada' });
  }
  const photo = incident.photos[Number(req.params.index)];
  if (!photo) {
    return res.status(404).json({ message: 'Foto no encontrada' });
  }
  streamFile(res, photo.filename, photo.originalName, photo.mimeType);
});

// DELETE /api/communities/:communityId/incidents/:incidentId  (gestores)
export const deleteIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.findOneAndDelete({
    _id: req.params.incidentId,
    community: req.community._id,
  });
  if (!incident) {
    return res.status(404).json({ message: 'Incidencia no encontrada' });
  }
  incident.photos.forEach((p) => deleteFile(p.filename));
  res.json({ message: 'Incidencia eliminada' });
});
