import { createServer } from "node:http";
import { env } from "./config/env.js";
import { createApi } from "./delivery/api.js";
import { KeeperService } from "./usecase/keeper.js";

const keeper = new KeeperService();
const app = createApi(keeper);
const server = createServer(app);

keeper.start();

server.listen(env.PORT, () => {
  console.log(`nolosstrade backend listening on http://localhost:${env.PORT}`);
});

function shutdown() {
  keeper.stop();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
