/**
 * CeloPact Agent — ERC-8004 Registration
 *
 * Registers an agent on the canonical ERC-8004 Identity Registry on Celo,
 * then links the wallet to the CeloPact ERC8004Adapter so it can create/join escrows.
 *
 * Two-step flow:
 *   1. Call identityRegistry.register(agentURI) → mints an ERC-721 NFT (agentId)
 *   2. Call adapter.linkAgent(agentId) → links wallet → agentId in CeloPact
 *
 * After running, visit ${EXPLORER}/agent/<address> to see your agent.
 *
 * Usage: npm run register
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  decodeEventLog,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { resolveChain, type CeloNetworkName } from "celopact-sdk";

const NETWORK = (process.env["NETWORK"] ?? "celo-mainnet");
const IS_MAINNET = NETWORK === "celo-mainnet";

const ERC8004_IDENTITY_REGISTRY: Address = IS_MAINNET
  ? "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
  : "0x8004A818BFB912233c491871b3d84c89A494BD9e";
const ERC8004_REPUTATION_REGISTRY: Address = IS_MAINNET
  ? "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"
  : "0x8004B663056A597Dffe9eCcC1965A193B7388713";
const EXPLORER = IS_MAINNET ? "https://celoscan.io" : "https://celo-sepolia.blockscout.com";

// ── ERC-8004 Identity Registry ABI (minimal) ─────────────────────────────────
const IDENTITY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from",    type: "address", indexed: true },
      { name: "to",      type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

// ── ERC8004Adapter ABI (minimal) ─────────────────────────────────────────────
const ADAPTER_ABI = [
  {
    name: "linkAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "registered", type: "bool" }],
  },
  {
    name: "agentIds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── Spec-compliant ERC-8004 metadata ─────────────────────────────────────────
// Encoded as a data: URI so it's content-addressed (CID = content, not location).
// This satisfies the 8004scan metadata compliance validator.
function buildAgentURI(agentAddress: Address, label: string): string {
  const metadata = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: `CeloPact Agent (${label})`,
    description:
      "An AI agent that uses CeloPact Protocol for milestone-based escrow on Celo. " +
      "Locks USDT per deliverable, verifies work via signed oracle, resolves disputes " +
      "through ERC-8004 reputation ranking.",
    services: [
      {
        name: "web",
        endpoint: "https://github.com/zintarh/celopact-protocol",
        version: "0.1.0",
      },
    ],
    supportedTrust: ["reputation"],
    wallet: agentAddress,
  };
  const json = JSON.stringify(metadata);
  const b64  = Buffer.from(json).toString("base64");
  return `data:application/json;base64,${b64}`;
}

// ── Core registration logic ───────────────────────────────────────────────────
async function registerAgent(label: string, agentKey: Hex, adapterAddress: Address): Promise<void> {
  const account      = privateKeyToAccount(agentKey);
  const network      = (process.env["NETWORK"] ?? "celo-mainnet") as CeloNetworkName;
  const rpcUrl       = process.env["RPC_URL"] ?? "https://forno.celo.org";
  const chain        = resolveChain({ network, rpcUrl });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  console.log(`\n[Register] ${label}`);
  console.log(`           Wallet: ${account.address}`);

  const alreadyLinked = await publicClient.readContract({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "isRegistered",
    args: [account.address],
  });

  if (alreadyLinked) {
    const agentId = await publicClient.readContract({
      address: adapterAddress,
      abi: ADAPTER_ABI,
      functionName: "agentIds",
      args: [account.address],
    });
    console.log(`           Already registered ✓  agentId: ${agentId}`);
    console.log(`           explorer:   ${EXPLORER}/address/${account.address}`);
    console.log(`           8004scan:   https://8004scan.io/agent/${account.address}`);
    return;
  }

  // Step 1 — Register on ERC-8004 Identity Registry
  console.log(`           Step 1: Registering on ERC-8004 Identity Registry...`);
  const agentURI = buildAgentURI(account.address, label);

  const registerTx = await walletClient.writeContract({
    address: ERC8004_IDENTITY_REGISTRY,
    abi: IDENTITY_ABI,
    functionName: "register",
    args: [agentURI],
    account,
  });
  const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerTx });
  console.log(`           Registered on ERC-8004 ✓  tx: ${registerTx}`);

  let agentId: bigint | undefined;
  for (const log of registerReceipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: IDENTITY_ABI, eventName: "Transfer", ...log });
      if (decoded.args.from === "0x0000000000000000000000000000000000000000") {
        agentId = decoded.args.tokenId;
        break;
      }
    } catch {
      // not a Transfer log
    }
  }

  if (agentId === undefined) {
    throw new Error("Could not find agentId in register() transaction logs");
  }
  console.log(`           agentId: ${agentId}`);

  // Step 2 — Link to CeloPact ERC8004Adapter
  console.log(`           Step 2: Linking to CeloPact adapter...`);
  const linkTx = await walletClient.writeContract({
    address: adapterAddress,
    abi: ADAPTER_ABI,
    functionName: "linkAgent",
    args: [agentId],
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash: linkTx });
  console.log(`           Linked ✓  tx: ${linkTx}`);
  console.log(`           explorer:   ${EXPLORER}/address/${account.address}`);
  console.log(`           8004scan:   https://8004scan.io/agent/${account.address}`);
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const agentAKey      = process.env["AGENT_A_PRIVATE_KEY"] as Hex;
  const agentBKey      = process.env["AGENT_B_PRIVATE_KEY"] as Hex;
  const adapterAddress = process.env["REGISTRY_ADDRESS"]   as Address;

  if (!agentAKey || !agentBKey || !adapterAddress) {
    console.error("Missing AGENT_A_PRIVATE_KEY, AGENT_B_PRIVATE_KEY, or REGISTRY_ADDRESS in .env");
    process.exit(1);
  }

  console.log("\n  CELOPACT PROTOCOL — ERC-8004 REGISTRATION");
  const network = (process.env["NETWORK"] ?? "celo-mainnet") as CeloNetworkName;
  console.log(`  Network:   ${network}`);
  console.log(`  Identity:  ${ERC8004_IDENTITY_REGISTRY}`);
  console.log(`  Adapter:   ${adapterAddress}`);
  console.log(`  8004scan:  ${EXPLORER}`);

  await registerAgent("CeloPact Requester", agentAKey, adapterAddress);
  await registerAgent("CeloPact Fulfiller", agentBKey, adapterAddress);

  console.log("\n✓ Both agents registered. Ready for escrow.\n");
}

main().catch((err: unknown) => {
  console.error("Registration failed:", err);
  process.exit(1);
});
