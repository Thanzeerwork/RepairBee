const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// Storage configuration (local disk for MVP)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Upload middleware instances
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 6, // 5 photos + 1 video max
  },
});

// Specific upload configs
const uploadRepairMedia = upload.array('media', 6);
const uploadProfilePic = upload.single('profile_pic');
const uploadDisputeEvidence = upload.array('evidence', 5);
const uploadChatMedia = upload.single('media');

module.exports = {
  uploadRepairMedia,
  uploadProfilePic,
  uploadDisputeEvidence,
  uploadChatMedia,
};
