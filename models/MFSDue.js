const mongoose = require('mongoose');

const mfsDueSchema = new mongoose.Schema({
  mfsAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MFSAccount',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MFSCustomer'
  },
  transactionType: {
    type: String,
    enum: ['cash_in', 'cash_out', 'send_money', 'receive_money', 'payment', 'b2b'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  paidAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  dueDate: {
    type: Date
  },
  notes: String,
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payments: [{
    amount: Number,
    paidAt: { type: Date, default: Date.now },
    notes: String,
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paymentMethod: { type: String, default: 'cash' }
  }]
}, { timestamps: true });

mfsDueSchema.virtual('dueAmount').get(function () {
  return this.amount - this.paidAmount;
});

// Check if overdue
mfsDueSchema.virtual('isOverdue').get(function () {
  if (this.status === 'paid') return false;
  if (!this.dueDate) return false;
  return new Date() > this.dueDate;
});

module.exports = mongoose.model('MFSDue', mfsDueSchema);
