import Community from '../models/Community.js';
import User from '../models/User.js';
import Meeting from '../models/Meeting.js';
import Topic from '../models/Topic.js';
import Transaction from '../models/Transaction.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Calcula el saldo actual de las arcas a partir de las transacciones.
async function computeBalance(communityId) {
  const result = await Transaction.aggregate([
    { $match: { community: communityId } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      },
    },
  ]);
  let income = 0;
  let expense = 0;
  for (const row of result) {
    if (row._id === 'income') income = row.total;
    if (row._id === 'expense') expense = row.total;
  }
  return { income, expense, balance: income - expense };
}

export { computeBalance };

// POST /api/communities  → un propietario crea su comunidad y pasa a ser presidente.
export const createCommunity = asyncHandler(async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Solo un propietario puede crear una comunidad' });
  }
  if (req.user.community) {
    return res.status(409).json({ message: 'Ya perteneces a una comunidad' });
  }

  const { name, address, unit } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'El nombre de la comunidad es obligatorio' });
  }

  const community = await Community.create({
    name,
    address: address || '',
    president: req.user._id,
  });

  req.user.community = community._id;
  req.user.unit = unit || '';
  req.user.isPresident = true;
  await req.user.save();

  res.status(201).json({ community });
});

// POST /api/communities/join  → un propietario se une mediante joinCode.
export const joinCommunity = asyncHandler(async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Solo los propietarios pueden unirse a una comunidad' });
  }
  if (req.user.community) {
    return res.status(409).json({ message: 'Ya perteneces a una comunidad' });
  }

  const { joinCode, unit } = req.body;
  const community = await Community.findOne({ joinCode: (joinCode || '').toUpperCase().trim() });
  if (!community) {
    return res.status(404).json({ message: 'No existe ninguna comunidad con ese código' });
  }

  req.user.community = community._id;
  req.user.unit = unit || '';
  req.user.isPresident = false;
  await req.user.save();

  res.json({ community });
});

// POST /api/communities/:communityId/leave  → el propietario abandona su comunidad.
export const leaveCommunity = asyncHandler(async (req, res) => {
  if (req.user.community?.toString() !== req.params.communityId) {
    return res.status(400).json({ message: 'No perteneces a esta comunidad' });
  }
  req.user.community = null;
  req.user.unit = '';
  req.user.isPresident = false;
  await req.user.save();
  res.json({ message: 'Has abandonado la comunidad' });
});

// GET /api/communities/mine  → comunidades relevantes para el usuario actual.
export const myCommunities = asyncHandler(async (req, res) => {
  let communities = [];
  if (req.user.role === 'admin') {
    communities = await Community.find({ administrator: req.user._id });
  } else if (req.user.community) {
    const c = await Community.findById(req.user.community);
    if (c) communities = [c];
  }

  const enriched = await Promise.all(
    communities.map(async (c) => {
      const funds = await computeBalance(c._id);
      const memberCount = await User.countDocuments({ community: c._id });
      return { ...c.toObject(), funds, memberCount };
    })
  );

  res.json({ communities: enriched });
});

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

  const populated = await Community.findById(community._id)
    .populate('president', 'name email')
    .populate('administrator', 'name email');

  res.json({
    community: populated,
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
  const members = await User.find({ community: req.community._id }).select(
    'name email unit isPresident role'
  );
  res.json({ members });
});

// POST /api/communities/:communityId/admin  → el presidente asigna un administrador por email.
export const assignAdmin = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const admin = await User.findOne({ email: (email || '').toLowerCase().trim() });
  if (!admin || admin.role !== 'admin') {
    return res.status(404).json({ message: 'No existe ninguna cuenta de administrador con ese email' });
  }
  req.community.administrator = admin._id;
  await req.community.save();
  res.json({ message: 'Administrador asignado correctamente' });
});

// PATCH /api/communities/:communityId  → actualizar datos básicos.
export const updateCommunity = asyncHandler(async (req, res) => {
  const { name, address } = req.body;
  if (name !== undefined) req.community.name = name;
  if (address !== undefined) req.community.address = address;
  await req.community.save();
  res.json({ community: req.community });
});
