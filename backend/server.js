require('dotenv').config({ quiet: true });
const app = require('./app');
const db = require('./db');
const { logger } = require('./logger');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(
    { event: 'server_started', port: Number(PORT), env: process.env.NODE_ENV || 'development' },
    'Server started'
  );
});

server.on('error', (err) => {
  logger.fatal({ event: 'server_start_failed', err }, 'Server failed to start');
  process.exit(1);
});

// Close the server and DB cleanly on Ctrl+C or a stop signal
function shutdown(signal) {
  logger.info({ event: 'server_stopping', signal }, 'Shutting down');
  setTimeout(() => process.exit(1), 5000).unref(); // give up if connections hang
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Last-resort handlers: log, then exit (the process state is unreliable after these)
process.on('unhandledRejection', (reason) => {
  logger.fatal({ event: 'unhandled_rejection', err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ event: 'uncaught_exception', err }, 'Uncaught exception');
  process.exit(1);
});
