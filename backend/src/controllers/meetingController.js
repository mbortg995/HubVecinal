import Meeting from '../models/Meeting.js';
import Membership from '../models/Membership.js';
import Document from '../models/Document.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail, baseTemplate } from '../utils/email.js';
import { deleteFile, extractPdfText } from '../utils/files.js';

// Normaliza el orden del día recibido del cliente (conserva _id si viene).
function normalizeAgenda(agenda) {
  if (!Array.isArray(agenda)) return undefined;
  return agenda
    .filter((p) => p && p.title && p.title.trim())
    .map((p, i) => ({
      _id: p._id,
      order: p.order ?? i,
      title: p.title.trim(),
      description: (p.description || '').trim(),
    }));
}

// Fusiona el orden del día entrante con el existente preservando los datos de
// votación (majorityType, votingOpen, votes) de los puntos que ya existían.
function mergeAgenda(existing, incoming) {
  const byId = new Map(existing.map((p) => [p._id.toString(), p]));
  return incoming.map((p) => {
    const prev = p._id && byId.get(p._id.toString());
    if (prev) {
      prev.order = p.order;
      prev.title = p.title;
      prev.description = p.description;
      return prev;
    }
    return { order: p.order, title: p.title, description: p.description };
  });
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

// Computa el resultado de un punto: votos ponderados por coeficiente y si el
// acuerdo se aprueba según la mayoría requerida.
function computeResult(point, owners) {
  const coefById = new Map(owners.map((o) => [o.user.toString(), o.coefficient]));
  const totalCoef = owners.reduce((s, o) => s + o.coefficient, 0) || 1;
  const ownersTotal = owners.length || 1;

  const tally = { favor: 0, contra: 0, abstencion: 0 };
  const count = { favor: 0, contra: 0, abstencion: 0 };
  for (const v of point.votes || []) {
    const c = coefById.get(v.owner.toString());
    if (c === undefined) continue; // ignora votos de quien ya no es propietario
    tally[v.value] += c;
    count[v.value] += 1;
  }

  let approved = false;
  switch (point.majorityType) {
    case 'unanimidad':
      approved = tally.contra === 0 && tally.favor > 0;
      break;
    case 'tres_quintos':
      approved = tally.favor >= 0.6 * totalCoef && count.favor >= 0.6 * ownersTotal;
      break;
    case 'un_tercio':
      approved = tally.favor >= totalCoef / 3 && count.favor >= ownersTotal / 3;
      break;
    case 'simple':
    default:
      approved = tally.favor > tally.contra;
      break;
  }

  return { tally, count, approved };
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
    .populate('attendance.proxyTo', 'name')
    .populate('acta', 'name originalName mimeType');
  if (!meeting) {
    return res.status(404).json({ message: 'Junta no encontrada' });
  }
  const owners = await getOwners(req.community._id);
  const quorum = computeQuorum(owners, meeting.attendance);

  const userId = req.user._id.toString();
  const canVote = owners.some((o) => o.user.toString() === userId);

  // Adjunta a cada punto su resultado y el voto del usuario actual.
  const obj = meeting.toObject();
  obj.agenda = (obj.agenda || [])
    .sort((a, b) => a.order - b.order)
    .map((p) => {
      const myVote = (p.votes || []).find((v) => v.owner.toString() === userId)?.value || null;
      const result = computeResult(p, owners);
      // No exponemos el detalle de votos individuales, solo el cómputo.
      const { votes, ...rest } = p;
      return { ...rest, result, myVote };
    });

  res.json({ meeting: obj, owners, quorum, canManage: req.canManage, canVote });
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
  if (agenda !== undefined) {
    meeting.agenda = mergeAgenda(meeting.agenda, normalizeAgenda(agenda) || []);
  }
  await meeting.save();
  res.json({ meeting });
});

