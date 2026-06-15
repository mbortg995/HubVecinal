import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';

// Exige un token válido y carga el usuario en req.user.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const payload = verifyToken(token);
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

// Restringe a superadmins (personal de una administradora).
export function requireSuperadmin(req, res, next) {
  if (req.user.platformRole !== 'superadmin' || !req.user.organization) {
    return res.status(403).json({ message: 'Solo un superadmin puede realizar esta acción' });
  }
  next();
}
