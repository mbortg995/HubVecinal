import Meeting from '../models/Meeting.js';
import Membership from '../models/Membership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail, baseTemplate } from '../utils/email.js';

// Normaliza el orden del día recibido del cliente.
function normalizeAgenda(agenda) {
  if (!Array.isArray(agenda)) return undefined;
  return agenda
    .filter((p) => p && p.title && p.title.trim())
    .map((p, i) => ({
      order: p.order ?? i,
      title: p.title.trim(),
      description: (p.description || '').trim(),
    }));
}

// GET /api/communities/:communityId/meetings
export const listMeetings = asyncHandler(async (req, res) => {
  const meetings = await Meeting.find({ community: req.community._id }).sort({ date: -1 });
  res.json({ meetings });
});

// POST /api/communities/:communityId/meetings
export const createMeeting = asyncHandler(async (req, res) => {
  const { title, date, secondCallDate, location, notes, status, agenda } = req.body;
  if (!title || !date) {
    return res.status(400).json({ message: 'Título y fecha son obligatorios' });
  }
  const meeting = await Meeting.create({
    community: req.community._id,
    title,
    date,
    secondCallDate: secondCallDate || null,
    location: location || '',
    notes: notes || '',
    status: status === 'held' ? 'held' : 'upcoming',
    agenda: normalizeAgenda(agenda) || [],
    createdBy: req.user._id,
  });
  res.status(201).json({ meeting });
});

// PATCH /api/communities/:communityId/meetings/:meetingId
export const updateMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({
    _id: req.params.meetingId,
    community: req.community._id,
  });
  if (!meeting) {
    return res.status(404).json({ message: 'Junta no encontrada' });
  }
  const { title, date, secondCallDate, location, notes, status, agenda } = req.body;
  if (title !== undefined) meeting.title = title;
  if (date !== undefined) meeting.date = date;
  if (secondCallDate !== undefined) meeting.secondCallDate = secondCallDate || null;
  if (location !== undefined) meeting.location = location;
  if (notes !== undefined) meeting.notes = notes;
  if (status !== undefined) meeting.status = status === 'held' ? 'held' : 'upcoming';
  if (agenda !== undefined) meeting.agenda = normalizeAgenda(agenda) || [];
  await meeting.save();
  res.json({ meeting });
});

// POST /api/communities/:communityId/meetings/:meetingId/convocatoria  (gestores)
// Envía la convocatoria por email a todos los miembros, con el orden del día.
export const sendConvocatoria = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({
    _id: req.params.meetingId,
    community: req.community._id,
  });
  if (!meeting) {
    return res.status(404).json({ message: 'Junta no encontrada' });
  }

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString('es-ES', {
          dateStyle: 'long',
          timeStyle: 'short',
        })
      : null;

  const agendaHtml = meeting.agenda.length
    ? `<ol>${meeting.agenda
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((p) => `<li><strong>${p.title}</strong>${p.description ? `: ${p.description}` : ''}</li>`)
        .join('')}</ol>`
    : '<p>(Sin orden del día)</p>';

  const body = `Se convoca junta de la comunidad <strong>${req.community.name}</strong>.<br><br>
    <strong>1ª convocatoria:</strong> ${fmt(meeting.date)}<br>
    ${meeting.secondCallDate ? `<strong>2ª convocatoria:</strong> ${fmt(meeting.secondCallDate)}<br>` : ''}
    ${meeting.location ? `<strong>Lugar:</strong> ${meeting.location}<br>` : ''}
    <br><strong>Orden del día:</strong>${agendaHtml}`;

  const { html, text } = baseTemplate({ title: `Convocatoria: ${meeting.title}`, body });

  const members = await Membership.find({ community: req.community._id }).populate('user', 'email');
  const emails = [...new Set(members.map((m) => m.user?.email).filter(Boolean))];
  await Promise.all(
    emails.map((to) =>
      sendEmail({ to, subject: `Convocatoria de junta: ${meeting.title}`, html, text })
    )
  );

  meeting.convocatoriaSentAt = new Date();
  await meeting.save();
  res.json({ message: 'Convocatoria enviada', notified: emails.length });
});

// DELETE /api/communities/:communityId/meetings/:meetingId
export const deleteMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOneAndDelete({
    _id: req.params.meetingId,
    community: req.community._id,
  });
  if (!meeting) {
    return res.status(404).json({ message: 'Junta no encontrada' });
  }
  res.json({ message: 'Junta eliminada' });
});
