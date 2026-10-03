const express = require('express');
const multer = require('multer');
const uploadsController = require('./uploads.controller');
const env = require('../../config/env');
const ApiError = require('../../utils/apiError');

const router = express.Router();

// Allowed file types for uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest(`File type ${file.mimetype} is not supported`), false);
    }
  },
});

router.post('/single', upload.single('file'), uploadsController.uploadSingle);
router.post('/multiple', upload.array('files', 10), uploadsController.uploadMultiple);
// Support nested paths like /general/uuid.jpg and flat paths like /uuid.jpg
router.get('/:folder/:filename', uploadsController.getFile);
router.get('/:filename', uploadsController.getFile);

module.exports = router;