// PATCH /api/communities/:communityId/meetings/:meetingId/agenda/:pointId  (gestores)
// Configura un punto: tipo de mayoría y abrir/cerrar la votación.
export const updateAgendaPoint = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.meetingId, community: req.community._id });
  if (!meeting) return res.status(404).json({ message: 'Junta no encontrada' });
  const point = meeting.agenda.id(req.params.pointId);
  if (!point) return res.status(404).json({ message: 'Punto del orden del día no encontrado' });

  const { majorityType, votingOpen } = req.body;
  if (majorityType !== undefined && ['simple', 'tres_quintos', 'un_tercio', 'unanimidad'].includes(majorityType)) {
    point.majorityType = majorityType;
  }
  if (votingOpen !== undefined) point.votingOpen = Boolean(votingOpen);
  await meeting.save();
  res.json({ message: 'Punto actualizado' });
});

// POST /api/communities/:communityId/meetings/:meetingId/agenda/:pointId/vote
// Emite un voto. Un propietario vota lo suyo; un gestor o el representante
// (proxy) puede votar en nombre de otro propietario (parámetro `owner`).
export const castVote = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.meetingId, community: req.community._id });
  if (!meeting) return res.status(404).json({ message: 'Junta no encontrada' });
  const point = meeting.agenda.id(req.params.pointId);
  if (!point) return res.status(404).json({ message: 'Punto no encontrado' });
  if (!point.votingOpen) return res.status(400).json({ message: 'La votación de este punto está cerrada' });

  const { value, owner } = req.body;
  if (!['favor', 'contra', 'abstencion'].includes(value)) {
    return res.status(400).json({ message: 'Voto no válido' });
  }

  const owners = await getOwners(req.community._id);
  const targetId = (owner || req.user._id).toString();

  // El destinatario del voto debe ser propietario.
  if (!owners.some((o) => o.user.toString() === targetId)) {
    return res.status(400).json({ message: 'Solo los propietarios tienen derecho a voto' });
  }

  // Permisos: votas lo tuyo; gestor o representante puede votar por otro.
  const isSelf = targetId === req.user._id.toString();
  const isProxy = meeting.attendance.some(
    (a) => a.owner?.toString() === targetId && a.proxyTo?.toString() === req.user._id.toString()
  );
  if (!isSelf && !req.canManage && !isProxy) {
    return res.status(403).json({ message: 'No puedes votar en nombre de ese propietario' });
  }

  // Un voto por propietario y punto (upsert).
  const existing = point.votes.find((v) => v.owner.toString() === targetId);
  if (existing) existing.value = value;
  else point.votes.push({ owner: targetId, value });
  await meeting.save();

  res.json({ result: computeResult(point, owners) });
});

// POST /api/communities/:communityId/meetings/:meetingId/acta  (gestores, multipart)
// Adjunta el acta oficial (PDF). No se genera: la sube la administración.
export const uploadActa = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.meetingId, community: req.community._id });
  if (!meeting) return res.status(404).json({ message: 'Junta no encontrada' });
  if (!req.file) return res.status(400).json({ message: 'No se ha adjuntado ningún archivo' });

  // Sustituye el acta anterior si la había.
  if (meeting.acta) {
    const prev = await Document.findByIdAndDelete(meeting.acta);
    if (prev) deleteFile(prev.filename);
  }

  const text = req.file.mimetype === 'application/pdf' ? await extractPdfText(req.file.filename) : '';
  const doc = await Document.create({
    community: req.community._id,
    name: `Acta · ${meeting.title}`,
    category: 'acta',
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    text,
    uploadedBy: req.user._id,
  });
  meeting.acta = doc._id;
  await meeting.save();
  res.status(201).json({ acta: doc });
});

// DELETE /api/communities/:communityId/meetings/:meetingId/acta  (gestores)
export const deleteActa = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.meetingId, community: req.community._id });
  if (!meeting) return res.status(404).json({ message: 'Junta no encontrada' });
  if (meeting.acta) {
    const doc = await Document.findByIdAndDelete(meeting.acta);
    if (doc) deleteFile(doc.filename);
    meeting.acta = null;
    await meeting.save();
  }
  res.json({ message: 'Acta eliminada' });
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
