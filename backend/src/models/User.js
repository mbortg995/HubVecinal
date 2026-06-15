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
    // Rol global de la cuenta:
    //  - 'owner': propietario de una vivienda.
    //  - 'admin': administrador de fincas (cuenta especial).
    role: {
      type: String,
      enum: ['owner', 'admin'],
      default: 'owner',
    },
    // Vínculo del propietario con su comunidad (solo aplica a role 'owner').
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      default: null,
    },
    // Vivienda concreta dentro de la comunidad, p.ej. "3ºB".
    unit: { type: String, trim: true, default: '' },
    // True si este propietario es el presidente de su comunidad.
    isPresident: { type: Boolean, default: false },
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
