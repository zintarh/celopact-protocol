import type { Address, Chain } from "viem";
import { celoCeloSepolia, celoMainnet } from "./client.js";

/** Supported Celo networks. SDK is network-agnostic — pick one via `network` or `chainId`. */
export type CeloNetworkName = "celo-sepolia" | "celo-mainnet";

export interface NetworkConfig {
  name: CeloNetworkName;
  chainId: number;
  chain: Chain;
  defaultRpcUrl: string;
  explorer: string;
  faucet?: string;
  erc8004: {
    identityRegistry: Address;
    reputationRegistry: Address;
  };
  tokens: {
    /** Native Celo USDT (6 decimals on mainnet and Sepolia). */
    usdt: Address;
    /** USDm on Celo Sepolia testnet (18 decimals, from faucet). */
    usdm?: Address;
  };
}

/** Canonical network presets — Sepolia (deployed) and Mainnet (SDK-ready, deploy with Deploy.s.sol). */
export const CELO_NETWORKS: Record<CeloNetworkName, NetworkConfig> = {
  "celo-sepolia": {
    name: "celo-sepolia",
    chainId: 11142220,
    chain: celoCeloSepolia,
    defaultRpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
    explorer: "https://celo-sepolia.blockscout.com",
    faucet: "https://faucet.celo.org/celo-sepolia",
    erc8004: {
      identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
      reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
    },
    tokens: {
      usdt: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
      usdm: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b",
    },
  },
  "celo-mainnet": {
    name: "celo-mainnet",
    chainId: 42220,
    chain: celoMainnet,
    defaultRpcUrl: "https://forno.celo.org",
    explorer: "https://celoscan.io",
    erc8004: {
      identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
      reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
    },
    tokens: {
      usdt: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    },
  },
};

const CHAIN_ID_TO_NETWORK = new Map<number, CeloNetworkName>(
  Object.values(CELO_NETWORKS).map((n) => [n.chainId, n.name])
);

/** Returns the network preset for a chain ID. */
export function getNetworkByChainId(chainId: number): NetworkConfig {
  const name = CHAIN_ID_TO_NETWORK.get(chainId);
  if (!name) {
    throw new Error(
      `Unsupported chainId ${chainId}. Supported: ${[...CHAIN_ID_TO_NETWORK.keys()].join(", ")}`
    );
  }
  return CELO_NETWORKS[name];
}

/** Returns the network preset by name. */
export function getNetwork(name: CeloNetworkName): NetworkConfig {
  return CELO_NETWORKS[name];
}

export interface ResolveChainOptions {
  network?: CeloNetworkName;
  chainId?: number;
  rpcUrl?: string;
}

/**
 * Resolves the viem Chain for a Celo network.
 * Priority: `network` → `chainId` → infer from rpcUrl (sepolia/testnet → Sepolia, else mainnet).
 */
export function resolveChain(options: ResolveChainOptions): Chain {
  if (options.network) return CELO_NETWORKS[options.network].chain;
  if (options.chainId !== undefined) return getNetworkByChainId(options.chainId).chain;

  const rpc = options.rpcUrl ?? "";
  if (rpc.includes("sepolia") || rpc.includes("testnet")) {
    return celoCeloSepolia;
  }
  return celoMainnet;
}

/** Resolves the full network config from options (same priority as resolveChain). */
export function resolveNetwork(options: ResolveChainOptions): NetworkConfig {
  if (options.network) return CELO_NETWORKS[options.network];
  if (options.chainId !== undefined) return getNetworkByChainId(options.chainId);

  const chain = resolveChain(options);
  const name = CHAIN_ID_TO_NETWORK.get(chain.id);
  if (!name) throw new Error(`Could not resolve network for chain ${chain.id}`);
  return CELO_NETWORKS[name];
}
