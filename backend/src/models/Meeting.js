import mongoose from 'mongoose';

// Punto del orden del día.
const agendaPointSchema = new mongoose.Schema(
  {
    order: { type: Number, default: 0 },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
  },
  { _id: true }
);

const meetingSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    // Segunda convocatoria (opcional). La 1ª es `date`.
    secondCallDate: { type: Date, default: null },
    location: { type: String, trim: true, default: '' },
    // 'upcoming': próxima junta. 'held': junta ya celebrada.
    status: {
      type: String,
      enum: ['upcoming', 'held'],
      default: 'upcoming',
    },
    // Orden del día.
    agenda: [agendaPointSchema],
    // Asistencia: cada entrada es un propietario presente; si proxyTo está
    // relleno, asiste representado por ese otro propietario (delegación de voto).
    attendance: [
      {
        _id: false,
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        proxyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      },
    ],
    // Acta / notas de la junta.
    notes: { type: String, default: '' },
    // Marca de cuándo se envió la convocatoria por email.
    convocatoriaSentAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Meeting', meetingSchema);
