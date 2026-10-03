const winston = require('winston');
const env = require('../config/env');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  env.isDev
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} ${level}: ${message} ${metaStr}`;
        })
      )
    : winston.format.json()
);

const logger = winston.createLogger({
  level: env.isDev ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'repairbee-api' },
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;
