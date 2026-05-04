const express = require('express');
const MFSAccount = require('../models/MFSAccount');
const MFSTransaction = require('../models/MFSTransaction');
const MFSDue = require('../models/MFSDue');
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

// ============ MFS DUES ============

// Get all dues
router.get('/dues', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { status, provider, startDate, endDate } = req.query;
    let query = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let dues = await MFSDue.find(query)
      .populate('mfsAccount', 'provider accountType accountNumber accountName')
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
    const { mfsAccount: accountId, amount, transactionType, customerName, customerPhone, notes } = req.body;

    const account = await MFSAccount.findById(accountId);
    if (!account) return res.status(404).json({ message: 'MFS Account not found' });
    if (!account.isActive) return res.status(400).json({ message: 'Account is inactive' });

    // For due transactions where account balance decreases (cash_in, send_money, payment, b2b)
    const balanceDecreasesTypes = ['cash_in', 'send_money', 'payment', 'b2b'];
    if (balanceDecreasesTypes.includes(transactionType)) {
      if (account.balance < amount) return res.status(400).json({ message: 'Insufficient account balance' });
      account.balance -= amount;
      await account.save();
    }
    // For cash_out/receive_money on due: customer owes us cash, account balance does NOT change yet

    const due = new MFSDue({
      mfsAccount: accountId,
      transactionType,
      amount,
      customerName,
      customerPhone,
      notes,
      handledBy: req.user.id
    });

    await due.save();
    await due.populate([
      { path: 'mfsAccount', select: 'provider accountType accountNumber accountName' },
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
    const due = await MFSDue.findById(req.params.id);
    if (!due) return res.status(404).json({ message: 'Due record not found' });
    if (due.status === 'paid') return res.status(400).json({ message: 'Due is already fully paid' });

    const remaining = due.amount - due.paidAmount;
    if (amount > remaining) return res.status(400).json({ message: `Amount exceeds remaining due of ${remaining}` });

    due.paidAmount += amount;
    due.payments.push({ amount, notes, collectedBy: req.user.id });

    if (due.paidAmount >= due.amount) {
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
    await due.populate([
      { path: 'mfsAccount', select: 'provider accountType accountNumber accountName' },
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
