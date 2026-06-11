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

/** Celo Sepolia testnet — the active Celo testnet since the L2 migration (March 2025). */
export const celoCeloSepolia: Chain = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://celo-sepolia.blockscout.com" },
  },
  testnet: true,
});

/** @deprecated Alfajores was replaced by Celo Sepolia after Celo's L2 migration (March 2025). */
export const celoAlfajores = celoCeloSepolia;

/** Celo mainnet chain definition. Chain ID 42220, L2 (OP Stack + EigenDA) since March 2025. */
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

  const chain = rpcUrl.includes("testnet") ? celoCeloSepolia : celoMainnet;

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
