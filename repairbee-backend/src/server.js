const http = require('http');
const app = require('./app');
const env = require('./config/env');
const db = require('./config/database');
const logger = require('./utils/logger');
const { initializeSocket } = require('./modules/chat/chat.gateway');

async function startServer() {
  // Test database connection
  const dbConnected = await db.testConnection();
  if (!dbConnected && env.isProd) {
    logger.error('Cannot start server without database connection');
    process.exit(1);
  }

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.io for real-time chat
  initializeSocket(server);

  // Start listening
  server.listen(env.PORT, () => {
    logger.info(`🐝 RepairBee API running on port ${env.PORT}`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
    logger.info(`   API Base: http://localhost:${env.PORT}/api/${env.API_VERSION}`);
    logger.info(`   Health: http://localhost:${env.PORT}/health`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      // Close database pool
      await db.pool.end();
      logger.info('Database pool closed');

      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason: reason?.message || reason });
  });
}

startServer();
