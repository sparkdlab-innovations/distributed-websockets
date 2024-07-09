import { createServer } from 'http';
import { WebSocketServer } from 'ws';

class WSServerBase {
  #server;
  #wss;
  #clients;

  constructor(
    { onConnection, onMessage, onClose, onError } = {},
    { serverPingInterval } = {
      serverPingInterval: 30000,
    }
  ) {
    this.#server = createServer();

    this.#wss = new WebSocketServer({
      noServer: true,
      clientTracking: true,
    });

    this.#clients = new Map();

    this.#wss.on('connection', (ws, request) => {
      ws.clientId = request.headers['x-client-id'];
      ws.isAlive = true;

      this.#clients.set(ws.clientId, ws);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message) => {
        const { recipient, data } = JSON.parse(message);

        try {
          onMessage?.(ws, recipient, data);
        } catch (error) {
          throw new Error('event-callback-error', error);
        }
      });

      ws.on('close', () => {
        this.#clients.delete(ws.clientId);
        clearInterval(ws.pingInterval);

        try {
          onClose?.(ws);
        } catch (error) {
          throw new Error('event-callback-error', error);
        }
      });

      ws.on('error', (error) => {
        try {
          onError?.(ws, error);
        } catch (error) {
          throw new Error('event-callback-error', error);
        }
      });

      ws.pingInterval = setInterval(() => {
        if (!ws.isAlive) {
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      }, serverPingInterval);

      try {
        onConnection?.(ws);
      } catch (error) {
        throw new Error('event-callback-error', error);
      }
    });

    this.#wss.on('error', console.error);

    this.#server.on('upgrade', (request, socket, head) => {
      this.#wss.handleUpgrade(request, socket, head, (ws) => {
        this.#wss.emit('connection', ws, request);
      });
    });

    this.#server.on('error', console.error);
  }

  start(port) {
    this.#server.listen(parseInt(port), () => {
      console.info(`Server listening on ${port}!`);
    });

    setInterval(() => {
      console.debug(
        'Clients:',
        Array.from(this.#wss.clients).map((client) => client.clientId)
      );
      console.debug(
        'Process Memory (MB): ',
        process.memoryUsage().rss / 1024 / 1024
      );
    }, 30000);
  }

  close() {
    this.#wss.close();
    this.#server.close();
  }

  get wss() {
    return this.#wss;
  }

  get server() {
    return this.#server;
  }

  get clients() {
    return this.#clients;
  }
}

export default WSServerBase;
