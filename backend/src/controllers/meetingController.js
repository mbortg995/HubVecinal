import Meeting from '../models/Meeting.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/communities/:communityId/meetings
export const listMeetings = asyncHandler(async (req, res) => {
  const meetings = await Meeting.find({ community: req.community._id }).sort({ date: -1 });
  res.json({ meetings });
});

// POST /api/communities/:communityId/meetings
export const createMeeting = asyncHandler(async (req, res) => {
  const { title, date, location, notes, status } = req.body;
  if (!title || !date) {
    return res.status(400).json({ message: 'Título y fecha son obligatorios' });
  }
  const meeting = await Meeting.create({
    community: req.community._id,
    title,
    date,
    location: location || '',
    notes: notes || '',
    status: status === 'held' ? 'held' : 'upcoming',
    createdBy: req.user._id,
  });
  res.status(201).json({ meeting });
});

// PATCH /api/communities/:communityId/meetings/:meetingId
export const updateMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({
    _id: req.params.meetingId,
    community: req.community._id,
  });
  if (!meeting) {
    return res.status(404).json({ message: 'Junta no encontrada' });
  }
  const { title, date, location, notes, status } = req.body;
  if (title !== undefined) meeting.title = title;
  if (date !== undefined) meeting.date = date;
  if (location !== undefined) meeting.location = location;
  if (notes !== undefined) meeting.notes = notes;
  if (status !== undefined) meeting.status = status === 'held' ? 'held' : 'upcoming';
  await meeting.save();
  res.json({ meeting });
});

// DELETE /api/communities/:communityId/meetings/:meetingId
export const deleteMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOneAndDelete({
    _id: req.params.meetingId,
    community: req.community._id,
  });
  if (!meeting) {
    return res.status(404).json({ message: 'Junta no encontrada' });
  }
  res.json({ message: 'Junta eliminada' });
});
