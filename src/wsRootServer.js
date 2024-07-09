import WSServerBase from './wsServerBase.js';
import { createHash, getHashes } from 'crypto';

function getDefaultHashAlgorithm() {
  const availableHashes = getHashes();
  if (availableHashes.includes('SHA256')) {
    return 'SHA256';
  }
  if (availableHashes.includes('sha256')) {
    return 'sha256';
  }
  if (availableHashes.includes('SHA512')) {
    return 'SHA512';
  }
  if (availableHashes.includes('sha512')) {
    return 'sha512';
  }
  if (availableHashes.includes('MD5')) {
    return 'MD5';
  }
  if (availableHashes.includes('md5')) {
    return 'md5';
  }
  if (availableHashes.length <= 0) {
    throw new Error('No hash algorithms available in the current environment.');
  }
  return availableHashes[0];
}

class WSRootServer extends WSServerBase {
  #messageQueue = new Map();
  #defaultHashAlgorithm = getDefaultHashAlgorithm();

  constructor(
    { serverPingInterval } = {
      serverPingInterval: 30000,
    }
  ) {
    super(
      {
        onMessage: (ws, recipient, data) => {
          if (recipient != 'root') {
            // TODO: handle the invalid message
            return;
          }

          if (data.type == 'message') {
            const dataHash = createHash(this.#defaultHashAlgorithm)
              .update(JSON.stringify(data))
              .digest('hex');
            this.#messageQueue.set(dataHash, data);

            this.clients.forEach((client) => {
              const sendMessage = JSON.stringify({
                sender: 'root',
                recipient: client.clientId,
                data: {
                  type: 'find',
                  recipient: data.recipient,
                  messageId: dataHash,
                },
              });
              client.send(sendMessage);
            });
          } else if (data.type == 'found') {
            if (!this.#messageQueue.has(data.messageId)) {
              // TODO: handle the invalid message
              return;
            }

            const sendMessage = JSON.stringify({
              sender: 'root',
              recipient: ws.clientId,
              data: this.#messageQueue.get(data.messageId),
            });
            ws.send(sendMessage);

            this.#messageQueue.delete(data.messageId);
          }
        },
      },
      {
        serverPingInterval,
      }
    );
  }
}

export default WSRootServer;
