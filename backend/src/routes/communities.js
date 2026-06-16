import { Router } from 'express';
import { requireAuth, requireSuperadmin } from '../middleware/auth.js';
import { loadCommunity, requireManage } from '../middleware/community.js';
import { upload } from '../middleware/upload.js';
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
  resendInvitation,
} from '../controllers/invitationController.js';
import {
  listMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  sendConvocatoria,
  getMeeting,
  setAttendance,
  updateAgendaPoint,
  castVote,
  uploadActa,
  deleteActa,
} from '../controllers/meetingController.js';
import { listTopics, createTopic, updateTopic, deleteTopic } from '../controllers/topicController.js';
import {
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
} from '../controllers/documentController.js';
import {
  listIncidents,
  createIncident,
  updateIncident,
  addComment,
  downloadPhoto,
  deleteIncident,
} from '../controllers/incidentController.js';
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';
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
router.post('/:communityId/invitations/:invitationId/resend', requireManage, resendInvitation);
router.delete('/:communityId/invitations/:invitationId', requireManage, revokeInvitation);

// Juntas vecinales.
router.get('/:communityId/meetings', listMeetings);
router.get('/:communityId/meetings/:meetingId', getMeeting);
router.post('/:communityId/meetings', requireManage, createMeeting);
router.patch('/:communityId/meetings/:meetingId', requireManage, updateMeeting);
router.post('/:communityId/meetings/:meetingId/convocatoria', requireManage, sendConvocatoria);
router.put('/:communityId/meetings/:meetingId/attendance', requireManage, setAttendance);
router.patch('/:communityId/meetings/:meetingId/agenda/:pointId', requireManage, updateAgendaPoint);
router.post('/:communityId/meetings/:meetingId/agenda/:pointId/vote', castVote);
router.post('/:communityId/meetings/:meetingId/acta', requireManage, upload.single('file'), uploadActa);
router.delete('/:communityId/meetings/:meetingId/acta', requireManage, deleteActa);
router.delete('/:communityId/meetings/:meetingId', requireManage, deleteMeeting);

// Temas.
router.get('/:communityId/topics', listTopics);
router.post('/:communityId/topics', requireManage, createTopic);
router.patch('/:communityId/topics/:topicId', requireManage, updateTopic);
router.delete('/:communityId/topics/:topicId', requireManage, deleteTopic);

// Avisos / tablón.
router.get('/:communityId/announcements', listAnnouncements);
router.post('/:communityId/announcements', requireManage, createAnnouncement);
router.patch('/:communityId/announcements/:announcementId', requireManage, updateAnnouncement);
router.delete('/:communityId/announcements/:announcementId', requireManage, deleteAnnouncement);

// Documentos.
router.get('/:communityId/documents', listDocuments);
router.post('/:communityId/documents', requireManage, upload.single('file'), uploadDocument);
router.get('/:communityId/documents/:documentId/download', downloadDocument);
router.delete('/:communityId/documents/:documentId', requireManage, deleteDocument);

// Incidencias (cualquier miembro reporta y comenta; gestores cambian estado/asignan).
router.get('/:communityId/incidents', listIncidents);
router.post('/:communityId/incidents', upload.array('photos', 5), createIncident);
router.patch('/:communityId/incidents/:incidentId', requireManage, updateIncident);
router.post('/:communityId/incidents/:incidentId/comments', addComment);
router.get('/:communityId/incidents/:incidentId/photos/:index/download', downloadPhoto);
router.delete('/:communityId/incidents/:incidentId', requireManage, deleteIncident);

// Arcas comunes (movimientos).
router.get('/:communityId/transactions', listTransactions);
router.post('/:communityId/transactions', requireManage, createTransaction);
router.delete('/:communityId/transactions/:transactionId', requireManage, deleteTransaction);

export default router;
