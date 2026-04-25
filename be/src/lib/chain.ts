import { createPublicClient, http, parseAbi } from "viem";
import { env } from "../config/env.js";

export const publicClient = createPublicClient({
  transport: http(env.MONAD_RPC_URL),
});

export const copyTradeRegistryAbi = parseAbi([
  "function getRegisteredLeaders() view returns (address[])",
  "function leaderUsername(address leader) view returns (string)",
  "function getFollowers(address leader) view returns (address[])",
]);
