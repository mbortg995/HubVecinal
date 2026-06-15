import Community from '../models/Community.js';
import Membership from '../models/Membership.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Devuelve el rol efectivo del usuario sobre una comunidad, o null si no tiene acceso.
//  - Un superadmin de la organización dueña de la comunidad → 'superadmin'.
//  - En caso contrario, el rol de su membresía ('admin' | 'president' | 'owner').
export async function resolveRole(user, community) {
  if (
    user.platformRole === 'superadmin' &&
    user.organization &&
    community.organization?.toString() === user.organization.toString()
  ) {
    return 'superadmin';
  }
  const membership = await Membership.findOne({ user: user._id, community: community._id });
  return membership ? membership.role : null;
}

// Carga la comunidad de :communityId, verifica el acceso y calcula los permisos.
export const loadCommunity = asyncHandler(async (req, res, next) => {
  const community = await Community.findById(req.params.communityId);
  if (!community) {
    return res.status(404).json({ message: 'Comunidad no encontrada' });
  }

  const role = await resolveRole(req.user, community);
  if (!role) {
    return res.status(403).json({ message: 'No tienes acceso a esta comunidad' });
  }

  req.community = community;
  req.communityRole = role;
  // Superadmin, admin y presidente pueden crear/editar/borrar. Owner es solo lectura.
  req.canManage = role === 'superadmin' || role === 'admin' || role === 'president';
  next();
});

// Exige permiso de gestión sobre la comunidad ya cargada.
export function requireManage(req, res, next) {
  if (!req.canManage) {
    return res.status(403).json({
      message: 'Solo el presidente o el administrador pueden modificar esta información',
    });
  }
  next();
}
