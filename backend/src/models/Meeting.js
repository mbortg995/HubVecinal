import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    location: { type: String, trim: true, default: '' },
    // 'upcoming': próxima junta. 'held': junta ya celebrada.
    status: {
      type: String,
      enum: ['upcoming', 'held'],
      default: 'upcoming',
    },
    // Acta / notas de la junta.
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Meeting', meetingSchema);
