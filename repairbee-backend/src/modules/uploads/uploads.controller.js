const path = require('path');
const { randomUUID } = require('crypto');
const { uploadBuffer, getFileStream, isR2Configured } = require('../../config/r2');
const ApiError = require('../../utils/apiError');
const logger = require('../../utils/logger');

/**
 * Upload a single file (image/video) to R2 with local fallback.
 */
exports.uploadSingle = async (req, res, next) => {
  try {
    if (!req.file) {
      throw ApiError.badRequest('No file uploaded');
    }

    const ext = path.extname(req.file.originalname) || '.jpg';
    const folder = req.body.folder || 'general';
    const key = `${folder}/${randomUUID()}${ext}`;

    const result = await uploadBuffer(req.file.buffer, key, req.file.mimetype);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        key: result.key,
        url: result.url,
        storage: result.storage,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload multiple files (images/evidence).
 */
exports.uploadMultiple = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw ApiError.badRequest('No files uploaded');
    }

    const folder = req.body.folder || 'general';
    const uploadPromises = req.files.map(async (file) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const key = `${folder}/${randomUUID()}${ext}`;
      const result = await uploadBuffer(file.buffer, key, file.mimetype);
      return {
        key: result.key,
        url: result.url,
        storage: result.storage,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      };
    });

    const files = await Promise.all(uploadPromises);

    res.status(201).json({
      success: true,
      message: `${files.length} files uploaded successfully`,
      data: files,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve a stored file by key.
 */
exports.getFile = async (req, res, next) => {
  try {
    const rawKey = req.params.folder && req.params.filename
      ? `${req.params.folder}/${req.params.filename}`
      : (req.params.filename || req.params.key || req.params[0]);
    if (!rawKey) {
      throw ApiError.badRequest('File key is required');
    }

    const { stream, contentType, contentLength } = await getFileStream(rawKey);

    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (typeof stream.pipe === 'function') {
      stream.pipe(res);
    } else {
      // For AWS SDK v3 stream response (readable stream or web stream)
      for await (const chunk of stream) {
        res.write(chunk);
      }
      res.end();
    }
  } catch (err) {
    if (err.message === 'File not found' || err.name === 'NoSuchKey') {
      return next(ApiError.notFound('File not found'));
    }
    next(err);
  }
};
