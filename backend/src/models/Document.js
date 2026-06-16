import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    // Categoría para organizar el repositorio.
    category: {
      type: String,
      enum: ['acta', 'contrato', 'seguro', 'circular', 'factura', 'otro'],
      default: 'otro',
    },
    // Datos del fichero almacenado.
    filename: { type: String, required: true },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Document', documentSchema);
