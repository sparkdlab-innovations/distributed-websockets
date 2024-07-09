import WSRootServer from './wsRootServer.js';
import WSEdgeRouter from './wsEdgeRouter.js';
import WSEdgeServer from './wsEdgeServer.js';

(async () => {
  const wsRootServer = new WSRootServer({
    serverPingInterval: 30000,
  });
  wsRootServer.start(3000);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const wsEdgeRouter1 = new WSEdgeRouter('edge-router-1', {
    serverPingInterval: 30000,
    rootPort: 3000,
  });
  const wsEdgeRouter2 = new WSEdgeRouter('edge-router-2', {
    serverPingInterval: 30000,
    rootPort: 3000,
  });
  await Promise.all([wsEdgeRouter1.start(5000), wsEdgeRouter2.start(5001)]);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const wsEdgeServer1 = new WSEdgeServer('edge-server-1', {
    serverPingInterval: 30000,
    routerPort: 5000,
  });
  const wsEdgeServer2 = new WSEdgeServer('edge-server-2', {
    serverPingInterval: 30000,
    routerPort: 5001,
  });
  await Promise.all([wsEdgeServer1.start(8080), wsEdgeServer2.start(8081)]);
})();
