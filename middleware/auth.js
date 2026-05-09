const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Simple permission check using grantedPermissions array of strings
const hasPermission = (req, permissionName) => {
  if (req.user?.role === 'admin') return true;
  return req.user?.grantedPermissions?.includes(permissionName) || false;
};

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Legacy role-based authorization (kept for backward compatibility)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied - insufficient role' });
    }
    next();
  };
};

// Middleware: require a single permission
const requirePermission = (permissionName) => {
  return (req, res, next) => {
    if (!hasPermission(req, permissionName)) {
      return res.status(403).json({ message: `Access denied - requires permission: ${permissionName}` });
    }
    next();
  };
};

// Middleware: require any of the listed permissions
const requireAnyPermission = (...permissionNames) => {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    const hasAny = permissionNames.some(name => req.user?.grantedPermissions?.includes(name));
    if (!hasAny) {
      return res.status(403).json({ message: `Access denied - requires one of: ${permissionNames.join(', ')}` });
    }
    next();
  };
};

// Middleware: require all of the listed permissions
const requireAllPermissions = (...permissionNames) => {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    const hasAll = permissionNames.every(name => req.user?.grantedPermissions?.includes(name));
    if (!hasAll) {
      return res.status(403).json({ message: `Access denied - requires all of: ${permissionNames.join(', ')}` });
    }
    next();
  };
};

// Middleware: check ownership or admin/staff permission for resource access
const requireOwnershipOrPermission = (permissionName, idParam = 'id') => {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    if (req.user?._id?.toString() === req.params[idParam]) return next();
    if (hasPermission(req, permissionName)) return next();
    return res.status(403).json({ message: 'Access denied - not owner or insufficient permissions' });
  };
};

module.exports = {
  auth,
  authorize,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireOwnershipOrPermission,
  hasPermission
};