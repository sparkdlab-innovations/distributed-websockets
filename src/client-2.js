import WSClient from './wsClient.js';

const client2 = new WSClient(
  'client-2',
  {
    onOpen: () => console.info('Connected to server!'),
    onClose: () => console.info('Disconnected from server!'),
    onError: (error) => console.error('Error: ', error),
    onMessage: (sender, recipient, data) =>
      console.log(`Received from ${sender}: `, data),
    onUnexpectedResponse: (request, response) =>
      console.error('Unexpected response: ', response),
  },
  {
    port: 8081,
    serverPingInterval: 30000,
  }
);

client2.readyStateFuture.then(() =>
  client2.send({ recipient: 'client-1', data: 'Hello, client-1!' })
);
