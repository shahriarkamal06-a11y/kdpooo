const express = require('express');
const multer = require('multer');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

const uploadToCloudinary = (fileBuffer, folder) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    },
    (error, result) => {
      if (error) return reject(error);
      resolve(result);
    }
  );

  stream.end(fileBuffer);
});

router.post('/photo', (req, res, next) => {
  upload.single('photo')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ message: 'Cloudinary is not configured on the server' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Photo file is required' });
    }

    const folder = req.body.folder || 'kdpo/profiles';
    const result = await uploadToCloudinary(req.file.buffer, folder);

    res.status(201).json({
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    const message = error.message === 'Only image files are allowed'
      ? error.message
      : 'Failed to upload photo';
    res.status(500).json({ message });
  }
});

module.exports = router;
