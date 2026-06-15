import Transaction from '../models/Transaction.js';
import { computeBalance } from './communityController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/communities/:communityId/transactions
export const listTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ community: req.community._id }).sort({ date: -1 });
  const funds = await computeBalance(req.community._id);
  res.json({ transactions, funds });
});

// POST /api/communities/:communityId/transactions
export const createTransaction = asyncHandler(async (req, res) => {
  const { type, concept, amount, date } = req.body;
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: 'El tipo debe ser ingreso o gasto' });
  }
  if (!concept || amount == null || Number(amount) < 0) {
    return res.status(400).json({ message: 'Concepto e importe válido son obligatorios' });
  }
  const transaction = await Transaction.create({
    community: req.community._id,
    type,
    concept,
    amount: Number(amount),
    date: date || Date.now(),
    createdBy: req.user._id,
  });
  const funds = await computeBalance(req.community._id);
  res.status(201).json({ transaction, funds });
});

// DELETE /api/communities/:communityId/transactions/:transactionId
export const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({
    _id: req.params.transactionId,
    community: req.community._id,
  });
  if (!transaction) {
    return res.status(404).json({ message: 'Movimiento no encontrado' });
  }
  const funds = await computeBalance(req.community._id);
  res.json({ message: 'Movimiento eliminado', funds });
});
