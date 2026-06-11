/**
 * CeloPact Agent Registration
 *
 * Registers Agent A on the ERC-8004 registry deployed to Celo Alfajores.
 * After running, visit https://8004scan.io to verify your agent's on-chain identity.
 *
 * Usage: npm run register
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "../../sdk/src/client.js";

const REGISTRY_ADDRESS = process.env["REGISTRY_ADDRESS"] as Address;
const RPC_URL          = process.env["RPC_URL"] ?? "https://alfajores-forno.celo-testnet.org";
const agentAKey        = process.env["AGENT_A_PRIVATE_KEY"] as Hex;
const agentBKey        = process.env["AGENT_B_PRIVATE_KEY"] as Hex;

// MockAgentRegistry ABI — matches the deployed registry interface
const REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent",        type: "address" },
      { name: "initialScore", type: "uint256" },
    ],
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
    name: "getReputationScore",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "score", type: "uint256" }],
  },
] as const;

async function registerAgent(label: string, agentKey: Hex): Promise<void> {
  const agentAccount = privateKeyToAccount(agentKey);
  const publicClient  = createPublicClient({ chain: celoAlfajores, transport: http(RPC_URL) });
  const walletClient  = createWalletClient({ account: agentAccount, chain: celoAlfajores, transport: http(RPC_URL) });

  console.log(`\n[Register] ${label}: ${agentAccount.address}`);

  // Check if already registered
  const alreadyRegistered = await publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "isRegistered",
    args: [agentAccount.address],
  });

  if (alreadyRegistered) {
    const score = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "getReputationScore",
      args: [agentAccount.address],
    });
    console.log(`           Already registered ✓  reputation: ${score}`);
    return;
  }

  // Register with initial reputation score of 500 (above the 100 minimum)
  const tx = await walletClient.writeContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "register",
    args: [agentAccount.address, 500n],
    account: agentAccount,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx });

  const score = await publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "getReputationScore",
    args: [agentAccount.address],
  });

  console.log(`           Registered ✓  reputation: ${score}  tx: ${tx}`);
  console.log(`           View on 8004scan: https://8004scan.io/agent/${agentAccount.address}`);
}

async function main(): Promise<void> {
  if (!REGISTRY_ADDRESS || !agentAKey || !agentBKey) {
    console.error("Missing REGISTRY_ADDRESS, AGENT_A_PRIVATE_KEY, or AGENT_B_PRIVATE_KEY in .env");
    process.exit(1);
  }

  console.log("\n  CELOPACT PROTOCOL — ERC-8004 AGENT REGISTRATION");
  console.log(`  Registry: ${REGISTRY_ADDRESS}`);
  console.log(`  Network:  Celo Alfajores`);

  await registerAgent("Agent A (buyer)", agentAKey);
  await registerAgent("Agent B (seller)", agentBKey);

  console.log("\n✓ Registration complete. Both agents are ready for escrow.\n");
}

main().catch((err: unknown) => {
  console.error("Registration failed:", err);
  process.exit(1);
});
