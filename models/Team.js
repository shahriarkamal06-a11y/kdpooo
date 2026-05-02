const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    position: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    color: { type: String, default: 'cyan' },
    experience: { type: String, required: true },
    education: [{ type: String }],
    skills: [{ type: String }],
    phone: { type: String, required: true },
    email: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
}, {
    timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);