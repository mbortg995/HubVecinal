import mongoose from 'mongoose';

// Una organización = una administradora de fincas (el "tenant" del SaaS).
// Cada comunidad pertenece a una organización y los datos quedan aislados entre ellas.
const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Datos de contacto opcionales de la administradora.
    contactEmail: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
