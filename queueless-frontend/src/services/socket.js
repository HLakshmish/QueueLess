export function subscribeToQueue(queueId, onMessage) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/queues/${queueId}`;

  let ws = null;
  let retryTimer = null;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[WebSocket] Connected to queue channel: ${queueId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error('[WebSocket] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WebSocket] Connection closed, retrying in 3s...');
      retryTimer = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WebSocket] Error occurred', err);
    };
  }

  connect();

  return () => {
    if (retryTimer) clearTimeout(retryTimer);
    if (ws) {
      ws.onclose = null; // prevent reconnect
      ws.close();
    }
  };
}
