import WSServerBase from './wsServerBase.js';
import WSClientBase from './wsClientBase.js';

class WSEdgeServer extends WSServerBase {
  #edgeServerId;
  #routerSocket;

  constructor(
    edgeServerId,
    { serverPingInterval, routerPort } = {
      serverPingInterval: 30000,
      routerPort: 5000,
    }
  ) {
    super(
      {
        onConnection: (ws) => {
          const sendMessage = {
            recipient: 'router',
            data: {
              type: 'register',
              clientId: ws.clientId,
            },
          };
          this.#routerSocket?.send(sendMessage);
        },
        onMessage: (ws, recipient, data) => {
          const recipientClient = this.clients.get(recipient);

          if (recipientClient) {
            const sendMessage = JSON.stringify({
              sender: ws.clientId,
              recipient,
              data,
            });
            recipientClient.send(sendMessage);
          } else {
            const sendMessage = {
              recipient: 'router',
              data: {
                type: 'message',
                sender: ws.clientId,
                recipient,
                data,
              },
            };
            this.#routerSocket?.send(sendMessage);
          }
        },
        onError: (ws, error) => {
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
        },
        onClose: (ws) => {
          const sendMessage = {
            recipient: 'router',
            data: {
              type: 'deregister',
              clientId: ws.clientId,
            },
          };
          this.#routerSocket?.send(sendMessage);
        },
      },
      { serverPingInterval }
    );

    this.#edgeServerId = edgeServerId;

    this.#routerSocket = new WSClientBase(
      this.#edgeServerId,
      {
        onOpen: () => {
          console.info(
            `Edge Server ${this.#edgeServerId} | Connected to router`
          );
        },
        onClose: () => {
          console.info(
            `Edge Server ${this.#edgeServerId} | Disconnected from router`
          );
        },
        onError: (error) => {
          console.error(`Edge Server ${this.#edgeServerId} | Error: `, error);
        },
        onMessage: (sender, recipient, data) => {
          if (sender != 'router') {
            // TODO: handle invalid sender
            return;
          }

          if (data.isError) {
            console.error(
              `Edge Server ${this.#edgeServerId} | Error from router: `,
              data.error
            );
            return;
          }

          if (data.type === 'message') {
            const recipientClient = this.clients.get(data.recipient);

            if (recipientClient) {
              const sendMessage = JSON.stringify({
                sender: data.sender,
                recipient: data.recipient,
                data: data.data,
              });
              recipientClient.send(sendMessage);
            } else {
              console.error(
                `Edge Server ${this.#edgeServerId} | Recipient ${
                  data.recipient
                } not found!`
              );
            }

            return;
          }
        },
        onUnexpectedResponse: (request, response) => {
          console.error(
            `Edge Server ${this.#edgeServerId} | Unexpected response: `,
            response
          );
        },
      },
      {
        port: routerPort,
        serverPingInterval,
      }
    );
  }

  async start(port) {
    await this.#routerSocket.readyStateFuture;
    super.start(port);
  }
}

export default WSEdgeServer;
