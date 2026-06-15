import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { loadCommunity, requireManage } from '../middleware/community.js';
import {
  createCommunity,
  joinCommunity,
  leaveCommunity,
  myCommunities,
  getCommunity,
  listMembers,
  assignAdmin,
  updateCommunity,
} from '../controllers/communityController.js';
import {
  listMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} from '../controllers/meetingController.js';
import {
  listTopics,
  createTopic,
  updateTopic,
  deleteTopic,
} from '../controllers/topicController.js';
import {
  listTransactions,
  createTransaction,
  deleteTransaction,
} from '../controllers/transactionController.js';

const router = Router();

// Todo lo de comunidades requiere autenticación.
router.use(requireAuth);

// Acciones globales del usuario.
router.get('/mine', myCommunities);
router.post('/', createCommunity);
router.post('/join', joinCommunity);

// A partir de aquí se opera sobre una comunidad concreta.
router.use('/:communityId', loadCommunity);

router.get('/:communityId', getCommunity);
router.patch('/:communityId', requireManage, updateCommunity);
router.get('/:communityId/members', listMembers);
router.post('/:communityId/admin', requireManage, assignAdmin);
router.post('/:communityId/leave', leaveCommunity);

// Juntas vecinales.
router.get('/:communityId/meetings', listMeetings);
router.post('/:communityId/meetings', requireManage, createMeeting);
router.patch('/:communityId/meetings/:meetingId', requireManage, updateMeeting);
router.delete('/:communityId/meetings/:meetingId', requireManage, deleteMeeting);

// Temas.
router.get('/:communityId/topics', listTopics);
router.post('/:communityId/topics', requireManage, createTopic);
router.patch('/:communityId/topics/:topicId', requireManage, updateTopic);
router.delete('/:communityId/topics/:topicId', requireManage, deleteTopic);

// Arcas comunes (movimientos).
router.get('/:communityId/transactions', listTransactions);
router.post('/:communityId/transactions', requireManage, createTransaction);
router.delete('/:communityId/transactions/:transactionId', requireManage, deleteTransaction);

export default router;
