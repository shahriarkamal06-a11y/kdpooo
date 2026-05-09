const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('nameEnglish').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('mobile').notEmpty().withMessage('Mobile number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('permanentAddress').notEmpty().withMessage('Address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, nameEnglish, nameBangla, fatherName, motherName, email, phone, mobile, guardianPhone, guardianMobile, photoUrl, photoPublicId, password, role, address, permanentAddress, presentAddress, dateOfBirth, gender, nidOrBirth, education } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate IDs
    let studentId, employeeId;
    if (role === 'student') {
      const lastStudent = await User.findOne({ role: 'student' }).sort({ createdAt: -1 });
      const lastId = lastStudent?.studentId ? parseInt(lastStudent.studentId.slice(2)) : 0;
      studentId = `ST${(lastId + 1).toString().padStart(4, '0')}`;
    } else if (['teacher', 'staff', 'admin'].includes(role)) {
      const lastEmployee = await User.findOne({ role: { $in: ['teacher', 'staff', 'admin'] } }).sort({ createdAt: -1 });
      const lastId = lastEmployee?.employeeId ? parseInt(lastEmployee.employeeId.slice(2)) : 0;
      employeeId = `EM${(lastId + 1).toString().padStart(4, '0')}`;
    }

    // Create user
    user = new User({
      name: nameEnglish || name,
      nameEnglish: nameEnglish || name,
      nameBangla,
      fatherName,
      motherName,
      email,
      phone: mobile || phone,
      mobile: mobile || phone,
      guardianPhone: guardianMobile || guardianPhone,
      guardianMobile: guardianMobile || guardianPhone,
      photoUrl,
      photoPublicId,
      password,
      role: role || 'student',
      address: permanentAddress || address,
      permanentAddress: permanentAddress || address,
      presentAddress: presentAddress || address,
      dateOfBirth,
      gender,
      nidOrBirth,
      education,
      studentId,
      employeeId
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        nameEnglish: user.nameEnglish,
        nameBangla: user.nameBangla,
        email: user.email,
        phone: user.phone,
        mobile: user.mobile,
        photoUrl: user.photoUrl,
        role: user.role,
        roleId: user.roleId,
        grantedPermissions: user.grantedPermissions || [],
        studentId: user.studentId,
        employeeId: user.employeeId,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        permanentAddress: user.permanentAddress,
        presentAddress: user.presentAddress,
        guardianMobile: user.guardianMobile,
        nidOrBirth: user.nidOrBirth
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).populate('batch', 'name');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        nameEnglish: user.nameEnglish,
        nameBangla: user.nameBangla,
        email: user.email,
        phone: user.phone,
        mobile: user.mobile,
        photoUrl: user.photoUrl,
        role: user.role,
        roleId: user.roleId,
        grantedPermissions: user.grantedPermissions || [],
        studentId: user.studentId,
        employeeId: user.employeeId,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        permanentAddress: user.permanentAddress,
        presentAddress: user.presentAddress,
        guardianMobile: user.guardianMobile,
        nidOrBirth: user.nidOrBirth,
        batch: user.batch
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('batch', 'name')
      .populate('courses', 'name');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/update-profile
// @desc    Update user profile (email, password, basic info)
// @access  Private
router.put('/update-profile', [
  auth,
  body('email').optional().isEmail().withMessage('Please include a valid email'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('currentPassword').if(body('password').exists()).notEmpty().withMessage('Current password is required to change password')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, currentPassword, name, nameEnglish, nameBangla, phone, mobile, address, permanentAddress, presentAddress } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If updating password, verify current password
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      user.password = password;
    }

    // If updating email, check if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      user.email = email;
    }

    // Update other fields if provided
    if (name) user.name = name;
    if (nameEnglish) user.nameEnglish = nameEnglish;
    if (nameBangla) user.nameBangla = nameBangla;
    if (phone) user.phone = phone;
    if (mobile) user.mobile = mobile;
    if (address) user.address = address;
    if (permanentAddress) user.permanentAddress = permanentAddress;
    if (presentAddress) user.presentAddress = presentAddress;

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(userId)
      .select('-password')
      .populate('batch', 'name')
      .populate('courses', 'name');

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
