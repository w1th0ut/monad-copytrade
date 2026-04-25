import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "@/lib/web3/monad-testnet";

export function getWagmiConfig() {
  const rpcUrl =
    process.env.NEXT_PUBLIC_MONAD_RPC_URL ??
    monadTestnet.rpcUrls.default.http[0];

  return createConfig({
    chains: [monadTestnet],
    connectors: [injected()],
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
    transports: {
      [monadTestnet.id]: http(rpcUrl),
    },
  });
}
