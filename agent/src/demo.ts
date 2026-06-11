/**
 * CeloPact Full Lifecycle Demo
 *
 * Demonstrates a complete escrow lifecycle on Celo Sepolia:
 *   1. Agent A approves the stablecoin and creates a 2-milestone escrow
 *   2. Agent B submits Milestone 0 with an output hash
 *   3. Oracle signs a quality attestation → Milestone 0 releases immediately
 *   4. Agent B submits Milestone 1 (challenge window: 30 min)
 *
 * Works with any ERC-20: reads token decimals on-chain so you can use
 * USDm (18 decimals, from Celo faucet) or USDT (6 decimals) without
 * changing any code — just set TOKEN_ADDRESS in .env.
 *
 * Run with: npm run demo
 * Run 10x:  DEMO_RUNS=10 npm run demo
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  encodePacked,
  parseUnits,
  formatUnits,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount, signMessage } from "viem/accounts";
import { celoCeloSepolia } from "../../sdk/src/client.js";
import { CELOPACT_ESCROW_ABI, ERC20_ABI } from "../../sdk/src/abi.js";

// ── Config ───────────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = process.env["CONTRACT_ADDRESS"] as Address;
const TOKEN_ADDRESS    = process.env["TOKEN_ADDRESS"] ?? process.env["USDT_ADDRESS"] as Address;
const RPC_URL          = process.env["RPC_URL"] ?? "https://forno.celo-sepolia.celo-testnet.org";

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

async function runDemo(runIndex: number, decimals: number): Promise<void> {
  separator();
  console.log(`\n  CELOPACT DEMO RUN #${runIndex}`);
  separator();

  const agentA  = privateKeyToAccount(agentAKey);
  const agentB  = privateKeyToAccount(agentBKey);
  const oracle  = privateKeyToAccount(oracleKey);

  const publicClient = createPublicClient({ chain: celoCeloSepolia, transport: http(RPC_URL) });
  const walletA = createWalletClient({ account: agentA, chain: celoCeloSepolia, transport: http(RPC_URL) });
  const walletB = createWalletClient({ account: agentB, chain: celoCeloSepolia, transport: http(RPC_URL) });

  log("Agents", `Agent A: ${agentA.address}`);
  log("       ", `Agent B: ${agentB.address}`);
  log("Oracle ", `Oracle:  ${oracle.address}`);

  // ── STEP 1: Agent A approves token spending ─────────────────────────────
  log("Step 1", `Agent A approves token for escrow contract (decimals: ${decimals})`);
  const approveAmount = parseUnits("100", decimals);
  const approveTx = await walletA.writeContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [CONTRACT_ADDRESS, approveAmount],
    account: agentA,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  log("       ", `Approved ✓  tx: ${approveTx}`);

  // ── STEP 2: Agent A creates escrow with 2 milestones ───────────────────
  const m0 = parseUnits("2", decimals);
  const m1 = parseUnits("3", decimals);
  log("Step 2", `Agent A creates escrow — 2 tokens milestone 0, 3 tokens milestone 1`);
  const amounts: bigint[] = [m0, m1];
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

  const releaseTx0 = await walletA.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CELOPACT_ESCROW_ABI,
    functionName: "releaseMilestone",
    args: [escrowId, 0n, oracleSig],
    account: agentA,
  });
  await publicClient.waitForTransactionReceipt({ hash: releaseTx0 });
  log("       ", `Milestone 0 RELEASED ✓  ${formatUnits(m0, decimals)} tokens → Agent B  tx: ${releaseTx0}`);

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
  log("       ", `Submitted ✓  tx: ${submitTx1}  (30-min challenge window open)`);

  separator();
  console.log(`\n  RUN #${runIndex} COMPLETE — 5 on-chain transactions`);
  console.log(`  Escrow ID: ${escrowId}`);
  console.log(`  Tx hashes (paste into README.md):`);
  console.log(`    approve:   ${approveTx}`);
  console.log(`    create:    ${createTx}`);
  console.log(`    submit0:   ${submitTx0}`);
  console.log(`    release0:  ${releaseTx0}`);
  console.log(`    submit1:   ${submitTx1}`);
  separator();
}

async function main(): Promise<void> {
  if (!CONTRACT_ADDRESS || !TOKEN_ADDRESS || !agentAKey || !agentBKey || !oracleKey) {
    console.error(
      "Missing required .env variables.\n" +
      "Need: CONTRACT_ADDRESS, TOKEN_ADDRESS (or USDT_ADDRESS), " +
      "AGENT_A_PRIVATE_KEY, AGENT_B_PRIVATE_KEY, ORACLE_PRIVATE_KEY"
    );
    process.exit(1);
  }

  // Read decimals on-chain so USDm (18) and USDT (6) both work without code changes
  const publicClient = createPublicClient({ chain: celoCeloSepolia, transport: http(RPC_URL) });
  const decimals = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
  }) as number;

  console.log("\n  CELOPACT PROTOCOL — AGENT DEMO");
  console.log(`  Runs:     ${DEMO_RUNS}  |  Network: Celo Sepolia`);
  console.log(`  Contract: ${CONTRACT_ADDRESS}`);
  console.log(`  Token:    ${TOKEN_ADDRESS} (${decimals} decimals)`);

  for (let i = 1; i <= DEMO_RUNS; i++) {
    await runDemo(i, decimals);
  }

  console.log(`\n✓ All ${DEMO_RUNS} demo run(s) complete.`);
  console.log("  Copy the tx hashes above into the README.md Demo Transactions table.\n");
}

main().catch((err: unknown) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
