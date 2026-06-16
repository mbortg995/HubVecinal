import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    // Datos de contacto/identificación (opcionales). Sin IBAN: no hay SEPA.
    nif: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    // Rol a nivel de plataforma:
    //  - 'superadmin': pertenece a una organización (administradora) y gestiona
    //                  TODAS las comunidades de esa organización.
    //  - 'member'    : usuario normal; sus permisos provienen de sus membresías
    //                  por comunidad (ver modelo Membership).
    platformRole: {
      type: String,
      enum: ['superadmin', 'member'],
      default: 'member',
    },
    // Organización a la que pertenece (solo para superadmins / personal de la administradora).
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
