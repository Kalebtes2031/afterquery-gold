// src/routes/order/upload.js

const express = require('express');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../../config/cloudinary');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();

// Multer in-memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// POST /api/upload-laundry-photos
router.post('/upload-laundry-photos',
  authMiddleware,
  upload.array('photos', 5),
  async (req, res) => {
    try {
      const files = req.files;

      if (!files || !files.length) {
        return res.status(400).json({ error: 'No photos uploaded' });
      }

      const uploads = files.map((file) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'laundry-orders',
              resource_type: 'image',
              upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET, // optional if signed
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          );

          streamifier.createReadStream(file.buffer).pipe(stream);
        });
      });

      const urls = await Promise.all(uploads);

      res.json({ success: true, urls });
    } catch (err) {
      console.error('Upload error:', err);

      res.status(500).json({
        error: err.message || 'Failed to upload photos',
      });
    }
  }
);

module.exports = router;
