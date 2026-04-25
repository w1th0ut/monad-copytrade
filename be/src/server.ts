import express from "express";
import { env } from "./config/env.js";
import { syncFromChainSnapshot } from "./usecase/indexer.js";

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/v1/sync", (_req, res) => {
  const data = syncFromChainSnapshot();
  res.json(data);
});

const server = app.listen(env.PORT, () => {
  console.log(`[be] listening on :${env.PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`[be] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
