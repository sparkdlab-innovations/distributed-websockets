import { createServer } from 'http';
import { WebSocketServer } from 'ws';

class WSServerBase {
  #server;
  #wss;
  #clients;

  constructor() {
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
        console.log(`Client ${ws.clientId} | Received: ${message}`);

        const { recipient, data } = JSON.parse(message);
        const recipientClient = this.#clients.get(recipient);

        // TODO: handle case to pass to parent router

        if (recipientClient) {
          recipientClient.send(
            JSON.stringify({ sender: ws.clientId, recipient, data })
          );
        } else {
          ws.send(
            JSON.stringify({
              sender: 'server',
              recipient: ws.clientId,
              data: {
                isError: true,
                error: {
                  message: `Recipient ${recipient} not found!`,
                  code: 'recipient-not-found',
                },
              },
            })
          );
        }
      });

      ws.on('close', () => {
        this.#clients.delete(ws.clientId);
        clearInterval(ws.pingInterval);
      });

      ws.on('error', (error) => {
        console.error(`Client ${ws.clientId} | Error: `, error);
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              sender: 'server',
              recipient: ws.clientId,
              data: {
                isError: true,
                error: {
                  message: error.message,
                  code: 'unknown-socket-error',
                },
              },
            })
          );
        }
      });

      ws.pingInterval = setInterval(() => {
        if (!ws.isAlive) {
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      }, 30000);
    });

    this.#wss.on('error', console.error);

    this.#server.on('upgrade', (request, socket, head) => {
      this.#wss.handleUpgrade(request, socket, head, (ws) => {
        this.#wss.emit('connection', ws, request);
      });
    });

    this.#server.on('error', console.error);
  }

  start() {
    this.#server.listen(8080, () => {
      console.info('Server listening on 8080!');
    });

    setInterval(() => {
      console.log(
        'Clients:',
        Array.from(this.#wss.clients).map((client) => client.clientId)
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
