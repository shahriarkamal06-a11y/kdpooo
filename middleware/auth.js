const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Permission = require('../models/Permission');
const Role = require('../models/Role');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('roleId')
      .populate('customPermissions')
      .populate('deniedPermissions');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

// New permission-based authorization
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Check if permission exists
      const permission = await Permission.findOne({ name: permissionName });
      if (!permission) {
        return res.status(403).json({ message: 'Permission not found' });
      }

      // Check if user has this permission denied explicitly
      if (user.deniedPermissions && user.deniedPermissions.some(p => p._id.toString() === permission._id.toString())) {
        return res.status(403).json({ message: 'Access denied - Permission explicitly denied' });
      }

      // Check custom permissions first
      if (user.customPermissions && user.customPermissions.some(p => p._id.toString() === permission._id.toString())) {
        return next();
      }

      // Check role permissions
      if (user.roleId) {
        const role = await Role.findById(user.roleId).populate('permissions');
        if (role && role.permissions.some(p => p._id.toString() === permission._id.toString())) {
          return next();
        }
      }

      return res.status(403).json({ message: 'Access denied - Insufficient permissions' });
    } catch (error) {
      return res.status(500).json({ message: 'Permission check failed' });
    }
  };
};

const restrictSensitiveActions = (req, res, next) => {
  const sensitiveActions = ['DELETE'];
  const sensitiveRoutes = ['/users/', '/batches/', '/services/', '/notices/'];
  
  if (req.user.role === 'staff' && 
      (sensitiveActions.includes(req.method) || 
       sensitiveRoutes.some(route => req.path.includes(route) && req.method === 'DELETE'))) {
    return res.status(403).json({ message: 'Staff cannot perform sensitive actions' });
  }
  next();
};

const teacherViewOnly = (req, res, next) => {
  if (req.user.role === 'teacher' && !['GET'].includes(req.method)) {
    return res.status(403).json({ message: 'Teachers have view-only access' });
  }
  next();
};

module.exports = { auth, authorize, requirePermission, restrictSensitiveActions, teacherViewOnly };