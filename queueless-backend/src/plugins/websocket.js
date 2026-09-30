import fp from 'fastify-plugin';
import fastifyWebsocket from '@fastify/websocket';

async function websocketPlugin(fastify, options) {
  await fastify.register(fastifyWebsocket);

  // Map to hold connected clients per queueId
  const queueSubscribers = new Map();

  fastify.decorate('broadcastQueueUpdate', (queueId, payload) => {
    try {
      const clients = queueSubscribers.get(queueId);
      if (clients && clients.size > 0) {
        const message = JSON.stringify(payload);
        for (const client of clients) {
          const ws = client?.socket || client;
          if (ws && typeof ws.send === 'function' && ws.readyState === 1) { // 1 = OPEN
            try {
              ws.send(message);
            } catch (err) {
              fastify.log.error(err, 'Error broadcasting to WS client');
            }
          }
        }
      }
    } catch (broadcastErr) {
      fastify.log.error(broadcastErr, 'Failed to broadcast queue update');
    }
  });

  fastify.get('/ws/queues/:queueId', { websocket: true }, (rawConnection, req) => {
    const { queueId } = req.params;
    const socket = rawConnection?.socket || rawConnection;
    if (!socket || typeof socket.on !== 'function') return;

    if (!queueSubscribers.has(queueId)) {
      queueSubscribers.set(queueId, new Set());
    }
    const clients = queueSubscribers.get(queueId);
    clients.add(socket);

    try {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: 'CONNECTED',
          message: `Subscribed to live queue updates for queue: ${queueId}`,
          timestamp: new Date().toISOString(),
        }));
      }
    } catch (e) {}

    const cleanup = () => {
      clients.delete(socket);
      if (clients.size === 0) {
        queueSubscribers.delete(queueId);
      }
    };

    socket.on('close', cleanup);
    socket.on('error', cleanup);
  });
}

export default fp(websocketPlugin);

