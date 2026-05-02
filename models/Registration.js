const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  examName: { type: String, required: true }, // SSC, HSC, Madrasa, No Formal Education, etc.
  passingYear: { type: Number },
  result: { type: String }, // GPA/CGPA or Grade
  board: { type: String }, // Board name or Institution
  rollNumber: { type: String },
  registrationNumber: { type: String },
  institutionName: { type: String }, // For Madrasa or other institutions
  educationType: { type: String, enum: ['formal', 'madrasa', 'none'], default: 'formal' }
});

const registrationSchema = new mongoose.Schema({
  // Basic Info
  nameEnglish: { type: String, required: true },
  nameBangla: { type: String, required: true },
  fatherName: { type: String, required: true },
  motherName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female'], required: true },
  nidOrBirth: { type: String, required: true },
  photoUrl: { type: String },
  photoPublicId: { type: String },
  
  // Contact
  mobile: { type: String, required: true },
  guardianMobile: { type: String, required: true },
  
  // Address
  permanentAddress: { type: String, required: true },
  presentAddress: { type: String, required: true },
  
  // Education (Optional - some students may not have formal education)
  education: [educationSchema],
  hasEducation: { type: Boolean, default: true }, // Whether student has any educational background
  
  // Application Status
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  email: { type: String }, // Set by admin on approval
  password: { type: String }, // Set by admin on approval
  rejectionReason: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Registration', registrationSchema);
