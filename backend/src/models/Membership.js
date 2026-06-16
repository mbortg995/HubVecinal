import mongoose from 'mongoose';

// Relación usuario ↔ comunidad. El rol vive AQUÍ (no en el usuario),
// de modo que una persona puede tener distintos roles en distintas comunidades.
const membershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    // Rol dentro de esa comunidad:
    //  - 'admin'     : administrador de fincas asignado a la comunidad.
    //  - 'president' : presidente (un propietario que preside la comunidad).
    //  - 'owner'     : propietario (acceso de solo lectura).
    role: {
      type: String,
      enum: ['admin', 'president', 'owner'],
      required: true,
    },
    // Vivienda concreta dentro de la comunidad, p.ej. "3ºB".
    unit: { type: String, trim: true, default: '' },
    // Coeficiente de participación (% de la vivienda). Base del reparto de
    // cuotas y del peso de voto en las juntas.
    coefficient: { type: Number, default: 0, min: 0 },
    // ¿Reside en la vivienda? (un propietario puede tenerla alquilada).
    isResident: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Un usuario solo puede tener una membresía por comunidad.
membershipSchema.index({ user: 1, community: 1 }, { unique: true });

export default mongoose.model('Membership', membershipSchema);
