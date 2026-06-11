/**
 * CeloPact Agent — Entry Point
 *
 * This agent is registered on ERC-8004 and uses the CeloPact Protocol to
 * participate in milestone-based escrow on Celo. It demonstrates real
 * agent-to-agent commerce: locking payment, submitting verifiable work,
 * and releasing funds only when quality is confirmed.
 *
 * Commands:
 *   npm run register  — Register on ERC-8004 registry
 *   npm run demo      — Run full escrow lifecycle (DEMO_RUNS times)
 *   npm start         — Print status and available actions
 */

import "dotenv/config";
import { createPublicClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoCeloSepolia } from "../../sdk/src/client.js";
import { CELOPACT_ESCROW_ABI } from "../../sdk/src/abi.js";

const CONTRACT_ADDRESS  = process.env["CONTRACT_ADDRESS"] as Address;
const REGISTRY_ADDRESS  = process.env["REGISTRY_ADDRESS"] as Address;
const RPC_URL           = process.env["RPC_URL"] ?? "https://forno.celo-sepolia.celo-testnet.org";
const agentAKey         = process.env["AGENT_A_PRIVATE_KEY"] as Hex;

const REGISTRY_ABI = [
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

async function main(): Promise<void> {
  const agentA      = privateKeyToAccount(agentAKey);
  const publicClient = createPublicClient({ chain: celoCeloSepolia, transport: http(RPC_URL) });

  console.log("\n  CELOPACT PROTOCOL AGENT");
  console.log("  ─────────────────────────────────────────────");
  console.log(`  Address:  ${agentA.address}`);
  console.log(`  Network:  Celo Sepolia (chain ID 11142220)`);
  console.log(`  Contract: ${CONTRACT_ADDRESS ?? "(not set)"}`);
  console.log(`  Registry: ${REGISTRY_ADDRESS ?? "(not set)"}`);

  if (REGISTRY_ADDRESS && agentAKey) {
    const [registered, score] = await Promise.all([
      publicClient.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "isRegistered",
        args: [agentA.address],
      }),
      publicClient.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "getReputationScore",
        args: [agentA.address],
      }),
    ]);

    console.log(`\n  ERC-8004 Status:`);
    console.log(`    Registered:  ${registered ? "✓ YES" : "✗ NO — run: npm run register"}`);
    console.log(`    Reputation:  ${score}`);
    console.log(`    8004scan:    https://8004scan.io/agent/${agentA.address}`);
  }

  if (CONTRACT_ADDRESS) {
    const escrowCount = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CELOPACT_ESCROW_ABI,
      functionName: "escrowCount",
    }) as bigint;
    console.log(`\n  Protocol Stats:`);
    console.log(`    Total Escrows: ${escrowCount}`);
    console.log(`    Blockscout:    https://celo-sepolia.blockscout.com/address/${CONTRACT_ADDRESS}`);
  }

  console.log("\n  Available Commands:");
  console.log("    npm run register   Register this agent on ERC-8004");
  console.log("    npm run demo       Run the full escrow lifecycle demo");
  console.log("  ─────────────────────────────────────────────\n");
}

main().catch((err: unknown) => {
  console.error("Agent startup failed:", err);
  process.exit(1);
});
