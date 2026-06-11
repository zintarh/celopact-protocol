import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type PublicClient,
  type WalletClient,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

/** Celo Alfajores testnet chain definition. */
export const celoAlfajores: Chain = defineChain({
  id: 44787,
  name: "Celo Alfajores",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://alfajores-forno.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "Celoscan", url: "https://alfajores.celoscan.io" },
  },
  testnet: true,
});

/** Celo mainnet chain definition. */
export const celoMainnet: Chain = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo.org"] },
  },
  blockExplorers: {
    default: { name: "Celoscan", url: "https://celoscan.io" },
  },
});

/** Creates a viem public + wallet client pair for the given Celo network. */
export function createCeloClients(
  privateKey: Hex,
  rpcUrl: string
): { publicClient: PublicClient; walletClient: WalletClient } {
  const account = privateKeyToAccount(privateKey);

  const chain = rpcUrl.includes("testnet") ? celoAlfajores : celoMainnet;

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  return { publicClient, walletClient };
}
