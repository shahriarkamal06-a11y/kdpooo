const mongoose = require('mongoose');
require('dotenv').config();

const Permission = require('./models/Permission');
const Role = require('./models/Role');
const User = require('./models/User');

const permissions = [
  // User Management
  { name: 'users.create', description: 'Create new users', category: 'users', action: 'create' },
  { name: 'users.read', description: 'View users', category: 'users', action: 'read' },
  { name: 'users.update', description: 'Update user information', category: 'users', action: 'update' },
  { name: 'users.delete', description: 'Delete users', category: 'users', action: 'delete' },
  { name: 'users.manage', description: 'Full user management', category: 'users', action: 'manage' },
  
  // Attendance Management
  { name: 'attendance.create', description: 'Create attendance records', category: 'attendance', action: 'create' },
  { name: 'attendance.read', description: 'View attendance records', category: 'attendance', action: 'read' },
  { name: 'attendance.update', description: 'Update attendance records', category: 'attendance', action: 'update' },
  { name: 'attendance.delete', description: 'Delete attendance records', category: 'attendance', action: 'delete' },
  { name: 'attendance.manage', description: 'Full attendance management', category: 'attendance', action: 'manage' },
  
  // Course Management
  { name: 'courses.create', description: 'Create new courses', category: 'courses', action: 'create' },
  { name: 'courses.read', description: 'View courses', category: 'courses', action: 'read' },
  { name: 'courses.update', description: 'Update course information', category: 'courses', action: 'update' },
  { name: 'courses.delete', description: 'Delete courses', category: 'courses', action: 'delete' },
  { name: 'courses.manage', description: 'Full course management', category: 'courses', action: 'manage' },
  
  // Batch Management
  { name: 'batches.create', description: 'Create new batches', category: 'batches', action: 'create' },
  { name: 'batches.read', description: 'View batches', category: 'batches', action: 'read' },
  { name: 'batches.update', description: 'Update batch information', category: 'batches', action: 'update' },
  { name: 'batches.delete', description: 'Delete batches', category: 'batches', action: 'delete' },
  { name: 'batches.manage', description: 'Full batch management', category: 'batches', action: 'manage' },
  
  // Notice Management
  { name: 'notices.create', description: 'Create notices', category: 'notices', action: 'create' },
  { name: 'notices.read', description: 'View notices', category: 'notices', action: 'read' },
  { name: 'notices.update', description: 'Update notices', category: 'notices', action: 'update' },
  { name: 'notices.delete', description: 'Delete notices', category: 'notices', action: 'delete' },
  { name: 'notices.manage', description: 'Full notice management', category: 'notices', action: 'manage' },
  
  // Service Management
  { name: 'services.create', description: 'Create services', category: 'services', action: 'create' },
  { name: 'services.read', description: 'View services', category: 'services', action: 'read' },
  { name: 'services.update', description: 'Update services', category: 'services', action: 'update' },
  { name: 'services.delete', description: 'Delete services', category: 'services', action: 'delete' },
  { name: 'services.manage', description: 'Full service management', category: 'services', action: 'manage' },
  
  // Transaction Management
  { name: 'transactions.create', description: 'Create transactions', category: 'transactions', action: 'create' },
  { name: 'transactions.read', description: 'View transactions', category: 'transactions', action: 'read' },
  { name: 'transactions.update', description: 'Update transactions', category: 'transactions', action: 'update' },
  { name: 'transactions.delete', description: 'Delete transactions', category: 'transactions', action: 'delete' },
  { name: 'transactions.manage', description: 'Full transaction management', category: 'transactions', action: 'manage' },
  
  // MFS Management
  { name: 'mfs.create', description: 'Create MFS records', category: 'mfs', action: 'create' },
  { name: 'mfs.read', description: 'View MFS records', category: 'mfs', action: 'read' },
  { name: 'mfs.update', description: 'Update MFS records', category: 'mfs', action: 'update' },
  { name: 'mfs.delete', description: 'Delete MFS records', category: 'mfs', action: 'delete' },
  { name: 'mfs.manage', description: 'Full MFS management', category: 'mfs', action: 'manage' },
  
  // Reports
  { name: 'reports.read', description: 'View reports', category: 'reports', action: 'read' },
  { name: 'reports.manage', description: 'Full report management', category: 'reports', action: 'manage' },
  
  // Settings
  { name: 'settings.read', description: 'View settings', category: 'settings', action: 'read' },
  { name: 'settings.update', description: 'Update settings', category: 'settings', action: 'update' },
  { name: 'settings.manage', description: 'Full settings management', category: 'settings', action: 'manage' },
  
  // System
  { name: 'system.manage', description: 'System administration', category: 'system', action: 'manage' }
];

const seedPermissionsAndRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing permissions and roles
    await Permission.deleteMany({});
    await Role.deleteMany({});
    console.log('Cleared existing permissions and roles');

    // Create permissions
    const createdPermissions = await Permission.insertMany(permissions);
    console.log(`Created ${createdPermissions.length} permissions`);

    // Create default roles
    const adminPermissions = createdPermissions.map(p => p._id);
    
    const teacherPermissions = createdPermissions
      .filter(p => ['attendance.read', 'courses.read', 'batches.read', 'notices.read', 'users.read'].includes(p.name))
      .map(p => p._id);
    
    const staffPermissions = createdPermissions
      .filter(p => !p.name.includes('delete') && !p.name.includes('system') && !p.name.includes('manage'))
      .map(p => p._id);
    
    const studentPermissions = createdPermissions
      .filter(p => p.action === 'read' && ['courses', 'notices', 'attendance'].includes(p.category))
      .map(p => p._id);

    const roles = [
      {
        name: 'Super Admin',
        description: 'Full system access',
        permissions: adminPermissions,
        isDefault: false
      },
      {
        name: 'Teacher',
        description: 'Teacher role with limited permissions',
        permissions: teacherPermissions,
        isDefault: true
      },
      {
        name: 'Staff',
        description: 'Staff role with moderate permissions',
        permissions: staffPermissions,
        isDefault: true
      },
      {
        name: 'Student',
        description: 'Student role with read-only access',
        permissions: studentPermissions,
        isDefault: true
      }
    ];

    const createdRoles = await Role.insertMany(roles);
    console.log(`Created ${createdRoles.length} roles`);

    // Update existing admin users to have Super Admin role
    const superAdminRole = createdRoles.find(r => r.name === 'Super Admin');
    await User.updateMany(
      { role: 'admin' },
      { roleId: superAdminRole._id }
    );

    // Update existing users with default roles
    const teacherRole = createdRoles.find(r => r.name === 'Teacher');
    const staffRole = createdRoles.find(r => r.name === 'Staff');
    const studentRole = createdRoles.find(r => r.name === 'Student');

    await User.updateMany({ role: 'teacher' }, { roleId: teacherRole._id });
    await User.updateMany({ role: 'staff' }, { roleId: staffRole._id });
    await User.updateMany({ role: 'student' }, { roleId: studentRole._id });

    console.log('Updated existing users with default roles');
    console.log('Permissions and roles seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding permissions and roles:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seedPermissionsAndRoles();