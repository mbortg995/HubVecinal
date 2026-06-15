import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Membership from '../models/Membership.js';
import { signToken } from '../utils/token.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// POST /api/auth/register-organization
// Alta de una administradora: crea la organización y su primer superadmin.
export const registerOrganization = asyncHandler(async (req, res) => {
  const { organizationName, name, email, password } = req.body;
  if (!organizationName || !name || !email || !password) {
    return res
      .status(400)
      .json({ message: 'Nombre de la organización, nombre, email y contraseña son obligatorios' });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(409).json({ message: 'Ya existe una cuenta con ese email' });
  }

  const organization = await Organization.create({ name: organizationName, contactEmail: email });

  const user = await User.create({
    name,
    email,
    password,
    platformRole: 'superadmin',
    organization: organization._id,
  });

  organization.createdBy = user._id;
  await organization.save();

  const token = signToken(user);
  res.status(201).json({ token, user: user.toSafeObject(), organization });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Credenciales incorrectas' });
  }

  const token = signToken(user);
  res.json({ token, user: user.toSafeObject() });
});

// GET /api/auth/me  → usuario + organización (si superadmin) + sus membresías.
export const me = asyncHandler(async (req, res) => {
  const user = await req.user.populate('organization');
  const memberships = await Membership.find({ user: user._id }).select('community role unit');
  res.json({ user: user.toSafeObject(), memberships });
});
