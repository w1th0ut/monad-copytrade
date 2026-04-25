import express from "express";

const port = Number(process.env.PORT ?? 4000);

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = app.listen(port, () => {
  console.log(`[be] listening on :${port}`);
});

const shutdown = (signal: string) => {
  console.log(`[be] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
