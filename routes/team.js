const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const { auth } = require('../middleware/auth');

// Get all team members (public)
router.get('/', async (req, res) => {
    try {
        const team = await Team.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get public team members (no auth required)
router.get('/public', async (req, res) => {
    try {
        const team = await Team.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get team member by ID (public)
router.get('/:id', async (req, res) => {
    try {
        const member = await Team.findById(req.params.id);
        if (!member) return res.status(404).json({ message: 'Team member not found' });
        res.json(member);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create team member (admin only)
router.post('/', auth, async (req, res) => {
    try {
        const member = new Team(req.body);
        await member.save();
        res.status(201).json(member);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update team member (admin only)
router.put('/:id', auth, async (req, res) => {
    try {
        const member = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!member) return res.status(404).json({ message: 'Team member not found' });
        res.json(member);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete team member (admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const member = await Team.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!member) return res.status(404).json({ message: 'Team member not found' });
        res.json({ message: 'Team member deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;