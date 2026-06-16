import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    // Aviso fijado arriba en el tablón.
    pinned: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Announcement', announcementSchema);
