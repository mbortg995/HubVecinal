import Community from '../models/Community.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Carga la comunidad de :communityId, verifica que el usuario tiene acceso
// y calcula si puede gestionarla (presidente o administrador asignado).
export const loadCommunity = asyncHandler(async (req, res, next) => {
  const community = await Community.findById(req.params.communityId);
  if (!community) {
    return res.status(404).json({ message: 'Comunidad no encontrada' });
  }

  const userId = req.user._id.toString();
  const isPresident = community.president?.toString() === userId;
  const isAdmin =
    req.user.role === 'admin' && community.administrator?.toString() === userId;
  const isMember =
    req.user.role === 'owner' && req.user.community?.toString() === community._id.toString();

  if (!isPresident && !isAdmin && !isMember) {
    return res.status(403).json({ message: 'No perteneces a esta comunidad' });
  }

  req.community = community;
  // Presidente y administrador asignado pueden crear/editar/borrar.
  req.canManage = isPresident || isAdmin;
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
