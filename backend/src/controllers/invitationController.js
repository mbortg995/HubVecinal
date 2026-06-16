import Invitation from '../models/Invitation.js';
import Community from '../models/Community.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { signToken } from '../utils/token.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail, baseTemplate } from '../utils/email.js';

const roleLabels = { admin: 'administrador', president: 'presidente', owner: 'propietario' };

// Construye el enlace de aceptación y envía el email de invitación.
async function sendInvitationEmail(invitation, communityName, organizationName) {
  const origin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0];
  const url = `${origin}/invitar/${invitation.token}`;
  const tipo =
    invitation.role === 'owner' && invitation.occupantType === 'tenant'
      ? 'inquilino'
      : roleLabels[invitation.role] || 'propietario';
  const { html, text } = baseTemplate({
    title: `Invitación a ${communityName}`,
    body: `${organizationName || 'La administración'} te invita a unirte a <strong>${communityName}</strong> como <strong>${tipo}</strong>${
      invitation.unit ? ` (vivienda ${invitation.unit})` : ''
    }. Pulsa el botón para crear tu cuenta y acceder.`,
    actionUrl: url,
    actionLabel: 'Aceptar invitación',
  });
  return sendEmail({ to: invitation.email, subject: `Invitación a ${communityName}`, html, text });
}

export { sendInvitationEmail };

// POST /api/communities/:communityId/invitations  → crear invitación (gestores).
export const createInvitation = asyncHandler(async (req, res) => {
  const { email, role, unit, coefficient, isResident, occupantType } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'El email del invitado es obligatorio' });
  }

  const wantedRole = ['admin', 'president', 'owner'].includes(role) ? role : 'owner';
  // Solo un superadmin puede invitar a otro administrador de fincas.
  if (wantedRole === 'admin' && req.communityRole !== 'superadmin') {
    return res.status(403).json({ message: 'Solo un superadmin puede invitar a un administrador' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Si ya es miembro, no tiene sentido invitarle.
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const already = await Membership.findOne({
      user: existingUser._id,
      community: req.community._id,
    });
    if (already) {
      return res.status(409).json({ message: 'Esa persona ya pertenece a la comunidad' });
    }
  }

  // Reutiliza una invitación pendiente para el mismo email/comunidad.
  let invitation = await Invitation.findOne({
    community: req.community._id,
    email: normalizedEmail,
    status: 'pending',
  });

  const resident = isResident === undefined ? true : Boolean(isResident);
  const occupant = occupantType === 'tenant' ? 'tenant' : 'owner';
  if (invitation) {
    invitation.role = wantedRole;
    invitation.unit = unit || '';
    invitation.coefficient = Number(coefficient) || 0;
    invitation.isResident = resident;
    invitation.occupantType = occupant;
    await invitation.save();
  } else {
    invitation = await Invitation.create({
      organization: req.community.organization,
      community: req.community._id,
      email: normalizedEmail,
      role: wantedRole,
      unit: unit || '',
      coefficient: Number(coefficient) || 0,
      isResident: resident,
      occupantType: occupant,
      invitedBy: req.user._id,
    });
  }

  const org = await Organization.findById(req.community.organization).select('name');
  const result = await sendInvitationEmail(invitation, req.community.name, org?.name);
  res.status(201).json({ invitation, emailDelivered: result.delivered });
});

// GET /api/communities/:communityId/invitations  → invitaciones pendientes (gestores).
export const listInvitations = asyncHandler(async (req, res) => {
  const invitations = await Invitation.find({
    community: req.community._id,
    status: 'pending',
  }).sort({ createdAt: -1 });
  res.json({ invitations });
});

// DELETE /api/communities/:communityId/invitations/:invitationId  → revocar (gestores).
export const revokeInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findOne({
    _id: req.params.invitationId,
    community: req.community._id,
  });
  if (!invitation) {
    return res.status(404).json({ message: 'Invitación no encontrada' });
  }
  invitation.status = 'revoked';
  await invitation.save();
  res.json({ message: 'Invitación revocada' });
});

// GET /api/invitations/:token  → datos públicos de la invitación (para la pantalla de aceptación).
export const getInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findOne({ token: req.params.token })
    .populate('community', 'name address')
    .populate('organization', 'name');
  if (!invitation || invitation.status !== 'pending') {
    return res.status(404).json({ message: 'Invitación no válida o ya utilizada' });
  }
  if (invitation.expiresAt < new Date()) {
    return res.status(410).json({ message: 'La invitación ha caducado' });
  }

  const existingUser = await User.findOne({ email: invitation.email });

  res.json({
    invitation: {
      email: invitation.email,
      role: invitation.role,
      occupantType: invitation.occupantType,
      unit: invitation.unit,
      community: invitation.community,
      organization: invitation.organization,
      requiresAccount: !existingUser,
    },
  });
});

// POST /api/invitations/:token/accept  → aceptar invitación.
// Crea la cuenta (si no existe) y la membresía. Devuelve un token de sesión.
export const acceptInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findOne({ token: req.params.token });
  if (!invitation || invitation.status !== 'pending') {
    return res.status(404).json({ message: 'Invitación no válida o ya utilizada' });
  }
  if (invitation.expiresAt < new Date()) {
    return res.status(410).json({ message: 'La invitación ha caducado' });
  }

  const community = await Community.findById(invitation.community);
  if (!community) {
    return res.status(404).json({ message: 'La comunidad ya no existe' });
  }

  let user = await User.findOne({ email: invitation.email });

  if (!user) {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: 'Nombre y contraseña son obligatorios' });
    }
    user = await User.create({
      name,
      email: invitation.email,
      password,
      platformRole: 'member',
    });
  }

  // Crea la membresía si aún no existe.
  await Membership.findOneAndUpdate(
    { user: user._id, community: community._id },
    {
      $setOnInsert: {
        role: invitation.role,
        unit: invitation.unit,
        coefficient: invitation.coefficient,
        isResident: invitation.isResident,
        occupantType: invitation.occupantType,
      },
    },
    { upsert: true, new: true }
  );

  invitation.status = 'accepted';
  invitation.acceptedAt = new Date();
  await invitation.save();

  const token = signToken(user);
  res.json({ token, user: user.toSafeObject(), communityId: community._id });
});
