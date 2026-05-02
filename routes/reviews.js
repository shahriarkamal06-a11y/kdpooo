const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');

// Get all reviews (public)
router.get('/', async (req, res) => {
    try {
        const reviews = await Review.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get public reviews (no auth required)
router.get('/public', async (req, res) => {
    try {
        const reviews = await Review.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get review by ID (public)
router.get('/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });
        res.json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create review (admin only)
router.post('/', auth, async (req, res) => {
    try {
        const review = new Review(req.body);
        await review.save();
        res.status(201).json(review);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update review (admin only)
router.put('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!review) return res.status(404).json({ message: 'Review not found' });
        res.json(review);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete review (admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!review) return res.status(404).json({ message: 'Review not found' });
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;