const express = require('express');
const { body, validationResult } = require('express-validator');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');
const { auth, authorize, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get all permissions
router.get('/permissions', auth, authorize('admin'), async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ category: 1, name: 1 });
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create permission
router.post('/permissions', [
  auth,
  authorize('admin'),
  body('name').notEmpty().withMessage('Permission name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('action').notEmpty().withMessage('Action is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category, action } = req.body;
    
    const existingPermission = await Permission.findOne({ name });
    if (existingPermission) {
      return res.status(400).json({ message: 'Permission already exists' });
    }

    const permission = new Permission({ name, description, category, action });
    await permission.save();
    
    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all roles
router.get('/roles', auth, authorize('admin'), async (req, res) => {
  try {
    const roles = await Role.find().populate('permissions');
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create role
router.post('/roles', [
  auth,
  authorize('admin'),
  body('name').notEmpty().withMessage('Role name is required'),
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, permissions, isDefault } = req.body;
    
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    const role = new Role({ name, description, permissions: permissions || [], isDefault });
    await role.save();
    
    const populatedRole = await Role.findById(role._id).populate('permissions');
    res.status(201).json(populatedRole);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update role permissions
router.put('/roles/:id/permissions', [
  auth,
  authorize('admin'),
  body('permissions').isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { permissions } = req.body;
    
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { permissions },
      { new: true }
    ).populate('permissions');
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign role to user
router.put('/users/:id/role', [
  auth,
  authorize('admin'),
  body('roleId').notEmpty().withMessage('Role ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roleId } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { roleId },
      { new: true }
    ).populate('roleId').populate('customPermissions').populate('deniedPermissions');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign custom permissions to user
router.put('/users/:id/permissions', [
  auth,
  authorize('admin'),
  body('customPermissions').isArray().withMessage('Custom permissions must be an array'),
  body('deniedPermissions').isArray().withMessage('Denied permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customPermissions, deniedPermissions } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { customPermissions, deniedPermissions },
      { new: true }
    ).populate('roleId').populate('customPermissions').populate('deniedPermissions');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user permissions (combined from role and custom)
router.get('/users/:id/permissions', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('roleId')
      .populate('customPermissions')
      .populate('deniedPermissions');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let allPermissions = [];
    
    // Get role permissions
    if (user.roleId) {
      const role = await Role.findById(user.roleId).populate('permissions');
      if (role) {
        allPermissions = [...role.permissions];
      }
    }
    
    // Add custom permissions
    if (user.customPermissions) {
      allPermissions = [...allPermissions, ...user.customPermissions];
    }
    
    // Remove denied permissions
    if (user.deniedPermissions) {
      const deniedIds = user.deniedPermissions.map(p => p._id.toString());
      allPermissions = allPermissions.filter(p => !deniedIds.includes(p._id.toString()));
    }
    
    // Remove duplicates
    const uniquePermissions = allPermissions.filter((permission, index, self) => 
      index === self.findIndex(p => p._id.toString() === permission._id.toString())
    );
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleId: user.roleId
      },
      permissions: uniquePermissions,
      customPermissions: user.customPermissions,
      deniedPermissions: user.deniedPermissions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;