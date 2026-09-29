import { buildApp } from './app.js';
import { config } from './config/index.js';

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 QueueLess Backend Server running at http://${config.host}:${config.port}`);
    console.log(`📡 WebSocket endpoint ready at ws://${config.host}:${config.port}/ws/queues/:queueId`);
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

start();
