/**
 * CeloPact Full Lifecycle Demo
 *
 * Demonstrates a complete escrow lifecycle on Celo Alfajores:
 *   1. Agent A creates a 2-milestone escrow and locks 5 cUSD
 *   2. Agent B submits Milestone 1 with an output hash
 *   3. Oracle signs a quality attestation → Milestone 1 releases immediately
 *   4. Agent B submits Milestone 2
 *   5. Optimistic release: wait 30 min challenge window, then release
 *      (in demo mode we warp time via Anvil — or just show both paths)
 *
 * Run with: npm run demo
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  encodePacked,
  parseUnits,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount, signMessage } from "viem/accounts";
import { celoAlfajores } from "../../sdk/src/client.js";
import { CELOPACT_ESCROW_ABI, ERC20_ABI } from "../../sdk/src/abi.js";

// ── Config from environment ──────────────────────────────────────────────────
const CONTRACT_ADDRESS = process.env["CONTRACT_ADDRESS"] as Address;
const USDT_ADDRESS     = process.env["USDT_ADDRESS"]     as Address;
const RPC_URL          = process.env["RPC_URL"] ?? "https://alfajores-forno.celo-testnet.org";

const agentAKey  = process.env["AGENT_A_PRIVATE_KEY"] as Hex;
const agentBKey  = process.env["AGENT_B_PRIVATE_KEY"] as Hex;
const oracleKey  = process.env["ORACLE_PRIVATE_KEY"]  as Hex;

const DEMO_RUNS = parseInt(process.env["DEMO_RUNS"] ?? "1", 10);

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(step: string, detail: string): void {
  console.log(`\n[CeloPact] ${step}`);
  console.log(`           ${detail}`);
}

function separator(): void {
  console.log("\n" + "─".repeat(60));
}

// ── Main demo ────────────────────────────────────────────────────────────────

async function runDemo(runIndex: number): Promise<void> {
  separator();
  console.log(`\n  CELOPACT DEMO RUN #${runIndex}`);
  separator();

  const agentA  = privateKeyToAccount(agentAKey);
  const agentB  = privateKeyToAccount(agentBKey);
  const oracle  = privateKeyToAccount(oracleKey);

  const publicClient = createPublicClient({ chain: celoAlfajores, transport: http(RPC_URL) });
  const walletA = createWalletClient({ account: agentA, chain: celoAlfajores, transport: http(RPC_URL) });
  const walletB = createWalletClient({ account: agentB, chain: celoAlfajores, transport: http(RPC_URL) });

  log("Agents", `Agent A: ${agentA.address}`);
  log("       ", `Agent B: ${agentB.address}`);
  log("Oracle ", `Oracle:  ${oracle.address}`);

  // ── STEP 1: Agent A approves USDT spending ──────────────────────────────
  log("Step 1", "Agent A approves USDT for escrow contract");
  const approveTx = await walletA.writeContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [CONTRACT_ADDRESS, parseUnits("100", 6)],
    account: agentA,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  log("       ", `Approved ✓  tx: ${approveTx}`);

  // ── STEP 2: Agent A creates escrow with 2 milestones ───────────────────
  log("Step 2", "Agent A creates escrow — 2 USDT milestone 1, 3 USDT milestone 2");
  const amounts: bigint[] = [parseUnits("2", 6), parseUnits("3", 6)];
  const createTx = await walletA.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CELOPACT_ESCROW_ABI,
    functionName: "createEscrow",
    args: [agentB.address, amounts],
    account: agentA,
  });
  await publicClient.waitForTransactionReceipt({ hash: createTx });
  const escrowCount = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CELOPACT_ESCROW_ABI,
    functionName: "escrowCount",
  }) as bigint;
  const escrowId = escrowCount;
  log("       ", `Escrow created ✓  id: ${escrowId}  tx: ${createTx}`);

  // ── STEP 3: Agent B submits Milestone 0 ────────────────────────────────
  const outputHash0: Hex = keccak256(encodePacked(["string"], [`run${runIndex}_milestone0_output`]));
  log("Step 3", `Agent B submits Milestone 0  hash: ${outputHash0.slice(0, 18)}...`);
  const submitTx0 = await walletB.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CELOPACT_ESCROW_ABI,
    functionName: "submitMilestone",
    args: [escrowId, 0n, outputHash0],
    account: agentB,
  });
  await publicClient.waitForTransactionReceipt({ hash: submitTx0 });
  log("       ", `Submitted ✓  tx: ${submitTx0}`);

  // ── STEP 4: Oracle signs attestation → immediate release ───────────────
  log("Step 4", "Oracle signs quality attestation for Milestone 0");
  const messageHash = keccak256(
    encodePacked(["uint256", "uint256", "bytes32"], [escrowId, 0n, outputHash0])
  );
  const oracleSig = await signMessage({
    privateKey: oracleKey,
    message: { raw: Buffer.from(messageHash.slice(2), "hex") },
  });
  log("       ", `Attestation signed ✓  sig: ${oracleSig.slice(0, 18)}...`);

  const releaseTx0 = await walletA.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CELOPACT_ESCROW_ABI,
    functionName: "releaseMilestone",
    args: [escrowId, 0n, oracleSig],
    account: agentA,
  });
  await publicClient.waitForTransactionReceipt({ hash: releaseTx0 });
  log("       ", `Milestone 0 RELEASED ✓  2 USDT → Agent B  tx: ${releaseTx0}`);

  // ── STEP 5: Agent B submits Milestone 1 ────────────────────────────────
  const outputHash1: Hex = keccak256(encodePacked(["string"], [`run${runIndex}_milestone1_output`]));
  log("Step 5", `Agent B submits Milestone 1  hash: ${outputHash1.slice(0, 18)}...`);
  const submitTx1 = await walletB.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CELOPACT_ESCROW_ABI,
    functionName: "submitMilestone",
    args: [escrowId, 1n, outputHash1],
    account: agentB,
  });
  await publicClient.waitForTransactionReceipt({ hash: submitTx1 });
  log("       ", `Submitted ✓  tx: ${submitTx1}  (challenge window: 30 min)`);

  separator();
  console.log(`\n  RUN #${runIndex} COMPLETE — 5 on-chain transactions`);
  console.log(`  Escrow ID: ${escrowId}`);
  console.log(`  Tx hashes:`);
  console.log(`    Approve:   ${approveTx}`);
  console.log(`    Create:    ${createTx}`);
  console.log(`    Submit 0:  ${submitTx0}`);
  console.log(`    Release 0: ${releaseTx0}`);
  console.log(`    Submit 1:  ${submitTx1}`);
  separator();
}

async function main(): Promise<void> {
  if (!CONTRACT_ADDRESS || !USDT_ADDRESS || !agentAKey || !agentBKey || !oracleKey) {
    console.error("Missing required environment variables. Copy .env.example to .env and fill in values.");
    process.exit(1);
  }

  console.log("\n  CELOPACT PROTOCOL — AGENT DEMO");
  console.log(`  Runs: ${DEMO_RUNS}  |  Network: Celo Alfajores`);
  console.log(`  Contract: ${CONTRACT_ADDRESS}`);

  for (let i = 1; i <= DEMO_RUNS; i++) {
    await runDemo(i);
  }

  console.log(`\n✓ All ${DEMO_RUNS} demo run(s) complete.`);
  console.log("  Paste the transaction hashes above into README.md\n");
}

main().catch((err: unknown) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
