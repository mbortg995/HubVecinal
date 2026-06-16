import mongoose from 'mongoose';
import crypto from 'crypto';

// Invitación a unirse a una comunidad con un rol concreto.
// El invitado abre el enlace con el token y completa (o ya tiene) su cuenta.
const invitationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'president', 'owner'], default: 'owner' },
    unit: { type: String, trim: true, default: '' },
    coefficient: { type: Number, default: 0, min: 0 },
    isResident: { type: Boolean, default: true },
    occupantType: { type: String, enum: ['owner', 'tenant'], default: 'owner' },
    token: {
      type: String,
      unique: true,
      index: true,
      default: () => crypto.randomBytes(24).toString('hex'),
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked'],
      default: 'pending',
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días
    },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Invitation', invitationSchema);
