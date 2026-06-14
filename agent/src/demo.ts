/**
 * CeloPact Full Lifecycle Demo
 *
 * Demonstrates a complete escrow lifecycle using the CeloPact SDK:
 *   1. Agent A creates a 2-milestone escrow (SDK handles token approval)
 *   2. Agent B submits Milestone 0 with an output hash
 *   3. Oracle signs a quality attestation → Milestone 0 releases immediately
 *   4. Agent B submits Milestone 1
 *   5. Oracle signs → Milestone 1 releases (full escrow complete)
 *
 * Works with any ERC-20: reads token decimals on-chain so you can use
 * USDm (18 decimals) or USDT (6 decimals) — just set TOKEN_ADDRESS in .env.
 *
 * Run with: npm run demo
 * Run 10x:  DEMO_RUNS=10 npm run demo
 */

import "dotenv/config";
import {
  createPublicClient,
  http,
  keccak256,
  encodePacked,
  parseUnits,
  formatUnits,
  type Hex,
  type Address,
} from "viem";
import {
  CeloPact,
  ERC20_ABI,
  resolveChain,
  type CeloNetworkName,
  type CeloPactConfig,
} from "celopact-sdk";
import { DemoOracle } from "./oracle.js";

// ── Config ───────────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = process.env["CONTRACT_ADDRESS"] as Address;
const TOKEN_ADDRESS    = (process.env["TOKEN_ADDRESS"] ?? process.env["USDT_ADDRESS"]) as Address;
const NETWORK          = (process.env["NETWORK"] ?? "celo-mainnet") as CeloNetworkName;
const RPC_URL          = process.env["RPC_URL"] ?? "https://forno.celo.org";

const agentAKey = process.env["AGENT_A_PRIVATE_KEY"] as Hex;
const agentBKey = process.env["AGENT_B_PRIVATE_KEY"] as Hex;
const oracleKey = process.env["ORACLE_PRIVATE_KEY"]  as Hex;

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

  const oracle = new DemoOracle(oracleKey);

  const baseConfig: Omit<CeloPactConfig, "privateKey"> = {
    contractAddress: CONTRACT_ADDRESS,
    tokenAddress: TOKEN_ADDRESS,
    rpcUrl: RPC_URL,
    network: NETWORK,
  };

  const sdkA = new CeloPact({ ...baseConfig, privateKey: agentAKey });
  const sdkB = new CeloPact({ ...baseConfig, privateKey: agentBKey });

  log("Agents", `Agent A: ${sdkA.agentAddress}`);
  log("       ", `Agent B: ${sdkB.agentAddress}`);
  log("Oracle ", `Oracle:  ${oracle.address}`);

  // ── STEP 1: Agent A creates escrow ─────────────────────────────────────────
  // SDK automatically approves the escrow contract to spend tokens before
  // calling createEscrow — no separate approve transaction needed.
  const m0 = parseUnits("0.001", decimals);
  const m1 = parseUnits("0.002", decimals);
  log("Step 1", `Agent A creates 2-milestone escrow (${formatUnits(m0 + m1, decimals)} tokens total)`);

  const { escrowId, txHash: createTx } = await sdkA.createEscrow({
    agentB: sdkB.agentAddress,
    amounts: [m0, m1],
  });
  log("       ", `Escrow created ✓  id: ${escrowId}  tx: ${createTx}`);

  // ── STEP 2: Agent B submits Milestone 0 ────────────────────────────────────
  const outputHash0: Hex = keccak256(
    encodePacked(["string"], [`run${runIndex}_milestone0_output`])
  );
  log("Step 2", `Agent B submits Milestone 0  hash: ${outputHash0.slice(0, 18)}...`);

  const submitTx0 = await sdkB.submitMilestone({
    escrowId,
    milestoneIndex: 0n,
    outputHash: outputHash0,
  });
  log("       ", `Submitted ✓  tx: ${submitTx0}`);

  // ── STEP 3: Oracle signs attestation → immediate release ───────────────────
  log("Step 3", "Oracle signs quality attestation for Milestone 0");
  const oracleSig = await oracle.signAttestation(escrowId, 0n, outputHash0);

  const releaseTx0 = await sdkA.releaseMilestone({
    escrowId,
    milestoneIndex: 0n,
    oracleSignature: oracleSig,
  });
  log(
    "       ",
    `Milestone 0 RELEASED ✓  ${formatUnits(m0, decimals)} tokens → Agent B  tx: ${releaseTx0}`
  );

  // ── STEP 4: Agent B submits Milestone 1 ────────────────────────────────────
  const outputHash1: Hex = keccak256(
    encodePacked(["string"], [`run${runIndex}_milestone1_output`])
  );
  log("Step 4", `Agent B submits Milestone 1  hash: ${outputHash1.slice(0, 18)}...`);

  const submitTx1 = await sdkB.submitMilestone({
    escrowId,
    milestoneIndex: 1n,
    outputHash: outputHash1,
  });
  log("       ", `Submitted ✓  tx: ${submitTx1}`);

  // ── STEP 5: Oracle signs attestation → release Milestone 1 ─────────────────
  log("Step 5", "Oracle signs quality attestation for Milestone 1");
  const oracleSig1 = await oracle.signAttestation(escrowId, 1n, outputHash1);

  const releaseTx1 = await sdkA.releaseMilestone({
    escrowId,
    milestoneIndex: 1n,
    oracleSignature: oracleSig1,
  });
  log(
    "       ",
    `Milestone 1 RELEASED ✓  ${formatUnits(m1, decimals)} tokens → Agent B  tx: ${releaseTx1}`
  );

  separator();
  console.log(`\n  RUN #${runIndex} COMPLETE — 5 on-chain transactions`);
  console.log(`  Escrow ID: ${escrowId}`);
  console.log(`  Tx hashes (paste into README.md):`);
  console.log(`    create:    ${createTx}`);
  console.log(`    submit0:   ${submitTx0}`);
  console.log(`    release0:  ${releaseTx0}`);
  console.log(`    submit1:   ${submitTx1}`);
  console.log(`    release1:  ${releaseTx1}`);
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

  const chain = resolveChain({ network: NETWORK, rpcUrl: RPC_URL });
  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });

  const decimals = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
  }) as number;

  console.log("\n  CELOPACT PROTOCOL — AGENT DEMO");
  console.log(`  Runs:     ${DEMO_RUNS}  |  Network: ${NETWORK} (chain ${chain.id})`);
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
