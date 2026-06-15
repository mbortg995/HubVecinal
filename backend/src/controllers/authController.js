import User from '../models/User.js';
import { signToken } from '../utils/token.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios' });
  }

  // Solo se permite registrar 'owner' o 'admin'.
  const safeRole = role === 'admin' ? 'admin' : 'owner';

  const user = await User.create({ name, email, password, role: safeRole });
  const token = signToken(user);
  res.status(201).json({ token, user: user.toSafeObject() });
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

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  const user = await req.user.populate('community');
  res.json({ user: user.toSafeObject() });
});
