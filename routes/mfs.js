const express = require('express');
const MFSAccount = require('../models/MFSAccount');
const MFSTransaction = require('../models/MFSTransaction');
const MFSDue = require('../models/MFSDue');
const MFSCustomer = require('../models/MFSCustomer');
const HandCash = require('../models/HandCash');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// ============ HAND CASH ============

router.get('/handcash', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    let handCash = await HandCash.findOne();
    if (!handCash) {
      handCash = new HandCash({ amount: 0 });
      await handCash.save();
    }
    res.json({ amount: handCash.amount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/handcash', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { amount } = req.body;
    let handCash = await HandCash.findOne();
    if (!handCash) {
      handCash = new HandCash({ amount, lastUpdatedBy: req.user.id });
    } else {
      handCash.amount = amount;
      handCash.lastUpdatedBy = req.user.id;
    }
    await handCash.save();
    res.json({ amount: handCash.amount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ MFS ACCOUNTS ============

router.get('/accounts', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const accounts = await MFSAccount.find().sort({ provider: 1, accountType: 1 });
    res.json(accounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/accounts', auth, authorize('admin'), async (req, res) => {
  try {
    // Check for duplicate provider + account number combination
    const existingAccount = await MFSAccount.findOne({
      provider: req.body.provider,
      accountNumber: req.body.accountNumber
    });
    
    if (existingAccount) {
      return res.status(400).json({ 
        message: `An account with this number already exists for ${req.body.provider}` 
      });
    }

    const account = new MFSAccount(req.body);
    await account.save();
    res.status(201).json(account);
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Account with this provider and number already exists' 
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/accounts/:id', auth, authorize('admin'), async (req, res) => {
  try {
    // Check for duplicate provider + account number combination (excluding current account)
    const existingAccount = await MFSAccount.findOne({
      _id: { $ne: req.params.id },
      provider: req.body.provider,
      accountNumber: req.body.accountNumber
    });
    
    if (existingAccount) {
      return res.status(400).json({ 
        message: `Another account with this number already exists for ${req.body.provider}` 
      });
    }

    const account = await MFSAccount.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json(account);
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Account with this provider and number already exists' 
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/accounts/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const account = await MFSAccount.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ MFS TRANSACTIONS ============

router.get('/transactions', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { type, provider, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    let query = {};
    if (type) query.transactionType = type;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await MFSTransaction.find(query)
      .populate('mfsAccount', 'provider accountType accountNumber accountName')
      .populate('handledBy', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    let filteredTransactions = transactions;
    if (provider) {
      filteredTransactions = transactions.filter(t => t.mfsAccount.provider === provider);
    }
    res.json(filteredTransactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/transactions', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { mfsAccount: accountId, amount, transactionType, isDue = false } = req.body;
    const account = await MFSAccount.findById(accountId);
    if (!account) return res.status(404).json({ message: 'MFS Account not found' });
    if (!account.isActive) return res.status(400).json({ message: 'Account is inactive' });

    if (isDue) {
      // Handle due transaction - redirect to due creation
      return res.status(400).json({ message: 'Use /dues endpoint for due transactions' });
    }

    const transaction = new MFSTransaction({
      ...req.body,
      handledBy: req.user.id,
      balanceBefore: account.balance,
      commission: 0
    });

    // Update account balance and hand cash
    let handCash = await HandCash.findOne();
    if (!handCash) {
      handCash = new HandCash({ amount: 0 });
      await handCash.save();
    }

    if (transactionType === 'cash_out') {
      account.balance += amount;
      handCash.amount -= amount;
    } else if (['cash_in', 'b2b', 'send_money', 'payment'].includes(transactionType)) {
      if (account.balance < amount) return res.status(400).json({ message: 'Insufficient account balance' });
      account.balance -= amount;
      handCash.amount += amount;
    } else if (transactionType === 'receive_money') {
      account.balance += amount;
      handCash.amount -= amount;
    }

    if (handCash.amount < 0) {
      return res.status(400).json({ message: 'Insufficient hand cash' });
    }

    transaction.balanceAfter = account.balance;
    await transaction.save();
    await account.save();
    await handCash.save();

    await transaction.populate([
      { path: 'mfsAccount', select: 'provider accountType accountNumber accountName' },
      { path: 'handledBy', select: 'name' }
    ]);

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ MFS CUSTOMERS ============

// Get all customers
router.get('/customers', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await MFSCustomer.find(query)
      .sort({ currentDue: -1, trustScore: 1 });

    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer by phone
router.get('/customers/phone/:phone', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const customer = await MFSCustomer.findOne({ phone: req.params.phone });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Get customer's due history
    const dues = await MFSDue.find({ customer: customer._id })
      .populate('mfsAccount', 'provider accountNumber')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ customer, dues });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer by ID
router.get('/customers/:id', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const customer = await MFSCustomer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Get customer's due history
    const dues = await MFSDue.find({ customer: customer._id })
      .populate('mfsAccount', 'provider accountNumber')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ customer, dues });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update customer
router.post('/customers', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    // Create new customer
    const customer = new MFSCustomer({
      ...req.body,
      createdBy: req.user.id
    });
    await customer.save();

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update customer
router.put('/customers/:id', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const customer = await MFSCustomer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete customer
router.delete('/customers/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const customer = await MFSCustomer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    // Check if customer has pending dues
    const pendingDues = await MFSDue.countDocuments({ 
      customer: req.params.id, 
      status: { $in: ['pending', 'partial'] } 
    });
    
    if (pendingDues > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete customer with pending dues' 
      });
    }
    
    await MFSCustomer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update customer credit limit
router.put('/customers/:id/credit-limit', auth, authorize('admin'), async (req, res) => {
  try {
    const { creditLimit } = req.body;
    const customer = await MFSCustomer.findById(req.params.id);
    
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    customer.creditLimit = creditLimit;
    await customer.save();
    
    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Block/Unblock customer
router.put('/customers/:id/status', auth, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const customer = await MFSCustomer.findById(req.params.id);
    
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    customer.status = status;
    await customer.save();
    
    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ MFS DUES ============

// Get all dues
router.get('/dues', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { status, provider, startDate, endDate } = req.query;
    let query = {};
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let dues = await MFSDue.find(query)
      .populate('mfsAccount', 'provider accountType accountNumber accountName')
      .populate('customer', 'name phone creditLimit currentDue trustScore status')
      .populate('handledBy', 'name')
      .populate('payments.collectedBy', 'name')
      .sort({ createdAt: -1 });

    if (provider) {
      dues = dues.filter(d => d.mfsAccount?.provider === provider);
    }

    res.json(dues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a due transaction (account balance decreases, hand cash does NOT increase)
router.post('/dues', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { mfsAccount: accountId, amount, transactionType, customerId, notes, dueDate } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer is required for due transactions' });
    }

    const account = await MFSAccount.findById(accountId);
    if (!account) return res.status(404).json({ message: 'MFS Account not found' });
    if (!account.isActive) return res.status(400).json({ message: 'Account is inactive' });

    // Get customer
    const customer = await MFSCustomer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Check if customer can take more due
    const canTakeDue = customer.canTakeDue(amount);
    if (!canTakeDue.allowed) {
      return res.status(400).json({ message: canTakeDue.reason });
    }

    // For due transactions where account balance decreases (cash_in, send_money, payment, b2b)
    const balanceDecreasesTypes = ['cash_in', 'send_money', 'payment', 'b2b'];
    if (balanceDecreasesTypes.includes(transactionType)) {
      if (account.balance < amount) return res.status(400).json({ message: 'Insufficient account balance' });
      account.balance -= amount;
      await account.save();
    }

    const due = new MFSDue({
      mfsAccount: accountId,
      customer: customer._id,
      transactionType,
      amount,
      customerName: customer.name,
      customerPhone: customer.phone || '',
      notes,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      handledBy: req.user.id
    });

    await due.save();

    // Update customer statistics
    customer.currentDue += amount;
    customer.totalDueAmount += amount;
    customer.totalTransactions += 1;
    customer.lastTransactionDate = new Date();
    await customer.save();

    await due.populate([
      { path: 'mfsAccount', select: 'provider accountType accountNumber accountName' },
      { path: 'customer', select: 'name phone creditLimit currentDue trustScore status' },
      { path: 'handledBy', select: 'name' }
    ]);

    res.status(201).json(due);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Collect payment for a due
router.post('/dues/:id/collect', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { amount, notes } = req.body;
    const due = await MFSDue.findById(req.params.id).populate('customer');
    if (!due) return res.status(404).json({ message: 'Due record not found' });
    if (due.status === 'paid') return res.status(400).json({ message: 'Due is already fully paid' });

    const remaining = due.amount - due.paidAmount;
    if (amount > remaining) return res.status(400).json({ message: `Amount exceeds remaining due of ${remaining}` });

    due.paidAmount += amount;
    due.payments.push({ amount, notes, collectedBy: req.user.id });

    const wasFullyPaid = due.paidAmount >= due.amount;
    if (wasFullyPaid) {
      due.status = 'paid';
    } else {
      due.status = 'partial';
    }

    // When customer pays due, hand cash increases
    let handCash = await HandCash.findOne();
    if (!handCash) {
      handCash = new HandCash({ amount: 0 });
    }
    handCash.amount += amount;
    handCash.lastUpdatedBy = req.user.id;
    await handCash.save();

    await due.save();

    // Update customer statistics
    if (due.customer) {
      const customer = await MFSCustomer.findById(due.customer._id);
      if (customer) {
        customer.currentDue -= amount;
        customer.totalPaidAmount += amount;
        customer.lastPaymentDate = new Date();
        
        // Track payment timeliness
        if (due.dueDate && new Date() <= due.dueDate) {
          customer.onTimePayments += 1;
        } else if (due.dueDate) {
          customer.latePayments += 1;
        }
        
        // Update trust score
        customer.updateTrustScore();
        
        // Auto-adjust status based on trust score
        if (customer.trustScore < 30) {
          customer.status = 'warning';
        } else if (customer.trustScore >= 70 && customer.currentDue === 0) {
          customer.status = 'active';
        }
        
        await customer.save();
      }
    }

    await due.populate([
      { path: 'mfsAccount', select: 'provider accountType accountNumber accountName' },
      { path: 'customer', select: 'name phone creditLimit currentDue trustScore status' },
      { path: 'handledBy', select: 'name' },
      { path: 'payments.collectedBy', select: 'name' }
    ]);

    res.json(due);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ STATS ============

router.get('/stats', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await MFSTransaction.aggregate([
      { $match: { createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' } },
      { $group: { _id: '$transactionType', count: { $sum: 1 }, totalAmount: { $sum: '$amount' }, totalCommission: { $sum: '$commission' } } }
    ]);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyStats = await MFSTransaction.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: 'completed' } },
      { $group: { _id: '$transactionType', count: { $sum: 1 }, totalAmount: { $sum: '$amount' }, totalCommission: { $sum: '$commission' } } }
    ]);

    const accounts = await MFSAccount.find({ isActive: true }, 'provider accountType balance');

    const dueStats = await MFSDue.aggregate([
      { $match: { status: { $in: ['pending', 'partial'] } } },
      { $group: { _id: null, totalDue: { $sum: { $subtract: ['$amount', '$paidAmount'] } }, count: { $sum: 1 } } }
    ]);

    res.json({ todayStats, monthlyStats, accounts, dueStats: dueStats[0] || { totalDue: 0, count: 0 } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
