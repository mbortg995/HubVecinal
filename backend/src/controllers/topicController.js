import Topic from '../models/Topic.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/communities/:communityId/topics
export const listTopics = asyncHandler(async (req, res) => {
  const filter = { community: req.community._id };
  if (req.query.status === 'pending' || req.query.status === 'resolved') {
    filter.status = req.query.status;
  }
  const topics = await Topic.find(filter)
    .populate('meeting', 'title date')
    .sort({ createdAt: -1 });
  res.json({ topics });
});

// POST /api/communities/:communityId/topics
export const createTopic = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'El título del tema es obligatorio' });
  }
  const topic = await Topic.create({
    community: req.community._id,
    title,
    description: description || '',
    createdBy: req.user._id,
  });
  res.status(201).json({ topic });
});

// PATCH /api/communities/:communityId/topics/:topicId
export const updateTopic = asyncHandler(async (req, res) => {
  const topic = await Topic.findOne({
    _id: req.params.topicId,
    community: req.community._id,
  });
  if (!topic) {
    return res.status(404).json({ message: 'Tema no encontrado' });
  }
  const { title, description, status, resolution, meeting } = req.body;
  if (title !== undefined) topic.title = title;
  if (description !== undefined) topic.description = description;
  if (status !== undefined) topic.status = status === 'resolved' ? 'resolved' : 'pending';
  if (resolution !== undefined) topic.resolution = resolution;
  if (meeting !== undefined) topic.meeting = meeting || null;
  await topic.save();
  res.json({ topic });
});

// DELETE /api/communities/:communityId/topics/:topicId
export const deleteTopic = asyncHandler(async (req, res) => {
  const topic = await Topic.findOneAndDelete({
    _id: req.params.topicId,
    community: req.community._id,
  });
  if (!topic) {
    return res.status(404).json({ message: 'Tema no encontrado' });
  }
  res.json({ message: 'Tema eliminado' });
});
