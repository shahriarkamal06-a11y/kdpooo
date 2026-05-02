const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { auth } = require('../middleware/auth');

// Get all published blogs (public)
router.get('/public', async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true })
      .populate('author', 'name')
      .sort({ publishedAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all blogs (admin/staff only)
router.get('/', auth, async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single blog
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('author', 'name');
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create blog
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, imageUrl, tags, published } = req.body;
    
    const blog = new Blog({
      title,
      content,
      imageUrl,
      author: req.user.id,
      tags: tags || [],
      published: published || false
    });

    await blog.save();
    await blog.populate('author', 'name');
    res.status(201).json(blog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update blog
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, imageUrl, tags, published } = req.body;
    
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.imageUrl = imageUrl !== undefined ? imageUrl : blog.imageUrl;
    blog.tags = tags || blog.tags;
    blog.published = published !== undefined ? published : blog.published;

    await blog.save();
    await blog.populate('author', 'name');
    res.json(blog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete blog
router.delete('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;