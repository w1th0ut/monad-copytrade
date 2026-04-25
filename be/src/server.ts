import { createServer } from "node:http";
import { env } from "./config/env.js";
import { createApi } from "./delivery/api.js";
import { KeeperService } from "./usecase/keeper.js";
import { startEventIndexer, stopEventIndexer } from "./usecase/event-indexer.js";

const keeper = new KeeperService();
const app = createApi(keeper);
const server = createServer(app);

keeper.start();
startEventIndexer(6_000);

server.listen(env.PORT, () => {
  console.log(`nolosstrade backend listening on http://localhost:${env.PORT}`);
});

function shutdown() {
  keeper.stop();
  stopEventIndexer();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
