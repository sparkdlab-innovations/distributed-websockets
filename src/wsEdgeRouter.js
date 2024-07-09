import WSServerBase from './wsServerBase.js';
import WSClientBase from './wsClientBase.js';

class WSEdgeRouter extends WSServerBase {
  #edgeRouterId;
  #baseClients = new Map();
  #rootSocket;

  constructor(
    edgeRouterId,
    { serverPingInterval, rootPort } = {
      serverPingInterval: 30000,
      rootPort: 3000,
    }
  ) {
    super(
      {
        onMessage: (ws, recipient, data) => {
          if (recipient != 'router') {
            // TODO: handle the invalid message
            return;
          }

          if (data.type == 'register') {
            this.#baseClients.set(data.clientId, ws.clientId);
          } else if (data.type == 'deregister') {
            this.#baseClients.delete(data.clientId);
          } else if (data.type == 'message') {
            const recipientClient = this.#baseClients.get(data.recipient);

            if (recipientClient) {
              const sendMessage = JSON.stringify({
                sender: 'router',
                recipient: recipientClient,
                data,
              });
              this.clients.get(recipientClient).send(sendMessage);
            } else {
              const sendMessage = {
                recipient: 'root',
                data,
              };
              this.#rootSocket.send(sendMessage);
            }
          } else {
            // TODO: handle the invalid type
            return;
          }
        },
        onError: (ws, error) => {
          console.error(`Edge Server ${ws.clientId} | Error: `, error);
        },
      },
      { serverPingInterval }
    );

    this.#edgeRouterId = edgeRouterId;

    this.#rootSocket = new WSClientBase(
      this.#edgeRouterId,
      {
        onOpen: () => {
          console.info(`Edge Router ${this.#edgeRouterId} | Connected to root`);
        },
        onClose: () => {
          console.info(
            `Edge Router ${this.#edgeRouterId} | Disconnected from root`
          );
        },
        onError: (error) => {
          console.error(`Edge Router ${this.#edgeRouterId} | Error: `, error);
        },
        onMessage: (sender, recipient, data) => {
          if (sender != 'root') {
            // TODO: handle invalid sender
            return;
          }

          if (data.isError) {
            console.error(
              `Edge Router ${this.#edgeRouterId} | Error from root: `,
              data.error
            );
            return;
          }

          if (data.type === 'message') {
            const recipientClient = this.#baseClients.get(data.recipient);

            if (recipientClient) {
              const sendMessage = JSON.stringify({
                sender: 'router',
                recipient: recipientClient,
                data,
              });
              this.clients.get(recipientClient).send(sendMessage);
            } else {
              // TODO: handle the invalid recipient
            }
          } else if (data.type === 'find') {
            if (this.#baseClients.has(data.recipient)) {
              const sendMessage = {
                recipient: 'root',
                data: {
                  type: 'found',
                  recipient: data.recipient,
                  messageId: data.messageId,
                },
              };
              this.#rootSocket.send(sendMessage);
            }
          }
        },
        onUnexpectedResponse: (request, response) => {
          console.error(
            `Edge Router ${this.#edgeRouterId} | Unexpected response: `,
            response
          );
        },
      },
      {
        port: rootPort,
        serverPingInterval,
      }
    );
  }

  async start(port) {
    await this.#rootSocket.readyStateFuture;
    super.start(port);
  }
}

export default WSEdgeRouter;
