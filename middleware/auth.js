const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

// In-memory permission cache per request (attached to req)
const resolveUserPermissions = async (user) => {
  if (!user) return { permissions: [], permissionNames: new Set(), rolePermissions: [], customPermissions: [], deniedPermissions: [] };

  const deniedIds = new Set((user.deniedPermissions || []).map(p => p._id?.toString?.() || p.toString()));

  let rolePerms = [];
  if (user.roleId) {
    const role = await Role.findById(user.roleId).populate('permissions');
    if (role && role.isActive !== false) {
      rolePerms = role.permissions || [];
    }
  }

  // Start with role permissions
  let all = [...rolePerms];

  // Add custom permissions (already populated from auth middleware)
  const customPerms = (user.customPermissions || []).filter(p => p && p._id);
  all = [...all, ...customPerms];

  // Remove denied
  if (deniedIds.size > 0) {
    all = all.filter(p => !deniedIds.has(p._id.toString()));
  }

  // Deduplicate by _id
  const seen = new Set();
  const unique = [];
  for (const p of all) {
    const id = p._id.toString();
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(p);
    }
  }

  const names = new Set(unique.map(p => p.name));
  return {
    permissions: unique,
    permissionNames: names,
    rolePermissions: rolePerms,
    customPermissions: user.customPermissions || [],
    deniedPermissions: user.deniedPermissions || []
  };
};

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

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Resolve and cache effective permissions on the request
    const resolved = await resolveUserPermissions(user);
    req.user = user;
    req.userPermissions = resolved;

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

// Check if user has a specific permission using cached data
const hasPermission = (req, permissionName) => {
  if (req.user?.role === 'admin') return true;
  return req.userPermissions?.permissionNames?.has(permissionName) || false;
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
    const hasAny = permissionNames.some(name => req.userPermissions?.permissionNames?.has(name));
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
    const hasAll = permissionNames.every(name => req.userPermissions?.permissionNames?.has(name));
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
  hasPermission // exported for use in route handlers if needed
};