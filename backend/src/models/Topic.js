import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // 'pending': pendiente de resolver. 'resolved': resuelto.
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending',
    },
    // Junta en la que se trató/resolvió (opcional).
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      default: null,
    },
    // Texto con la resolución adoptada.
    resolution: { type: String, default: '' },
    // Incidencia de origen, si el tema se creó escalando una incidencia.
    sourceIncident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Topic', topicSchema);
