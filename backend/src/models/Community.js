import mongoose from 'mongoose';
import crypto from 'crypto';

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    // Código que comparte el presidente para que los propietarios se unan.
    joinCode: {
      type: String,
      unique: true,
      index: true,
      default: () => crypto.randomBytes(4).toString('hex').toUpperCase(),
    },
    // Propietario que ejerce de presidente (creador de la comunidad).
    president: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Administrador de fincas asignado (cuenta con role 'admin'). Opcional.
    administrator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Community', communitySchema);
