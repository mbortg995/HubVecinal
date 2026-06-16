import { Router } from 'express';
import { requireAuth, requireSuperadmin } from '../middleware/auth.js';
import { loadCommunity, requireManage } from '../middleware/community.js';
import {
  createCommunity,
  myCommunities,
  getCommunity,
  listMembers,
  updateCommunity,
  deleteCommunity,
  removeMember,
  updateMember,
} from '../controllers/communityController.js';
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
} from '../controllers/invitationController.js';
import {
  listMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} from '../controllers/meetingController.js';
import { listTopics, createTopic, updateTopic, deleteTopic } from '../controllers/topicController.js';
import {
  listTransactions,
  createTransaction,
  deleteTransaction,
} from '../controllers/transactionController.js';

const router = Router();

router.use(requireAuth);

// Acciones globales del usuario.
router.get('/mine', myCommunities);
router.post('/', requireSuperadmin, createCommunity);

// A partir de aquí se opera sobre una comunidad concreta.
router.use('/:communityId', loadCommunity);

router.get('/:communityId', getCommunity);
router.patch('/:communityId', requireManage, updateCommunity);
router.delete('/:communityId', deleteCommunity);

// Vecinos / membresías.
router.get('/:communityId/members', listMembers);
router.patch('/:communityId/members/:membershipId', requireManage, updateMember);
router.delete('/:communityId/members/:membershipId', requireManage, removeMember);

// Invitaciones.
router.get('/:communityId/invitations', requireManage, listInvitations);
router.post('/:communityId/invitations', requireManage, createInvitation);
router.delete('/:communityId/invitations/:invitationId', requireManage, revokeInvitation);

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
