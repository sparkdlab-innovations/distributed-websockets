import WSClient from './wsClient.js';

const client1 = new WSClient('client-1', {
  onOpen: () => console.log('Connected to server!'),
  onClose: () => console.log('Disconnected from server!'),
  onError: (error) => console.error('Error: ', error),
  onMessage: (sender, recipient, data) =>
    console.log(`Received from ${sender}: ${data}`),
  onUnexpectedResponse: (request, response) =>
    console.error('Unexpected response: ', response),
});
client1.readyStateFuture.then(() =>
  client1.send({ recipient: 'client-2', data: 'Hello, client-2!' })
);
