import WebSocket from 'ws';

class WSClientBase {
  #ws;
  #clientId;
  #pingTimeout;
  #serverPingInterval;
  #readyStateFutureResolver;

  constructor(
    clientId,
    { onOpen, onMessage, onClose, onError, onUnexpectedResponse } = {},
    { serverPingInterval } = {
      serverPingInterval: 30000,
    }
  ) {
    this.#clientId = clientId;
    this.#serverPingInterval = serverPingInterval;

    this.readyStateFuture = new Promise(
      (resolve) => (this.#readyStateFutureResolver = resolve)
    );

    // TODO: get address of local websocket edge server
    try {
      this.#ws = new WebSocket('ws://localhost:8080/ws', {
        headers: {
          'X-Client-ID': this.#clientId,
        },
      });
    } catch (error) {
      throw new Error('socket-creation-failed', error);
    }

    this.#ws.on('open', () => {
      this.#heartbeat();

      try {
        onOpen?.();
      } catch (error) {
        throw new Error('event-callback-error', error);
      } finally {
        this.#readyStateFutureResolver();
      }
    });

    this.#ws.on('ping', () => {
      this.#heartbeat();
    });

    this.#ws.on('message', (message) => {
      const { sender, recipient, data } = JSON.parse(message);

      if (recipient !== this.#clientId) {
        // TODO: handle message not intended for this client
        return;
      }
      if (sender === this.#clientId) {
        return;
      }

      if (sender === 'server') {
        if (data.isError) {
          // TODO: handle errors
          onError?.(data.error);
        }
        if (data.isWarning) {
          // TODO: handle warnings
        }
        if (data.isInfo) {
          // TODO: handle info
        }
        return;
      }

      try {
        onMessage?.(sender, recipient, data);
      } catch (error) {
        throw new Error('event-callback-error', error);
      }
    });

    this.#ws.on('close', () => {
      clearTimeout(this.#pingTimeout);

      try {
        onClose?.();
      } catch (error) {
        throw new Error('event-callback-error', error);
      }
    });

    this.#ws.on('error', (error) => {
      try {
        onError?.(error);
      } catch (error) {
        throw new Error('event-callback-error', error);
      }
    });

    this.#ws.on('unexpected-response', (request, response) => {
      try {
        onUnexpectedResponse?.(request, response);
      } catch (error) {
        throw new Error('event-callback-error', error);
      }
    });
  }

  #heartbeat() {
    clearTimeout(this.#pingTimeout);

    this.#pingTimeout = setTimeout(() => {
      this.#ws.terminate();
    }, this.#serverPingInterval + 1000);
  }

  get clientId() {
    return this.#clientId;
  }

  get readyState() {
    return this.#ws.readyState;
  }

  send({ recipient, data }) {
    if (this.#ws.readyState !== WebSocket.OPEN) {
      throw new Error('socket-not-open');
    }

    if (!recipient || !data) {
      throw new Error('invalid-data');
    }

    this.#ws.send(JSON.stringify({ recipient, data }));
  }

  close() {
    this.#ws.close();
  }

  ping() {
    this.#ws.ping();
  }

  terminate() {
    this.#ws.terminate();
  }
}

export default WSClientBase;
