import { Router } from 'express';
import { getInvitation, acceptInvitation } from '../controllers/invitationController.js';

// Rutas públicas para aceptar una invitación mediante su token.
const router = Router();

router.get('/:token', getInvitation);
router.post('/:token/accept', acceptInvitation);

export default router;
