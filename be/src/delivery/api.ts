import cors from "cors";
import express from "express";
import helmet from "helmet";
import { z } from "zod";
import { env } from "../config/env.js";
import {
  getActiveTrades,
  getLeaders,
  getStats,
  getVaultActivity,
  getVaultForUser,
  syncFromChainSnapshot,
} from "../usecase/indexer.js";
import { KeeperService } from "../usecase/keeper.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export function createApi(keeper: KeeperService) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      ok: true,
      network: {
        chainId: env.MONAD_CHAIN_ID,
        rpcUrl: env.MONAD_RPC_URL,
      },
      keeper: keeper.getStatus(),
    });
  });

  app.get("/api/v1/leaders", (_req, res) => {
    getLeaders()
      .then((data) => res.json({ data }))
      .catch((err: Error) => {
        console.error("[leaders] chain read failed:", err.message);
        res.json({ data: [] });
      });
  });

  app.get("/api/v1/stats", (_req, res) => {
    res.json({ data: getStats() });
  });

  app.get("/api/v1/trades/active", (_req, res) => {
    res.json({ data: getActiveTrades() });
  });

  app.get("/api/v1/vault/activity", (_req, res) => {
    res.json({ data: getVaultActivity() });
  });

  app.get("/api/v1/user/:address/vault", (req, res) => {
    const parsedAddress = addressSchema.safeParse(req.params.address);
    if (!parsedAddress.success) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    const result = getVaultForUser(parsedAddress.data);
    if (!result) {
      res.status(404).json({ error: "User vault state not found" });
      return;
    }

    res.json({ data: result });
  });

  app.post("/api/v1/sync", (req, res) => {
    if (!env.INTERNAL_SYNC_KEY) {
      res.status(501).json({ error: "Manual sync is disabled" });
      return;
    }

    const suppliedKey = req.headers["x-internal-sync-key"];
    if (suppliedKey !== env.INTERNAL_SYNC_KEY) {
      res.status(401).json({ error: "Unauthorized sync request" });
      return;
    }

    res.json({ data: syncFromChainSnapshot() });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  app.use(
    (
      error: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "production" ? "Unexpected failure" : error.message,
      });
    },
  );

  return app;
}
