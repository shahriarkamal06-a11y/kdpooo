const mongoose = require('mongoose');

const mfsCustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  address: String,
  nid: String,
  
  // Credit management
  creditLimit: {
    type: Number,
    default: 0
  },
  currentDue: {
    type: Number,
    default: 0
  },
  
  // Customer status
  status: {
    type: String,
    enum: ['active', 'blocked', 'warning'],
    default: 'active'
  },
  
  // Trust score (0-100)
  trustScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  
  // Statistics
  totalTransactions: {
    type: Number,
    default: 0
  },
  totalDueAmount: {
    type: Number,
    default: 0
  },
  totalPaidAmount: {
    type: Number,
    default: 0
  },
  onTimePayments: {
    type: Number,
    default: 0
  },
  latePayments: {
    type: Number,
    default: 0
  },
  
  // Last transaction info
  lastTransactionDate: Date,
  lastPaymentDate: Date,
  
  notes: String,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for quick search
mfsCustomerSchema.index({ phone: 1 });
mfsCustomerSchema.index({ name: 1 });
mfsCustomerSchema.index({ status: 1 });

// Virtual for available credit
mfsCustomerSchema.virtual('availableCredit').get(function() {
  return Math.max(0, this.creditLimit - this.currentDue);
});

// Method to check if customer can take more due
mfsCustomerSchema.methods.canTakeDue = function(amount) {
  if (this.status === 'blocked') {
    return { allowed: false, reason: 'Customer is blocked' };
  }
  
  const availableCredit = this.creditLimit - this.currentDue;
  if (amount > availableCredit) {
    return { 
      allowed: false, 
      reason: `Exceeds credit limit. Available: ৳${availableCredit}` 
    };
  }
  
  return { allowed: true };
};

// Method to update trust score
mfsCustomerSchema.methods.updateTrustScore = function() {
  const totalPayments = this.onTimePayments + this.latePayments;
  if (totalPayments === 0) {
    this.trustScore = 50;
    return;
  }
  
  const onTimeRate = this.onTimePayments / totalPayments;
  const baseScore = onTimeRate * 100;
  
  // Adjust based on current due status
  let adjustment = 0;
  if (this.currentDue === 0) {
    adjustment = 10;
  } else if (this.currentDue > this.creditLimit * 0.8) {
    adjustment = -20;
  }
  
  this.trustScore = Math.max(0, Math.min(100, baseScore + adjustment));
};

module.exports = mongoose.model('MFSCustomer', mfsCustomerSchema);
