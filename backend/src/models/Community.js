import mongoose from 'mongoose';

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    // Organización (administradora) a la que pertenece la comunidad.
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// El presidente y los administradores se derivan de las membresías (modelo Membership).

export default mongoose.model('Community', communitySchema);
