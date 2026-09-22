import { createApplication } from './app.js';
import { readConfiguration } from './configuration/environment.js';
import { createStructuredLogger } from './observability/structured-logger.js';

const logger = createStructuredLogger();
try {
  const configuration = readConfiguration();
  const application = await createApplication({ configuration, logger });
  const server = application.listen(configuration.port, '0.0.0.0', () => {
    logger.info({ event: 'server.started', port: configuration.port, environment: configuration.environment });
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  let shuttingDown = false;

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    application.locals.context.lifecycle.ready = false;
    logger.info({ event: 'server.shutdown_started', signal });
    const shutdownDeadline = setTimeout(() => {
      logger.error({ event: 'server.shutdown_timeout' });
      server.closeAllConnections();
      process.exit(1);
    }, configuration.shutdownTimeoutMilliseconds);
    shutdownDeadline.unref();
    server.close(error => {
      clearTimeout(shutdownDeadline);
      logger.info({ event: 'server.shutdown_completed' });
      process.exitCode = error ? 1 : 0;
    });
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  server.on('error', error => {
    logger.error({ event: 'server.listen_failed', code: error.code });
    process.exitCode = 1;
  });
} catch (error) {
  logger.error({ event: 'server.startup_failed', errorType: error.name, message: error.message });
  process.exitCode = 1;
}
