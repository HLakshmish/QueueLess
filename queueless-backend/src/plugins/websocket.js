import fp from 'fastify-plugin';
import fastifyWebsocket from '@fastify/websocket';

async function websocketPlugin(fastify, options) {
  await fastify.register(fastifyWebsocket);

  // Map to hold connected clients per queueId
  const queueSubscribers = new Map();

  fastify.decorate('broadcastQueueUpdate', (queueId, payload) => {
    const clients = queueSubscribers.get(queueId);
    if (clients && clients.size > 0) {
      const message = JSON.stringify(payload);
      for (const client of clients) {
        if (client.readyState === 1) { // 1 = OPEN
          try {
            client.send(message);
          } catch (err) {
            fastify.log.error(err, 'Error broadcasting to WS client');
          }
        }
      }
    }
  });

  fastify.get('/ws/queues/:queueId', { websocket: true }, (connection, req) => {
    const { queueId } = req.params;
    if (!queueSubscribers.has(queueId)) {
      queueSubscribers.set(queueId, new Set());
    }
    const clients = queueSubscribers.get(queueId);
    clients.add(connection.socket);

    connection.socket.send(JSON.stringify({
      type: 'CONNECTED',
      message: `Subscribed to live queue updates for queue: ${queueId}`,
      timestamp: new Date().toISOString(),
    }));

    connection.socket.on('close', () => {
      clients.delete(connection.socket);
      if (clients.size === 0) {
        queueSubscribers.delete(queueId);
      }
    });
  });
}

export default fp(websocketPlugin);
