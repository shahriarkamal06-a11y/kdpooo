const mongoose = require('mongoose');

const mfsCustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    required: false
  },
  email: {
    type: String,
    trim: true
  },
  address: String,
  nid: String,
  
  // Credit management
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
mfsCustomerSchema.index({ phone: 1 }, { sparse: true }); // sparse so null phones don't conflict
mfsCustomerSchema.index({ name: 1 });
mfsCustomerSchema.index({ status: 1 });



// Method to check if customer can take more due
mfsCustomerSchema.methods.canTakeDue = function(amount) {
  if (this.status === 'blocked') {
    return { allowed: false, reason: 'Customer is blocked' };
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
  } else if (this.currentDue > 0) {
    // Basic adjustment if they have due without credit limit check
    adjustment = -10;
  }
  
  this.trustScore = Math.max(0, Math.min(100, baseScore + adjustment));
};

module.exports = mongoose.model('MFSCustomer', mfsCustomerSchema);
