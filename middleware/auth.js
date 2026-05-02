const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = { auth, authorize, restrictSensitiveActions, teacherViewOnly };