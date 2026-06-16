import Announcement from '../models/Announcement.js';
import Membership from '../models/Membership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail, baseTemplate } from '../utils/email.js';

// Avisos ordenados: primero los fijados, luego por fecha.
function sortedQuery(communityId) {
  return Announcement.find({ community: communityId })
    .populate('createdBy', 'name')
    .sort({ pinned: -1, createdAt: -1 });
}

// GET /api/communities/:communityId/announcements
export const listAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await sortedQuery(req.community._id);
  res.json({ announcements });
});

// POST /api/communities/:communityId/announcements  (gestores)
export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, body, pinned, notifyByEmail } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'El título del aviso es obligatorio' });
  }
  const announcement = await Announcement.create({
    community: req.community._id,
    title,
    body: body || '',
    pinned: Boolean(pinned),
    createdBy: req.user._id,
  });

  // Notifica por email a todos los miembros si se ha solicitado.
  let notified = 0;
  if (notifyByEmail) {
    const members = await Membership.find({ community: req.community._id }).populate('user', 'email');
    const emails = [...new Set(members.map((m) => m.user?.email).filter(Boolean))];
    const { html, text } = baseTemplate({
      title: `Nuevo aviso: ${title}`,
      body: `${body || ''}<br><br><em>${req.community.name}</em>`,
    });
    await Promise.all(
      emails.map((to) =>
        sendEmail({ to, subject: `Aviso de ${req.community.name}: ${title}`, html, text })
      )
    );
    notified = emails.length;
  }

  res.status(201).json({ announcement, notified });
});

// PATCH /api/communities/:communityId/announcements/:announcementId  (gestores)
export const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findOne({
    _id: req.params.announcementId,
    community: req.community._id,
  });
  if (!announcement) {
    return res.status(404).json({ message: 'Aviso no encontrado' });
  }
  const { title, body, pinned } = req.body;
  if (title !== undefined) announcement.title = title;
  if (body !== undefined) announcement.body = body;
  if (pinned !== undefined) announcement.pinned = Boolean(pinned);
  await announcement.save();
  res.json({ announcement });
});

// DELETE /api/communities/:communityId/announcements/:announcementId  (gestores)
export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findOneAndDelete({
    _id: req.params.announcementId,
    community: req.community._id,
  });
  if (!announcement) {
    return res.status(404).json({ message: 'Aviso no encontrado' });
  }
  res.json({ message: 'Aviso eliminado' });
});
