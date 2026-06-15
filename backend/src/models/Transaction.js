import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    // 'income': ingreso a las arcas. 'expense': gasto.
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    concept: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
