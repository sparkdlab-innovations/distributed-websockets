import WSClient from './wsClient.js';

const client2 = new WSClient('client-2', {
  onOpen: () => console.log('Connected to server!'),
  onClose: () => console.log('Disconnected from server!'),
  onError: (error) => console.error('Error: ', error),
  onMessage: (sender, recipient, data) =>
    console.log(`Received from ${sender}: ${data}`),
  onUnexpectedResponse: (request, response) =>
    console.error('Unexpected response: ', response),
});
client2.readyStateFuture.then(() =>
  client2.send({ recipient: 'client-1', data: 'Hello, client-1!' })
);
