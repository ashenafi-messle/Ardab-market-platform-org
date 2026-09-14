// ==============================================================================
// Ardab Market - HTTP Server Entry Point & Lifecycle Management
// ==============================================================================

import { createApp } from './app.js';
import { env } from './shared/config/env.js';
import { disconnectPrisma } from './shared/config/database.js';
import { logger } from './shared/utils/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Ardab Market Backend running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
  logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
  logger.info(`Admin API mounted at http://localhost:${env.PORT}/api/admin`);
});

// ------------------------------------------------------------------------------
// Graceful Shutdown Handling
// ------------------------------------------------------------------------------

let isShuttingDown = false;

async function handleGracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed. Terminating background resources...');

    try {
      // Disconnect Prisma client cleanly
      await disconnectPrisma();
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (err) {
      logger.error('Error encountered during shutdown:', { error: err.message });
      process.exit(1);
    }
  });

  // Force close after 10 seconds if lingering connections remain
  setTimeout(() => {
    logger.error('Shutdown timed out. Forcing process termination.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    error: err.message,
    stack: err.stack,
  });
  handleGracefulShutdown('UNCAUGHT_EXCEPTION');
});
