import { z } from "zod";

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/)
  .optional()
  .or(z.literal("").transform(() => undefined));

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3001"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  MONAD_RPC_URL: z.string().url().default("https://testnet-rpc.monad.xyz/"),
  MONAD_CHAIN_ID: z.coerce.number().int().positive().default(10143),
  KEEPER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1500),
  MAX_PRICE_STALE_MS: z.coerce.number().int().positive().default(15000),
  KEEPER_PRIVATE_KEY: z.string().optional(),
  INTERNAL_SYNC_KEY: z.string().optional(),
  USDC_ADDRESS: addressSchema,
  VAULT_ADDRESS: addressSchema,
  TRADING_ENGINE_ADDRESS: addressSchema,
  COPY_TRADE_REGISTRY_ADDRESS: addressSchema,
  VUSD_ADDRESS: addressSchema,
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  corsOrigins: parsed.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
