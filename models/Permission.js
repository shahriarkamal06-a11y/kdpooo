const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['users', 'attendance', 'courses', 'batches', 'notices', 'services', 'transactions', 'mfs', 'reports', 'settings', 'system']
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'manage']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Permission', permissionSchema);