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

// Propietarios de la comunidad (los únicos con coeficiente y derecho a voto).
async function getOwners(communityId) {
  // Propietarios = ocupante 'owner' y rol no administrativo (el admin de fincas
  // no es propietario aunque su occupantType venga por defecto a 'owner').
  const memberships = await Membership.find({
    community: communityId,
    occupantType: 'owner',
    role: { $ne: 'admin' },
  }).populate('user', 'name email');
  return memberships
    .filter((m) => m.user)
    .map((m) => ({
      user: m.user._id,
      name: m.user.name,
      coefficient: m.coefficient || 0,
    }));
}

// Calcula el quórum a partir de la asistencia (presentes + representados).
function computeQuorum(owners, attendance) {
  const totalCoef = owners.reduce((s, o) => s + o.coefficient, 0);
  const coefById = new Map(owners.map((o) => [o.user.toString(), o.coefficient]));

  const inPerson = new Set(
    attendance.filter((a) => !a.proxyTo).map((a) => a.owner?.toString()).filter(Boolean)
  );
  // Representado = su proxyTo asiste en persona.
  const effective = new Set(inPerson);
  for (const a of attendance) {
    if (a.proxyTo && inPerson.has(a.proxyTo.toString()) && a.owner) {
      effective.add(a.owner.toString());
    }
  }

  let presentCoef = 0;
  for (const id of effective) presentCoef += coefById.get(id) || 0;

  const percent = totalCoef ? (presentCoef / totalCoef) * 100 : 0;
  const ownersPresent = effective.size;
  return {
    totalCoef,
    presentCoef,
    percent,
    ownersTotal: owners.length,
    ownersPresent,
    // 1ª convocatoria: mayoría de cuotas y de propietarios. 2ª: cualquier asistencia.
    firstCallValid: percent > 50 && ownersPresent > owners.length / 2,
    secondCallValid: ownersPresent > 0,
  };
}

export { getOwners, computeQuorum };

// GET /api/communities/:communityId/meetings
export const listMeetings = asyncHandler(async (req, res) => {
  const meetings = await Meeting.find({ community: req.community._id }).sort({ date: -1 });
  res.json({ meetings });
});

// GET /api/communities/:communityId/meetings/:meetingId  → detalle + quórum.
export const getMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.meetingId, community: req.community._id })
    .populate('attendance.owner', 'name')
    .populate('attendance.proxyTo', 'name');
  if (!meeting) {
    return res.status(404).json({ message: 'Junta no encontrada' });
  }
  const owners = await getOwners(req.community._id);
  const quorum = computeQuorum(owners, meeting.attendance);
  res.json({ meeting, owners, quorum, canManage: req.canManage });
});

// PUT /api/communities/:communityId/meetings/:meetingId/attendance  (gestores)
export const setAttendance = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.meetingId, community: req.community._id });
  if (!meeting) {
    return res.status(404).json({ message: 'Junta no encontrada' });
  }
  const list = Array.isArray(req.body.attendance) ? req.body.attendance : [];
  meeting.attendance = list
    .filter((a) => a.owner)
    .map((a) => ({ owner: a.owner, proxyTo: a.proxyTo || null }));
  await meeting.save();
  const owners = await getOwners(req.community._id);
  res.json({ quorum: computeQuorum(owners, meeting.attendance) });
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
