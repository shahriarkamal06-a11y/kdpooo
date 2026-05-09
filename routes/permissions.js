const express = require('express');
const { body, validationResult } = require('express-validator');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');
const { auth, authorize, requirePermission } = require('../middleware/auth');

const router = express.Router();

// ========== PERMISSIONS ==========

// Get all permissions
router.get('/permissions', auth, requirePermission('system.manage'), async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ category: 1, name: 1 });
    res.json(permissions);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create permission
router.post('/permissions', [
  auth,
  requirePermission('system.manage'),
  body('name').trim().notEmpty().withMessage('Permission name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('action').isIn(['create', 'read', 'update', 'delete', 'manage']).withMessage('Invalid action')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category, action } = req.body;

    const existingPermission = await Permission.findOne({ name: name.trim().toLowerCase() });
    if (existingPermission) {
      return res.status(400).json({ message: 'Permission already exists' });
    }

    const permission = new Permission({
      name: name.trim().toLowerCase(),
      description: description.trim(),
      category: category.trim().toLowerCase(),
      action
    });
    await permission.save();

    res.status(201).json(permission);
  } catch (error) {
    console.error('Create permission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update permission
router.put('/permissions/:id', [
  auth,
  requirePermission('system.manage'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('action').optional().isIn(['create', 'read', 'update', 'delete', 'manage']).withMessage('Invalid action')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    if (req.body.description) updates.description = req.body.description.trim();
    if (req.body.category) updates.category = req.body.category.trim().toLowerCase();
    if (req.body.action) updates.action = req.body.action;

    const permission = await Permission.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }

    res.json(permission);
  } catch (error) {
    console.error('Update permission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete permission
router.delete('/permissions/:id', auth, requirePermission('system.manage'), async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }

    // Remove from all roles
    await Role.updateMany(
      { permissions: req.params.id },
      { $pull: { permissions: req.params.id } }
    );

    // Remove from all users
    await User.updateMany(
      { $or: [{ customPermissions: req.params.id }, { deniedPermissions: req.params.id }] },
      { $pull: { customPermissions: req.params.id, deniedPermissions: req.params.id } }
    );

    await Permission.findByIdAndDelete(req.params.id);
    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Delete permission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== ROLES ==========

// Get all roles
router.get('/roles', auth, requirePermission('system.manage'), async (req, res) => {
  try {
    const roles = await Role.find().populate('permissions');
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create role
router.post('/roles', [
  auth,
  requirePermission('system.manage'),
  body('name').trim().notEmpty().withMessage('Role name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, permissions, isDefault } = req.body;

    const existingRole = await Role.findOne({ name: name.trim() });
    if (existingRole) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    const role = new Role({
      name: name.trim(),
      description: description.trim(),
      permissions: permissions || [],
      isDefault: !!isDefault
    });
    await role.save();

    const populatedRole = await Role.findById(role._id).populate('permissions');
    res.status(201).json(populatedRole);
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update role
router.put('/roles/:id', [
  auth,
  requirePermission('system.manage'),
  body('name').optional().trim().notEmpty().withMessage('Role name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    if (req.body.name) updates.name = req.body.name.trim();
    if (req.body.description) updates.description = req.body.description.trim();
    if (Array.isArray(req.body.permissions)) updates.permissions = req.body.permissions;
    if (typeof req.body.isDefault === 'boolean') updates.isDefault = req.body.isDefault;
    if (typeof req.body.isActive === 'boolean') updates.isActive = req.body.isActive;

    const role = await Role.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('permissions');

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json(role);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update role permissions (convenience endpoint)
router.put('/roles/:id/permissions', [
  auth,
  requirePermission('system.manage'),
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
    console.error('Update role permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete role
router.delete('/roles/:id', auth, requirePermission('system.manage'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Cannot delete default roles without reassigning users
    const usersWithRole = await User.countDocuments({ roleId: req.params.id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        message: `Cannot delete role assigned to ${usersWithRole} user(s). Reassign users first.`
      });
    }

    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== USER PERMISSIONS ==========

// Assign role to user
router.put('/users/:id/role', [
  auth,
  requirePermission('system.manage'),
  body('roleId').notEmpty().withMessage('Role ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roleId } = req.body;

    // Validate role exists and is active
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    if (role.isActive === false) {
      return res.status(400).json({ message: 'Cannot assign an inactive role' });
    }

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
    console.error('Assign role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user's granted permissions (simple on/off array of strings)
router.put('/users/:id/permissions', [
  auth,
  requirePermission('system.manage'),
  body('grantedPermissions').isArray().withMessage('grantedPermissions must be an array of strings')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { grantedPermissions } = req.body;

    // Validate that each item is a string
    if (!grantedPermissions.every(p => typeof p === 'string')) {
      return res.status(400).json({ message: 'All permissions must be strings' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { grantedPermissions: grantedPermissions.map(p => p.trim().toLowerCase()) },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      grantedPermissions: user.grantedPermissions
    });
  } catch (error) {
    console.error('Update user permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user's own granted permissions
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      grantedPermissions: req.user.grantedPermissions || []
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a user's granted permissions - admin only
router.get('/users/:id/permissions', auth, requirePermission('system.manage'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email role grantedPermissions');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Also return all available permissions so the UI can build the toggle list
    const allPermissions = await Permission.find().sort({ category: 1, name: 1 });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      grantedPermissions: user.grantedPermissions || [],
      allPermissions
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;