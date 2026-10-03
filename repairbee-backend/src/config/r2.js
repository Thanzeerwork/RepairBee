const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const env = require('./env');
const logger = require('../utils/logger');

const isR2Configured = () => {
  return Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ACCOUNT_ID && env.R2_BUCKET_NAME);
};

let s3Client = null;
if (isR2Configured()) {
  try {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
    logger.info('☁️ Cloudflare R2 Client initialized for bucket: ' + env.R2_BUCKET_NAME);
  } catch (err) {
    logger.warn('Failed to initialize Cloudflare R2 Client:', err.message);
  }
} else {
  logger.info('📦 Cloudflare R2 credentials pending. Local disk storage fallback is active at ' + env.UPLOAD_DIR);
}

/**
 * Upload buffer to Cloudflare R2 (or fallback to local disk).
 * @param {Buffer} buffer
 * @param {string} key
 * @param {string} contentType
 * @returns {Promise<{ key: string, url: string, storage: 'r2' | 'local' }>}
 */
async function uploadBuffer(buffer, key, contentType) {
  if (isR2Configured() && s3Client) {
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    });

    await s3Client.send(command);

    const url = env.R2_PUBLIC_URL 
      ? `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
      : `/api/v1/uploads/${key}`;

    return { key, url, storage: 'r2' };
  }

  // Local filesystem fallback
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  const filePath = path.join(uploadDir, key);
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  await fs.promises.writeFile(filePath, buffer);

  return {
    key,
    url: `/api/v1/uploads/${key}`,
    storage: 'local'
  };
}

/**
 * Get readable stream for an object.
 */
async function getFileStream(key) {
  if (isR2Configured() && s3Client) {
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    });
    const response = await s3Client.send(command);
    return {
      stream: response.Body,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  }

  const filePath = path.join(path.resolve(env.UPLOAD_DIR), key);
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }

  return {
    stream: fs.createReadStream(filePath),
    contentType: 'application/octet-stream',
    contentLength: fs.statSync(filePath).size,
  };
}

module.exports = {
  isR2Configured,
  uploadBuffer,
  getFileStream,
  getS3Client: () => s3Client,
};
