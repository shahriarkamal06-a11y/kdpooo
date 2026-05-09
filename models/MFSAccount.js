const mongoose = require('mongoose');

const mfsAccountSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['bkash', 'nagad', 'rocket', 'upay', 'cellfin', 'mcash', 'handcash', 'grameenphone', 'banglalink', 'robi', 'airtel', 'teletalk'],
    required: true
  },
  accountType: {
    type: String,
    enum: ['personal', 'agent', 'merchant', 'flexiload'],
    required: true
  },
  accountNumber: {
    type: String,
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  commission: {
    cashIn: {
      type: Number,
      default: 0
    },
    cashOut: {
      type: Number,
      default: 0
    }
  },
  limits: {
    dailyLimit: {
      type: Number,
      default: 100000
    },
    perTransactionLimit: {
      type: Number,
      default: 25000
    }
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('MFSAccount', mfsAccountSchema);