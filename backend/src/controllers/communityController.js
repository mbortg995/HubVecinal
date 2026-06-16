import Community from '../models/Community.js';
import Membership from '../models/Membership.js';
import Meeting from '../models/Meeting.js';
import Topic from '../models/Topic.js';
import Transaction from '../models/Transaction.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Calcula el saldo actual de las arcas a partir de las transacciones.
export async function computeBalance(communityId) {
  const result = await Transaction.aggregate([
    { $match: { community: communityId } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  let income = 0;
  let expense = 0;
  for (const row of result) {
    if (row._id === 'income') income = row.total;
    if (row._id === 'expense') expense = row.total;
  }
  return { income, expense, balance: income - expense };
}

// POST /api/communities  → un superadmin crea una comunidad dentro de su organización.
export const createCommunity = asyncHandler(async (req, res) => {
  const { name, address } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'El nombre de la comunidad es obligatorio' });
  }
  const community = await Community.create({
    name,
    address: address || '',
    organization: req.user.organization,
    createdBy: req.user._id,
  });
  res.status(201).json({ community });
});

// GET /api/communities/mine  → comunidades a las que el usuario tiene acceso, con su rol.
export const myCommunities = asyncHandler(async (req, res) => {
  let communities = [];
  const roleByCommunity = new Map();

  if (req.user.platformRole === 'superadmin' && req.user.organization) {
    communities = await Community.find({ organization: req.user.organization });
    communities.forEach((c) => roleByCommunity.set(c._id.toString(), 'superadmin'));
  } else {
    const memberships = await Membership.find({ user: req.user._id }).populate('community');
    communities = memberships.filter((m) => m.community).map((m) => m.community);
    memberships.forEach((m) => {
      if (m.community) roleByCommunity.set(m.community._id.toString(), m.role);
    });
  }

  const enriched = await Promise.all(
    communities.map(async (c) => {
      const funds = await computeBalance(c._id);
      const memberCount = await Membership.countDocuments({ community: c._id });
      return {
        ...c.toObject(),
        role: roleByCommunity.get(c._id.toString()),
        funds,
        memberCount,
      };
    })
  );

  res.json({ communities: enriched });
});

// Devuelve presidente y administradores derivados de las membresías.
async function getLeadership(communityId) {
  const leaders = await Membership.find({
    community: communityId,
    role: { $in: ['president', 'admin'] },
  }).populate('user', 'name email');
  const president = leaders.find((m) => m.role === 'president')?.user || null;
  const administrators = leaders.filter((m) => m.role === 'admin').map((m) => m.user);
  return { president, administrators };
}

// GET /api/communities/:communityId  → detalle + resumen (el hub).
export const getCommunity = asyncHandler(async (req, res) => {
  const community = req.community;
  const funds = await computeBalance(community._id);

  const upcomingMeetings = await Meeting.find({
    community: community._id,
    status: 'upcoming',
  })
    .sort({ date: 1 })
    .limit(5);

  const lastHeldMeeting = await Meeting.findOne({
    community: community._id,
    status: 'held',
  }).sort({ date: -1 });

  const pendingTopics = await Topic.find({
    community: community._id,
    status: 'pending',
  }).sort({ createdAt: -1 });

  const resolvedTopics = await Topic.find({
    community: community._id,
    status: 'resolved',
  })
    .sort({ updatedAt: -1 })
    .limit(10);

  const { president, administrators } = await getLeadership(community._id);

  res.json({
    community: { ...community.toObject(), president, administrators },
    role: req.communityRole,
    canManage: req.canManage,
    funds,
    upcomingMeetings,
    lastHeldMeeting,
    pendingTopics,
    resolvedTopics,
  });
});

// GET /api/communities/:communityId/members
export const listMembers = asyncHandler(async (req, res) => {
  const memberships = await Membership.find({ community: req.community._id }).populate(
    'user',
    'name email nif phone'
  );
  const members = memberships.map((m) => ({
    _id: m._id,
    user: m.user,
    role: m.role,
    unit: m.unit,
    coefficient: m.coefficient,
    isResident: m.isResident,
    occupantType: m.occupantType,
  }));
  res.json({ members });
});

// PATCH /api/communities/:communityId  → actualizar datos básicos.
export const updateCommunity = asyncHandler(async (req, res) => {
  const { name, address } = req.body;
  if (name !== undefined) req.community.name = name;
  if (address !== undefined) req.community.address = address;
  await req.community.save();
  res.json({ community: req.community });
});

// DELETE /api/communities/:communityId  → solo superadmin. Borra la comunidad y sus datos.
export const deleteCommunity = asyncHandler(async (req, res) => {
  if (req.communityRole !== 'superadmin') {
    return res.status(403).json({ message: 'Solo un superadmin puede eliminar una comunidad' });
  }
  const id = req.community._id;
  await Promise.all([
    Meeting.deleteMany({ community: id }),
    Topic.deleteMany({ community: id }),
    Transaction.deleteMany({ community: id }),
    Membership.deleteMany({ community: id }),
  ]);
  await req.community.deleteOne();
  res.json({ message: 'Comunidad eliminada' });
});

// PATCH /api/communities/:communityId/members/:membershipId  → editar membresía (gestores).
export const updateMember = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({
    _id: req.params.membershipId,
    community: req.community._id,
  });
  if (!membership) {
    return res.status(404).json({ message: 'Miembro no encontrado' });
  }

  const { unit, coefficient, isResident, occupantType, role } = req.body;
  if (unit !== undefined) membership.unit = unit;
  if (coefficient !== undefined) membership.coefficient = Number(coefficient) || 0;
  if (isResident !== undefined) membership.isResident = Boolean(isResident);
  if (occupantType !== undefined && ['owner', 'tenant'].includes(occupantType)) {
    membership.occupantType = occupantType;
  }

  // Solo un superadmin puede cambiar el rol de gobierno de un miembro.
  if (role !== undefined) {
    if (req.communityRole !== 'superadmin') {
      return res.status(403).json({ message: 'Solo un superadmin puede cambiar el rol' });
    }
    if (['admin', 'president', 'owner'].includes(role)) membership.role = role;
  }

  await membership.save();
  res.json({ membership });
});

// DELETE /api/communities/:communityId/members/:membershipId  → quitar a un vecino (gestores).
export const removeMember = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({
    _id: req.params.membershipId,
    community: req.community._id,
  });
  if (!membership) {
    return res.status(404).json({ message: 'Miembro no encontrado' });
  }
  await membership.deleteOne();
  res.json({ message: 'Miembro eliminado de la comunidad' });
});
