import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { resolveChain, type ResolveChainOptions } from "./networks.js";

export { celoCeloSepolia, celoAlfajores, celoMainnet } from "./networks.js";

export interface CreateCeloClientsOptions extends ResolveChainOptions {
  rpcUrl: string;
}

/** Creates a viem public + wallet client pair for any supported Celo network. */
export function createCeloClients(
  privateKey: Hex,
  options: CreateCeloClientsOptions | string
): { publicClient: PublicClient; walletClient: WalletClient; chain: Chain } {
  const account = privateKeyToAccount(privateKey);

  const resolved: CreateCeloClientsOptions =
    typeof options === "string" ? { rpcUrl: options } : options;

  const chain = resolveChain(resolved);
  const rpcUrl = resolved.rpcUrl;

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  return { publicClient, walletClient, chain };
}

export type { CeloNetworkName } from "./networks.js";
