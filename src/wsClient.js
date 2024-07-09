import WSClientBase from './wsClientBase.js';

class WSClient extends WSClientBase {
  constructor(
    clientId,
    { onOpen, onMessage, onClose, onError, onUnexpectedResponse } = {},
    { serverPingInterval, port } = {
      serverPingInterval: 30000,
      port: 8080,
    }
  ) {
    super(
      clientId,
      { onOpen, onMessage, onClose, onError, onUnexpectedResponse },
      { serverPingInterval, port }
    );
  }
}

export default WSClient;
