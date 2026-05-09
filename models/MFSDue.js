const mongoose = require('mongoose');

const mfsDueSchema = new mongoose.Schema({
  mfsAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MFSAccount',
    required: function() {
      return this.paymentMethod === 'mfs_account';
    }
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MFSCustomer'
  },
  transactionType: {
    type: String,
    enum: ['cash_in', 'cash_out', 'send_money', 'receive_money', 'payment', 'b2b_give_cash', 'b2b_receive_cash', 'mobile_recharge', 'load'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  customerName: { type: String },
  customerPhone: { type: String },
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
    paymentMethod: { type: String, enum: ['handcash', 'mfs_account'], default: 'handcash' }
  }],
  paymentMethod: { type: String, enum: ['handcash', 'mfs_account'], default: 'mfs_account' }
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
