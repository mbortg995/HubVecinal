import { Router } from 'express';
import { registerOrganization, login, me, updateMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register-organization', registerOrganization);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateMe);

export default router;
