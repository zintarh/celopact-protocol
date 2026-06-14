/**
 * Example 04: Agent Job Market — real-world A2A hire flow
 *
 * Agent A posts a data-analysis job and hires Agent B via milestone escrow.
 * Agent B produces a real JSON deliverable (LLM if OPENAI_API_KEY is set, else
 * deterministic analysis). The oracle verifies content before signing.
 * Agent A receives the report and payment releases to Agent B.
 *
 * Run:
 *   cp .env.example .env
 *   npm install
 *   npm start
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatUnits, type Address, type Hex } from "viem";
import { CeloPact, type CeloPactConfig } from "celopact-sdk";
import { SAMPLE_DATA_ANALYSIS_JOB, Q1_SALES_CSV } from "./job.js";
import { performJob } from "./worker.js";
import { hashDeliverable, signAttestation, verifyDeliverable } from "./oracle.js";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return val;
}

const CONTRACT_ADDRESS = requireEnv("CONTRACT_ADDRESS") as Address;
const TOKEN_ADDRESS = requireEnv("TOKEN_ADDRESS") as Address;
const RPC_URL = requireEnv("RPC_URL");
const AGENT_A_KEY = requireEnv("AGENT_A_PRIVATE_KEY") as Hex;
const AGENT_B_KEY = requireEnv("AGENT_B_PRIVATE_KEY") as Hex;
const ORACLE_KEY = requireEnv("ORACLE_PRIVATE_KEY") as Hex;

const baseConfig: Omit<CeloPactConfig, "privateKey"> = {
  contractAddress: CONTRACT_ADDRESS,
  tokenAddress: TOKEN_ADDRESS,
  rpcUrl: RPC_URL,
  network: "celo-mainnet",
};

const sdkA = new CeloPact({ ...baseConfig, privateKey: AGENT_A_KEY });
const sdkB = new CeloPact({ ...baseConfig, privateKey: AGENT_B_KEY });

const job = SAMPLE_DATA_ANALYSIS_JOB;

console.log("\n  CELOPACT EXAMPLE 04 — Agent Job Market");
console.log("  ─────────────────────────────────────────────");
console.log(`  Job:       ${job.title} (${job.id})`);
console.log(`  Agent A:   ${sdkA.agentAddress}  (posts job + funds escrow)`);
console.log(`  Agent B:   ${sdkB.agentAddress}  (hired specialist)`);
console.log(`  LLM mode:  ${process.env["OPENAI_API_KEY"] ? "OpenAI" : "deterministic worker (set OPENAI_API_KEY for LLM)"}`);
console.log("  ─────────────────────────────────────────────\n");

// ── Step 1: Agent A posts job → create escrow ───────────────────────────────
console.log("[Agent A] Posting job and locking payment in escrow...");
console.log(`          "${job.description.slice(0, 72)}..."`);

const { escrowId, txHash: createTx } = await sdkA.createEscrow({
  agentB: sdkB.agentAddress,
  amounts: job.milestoneAmounts,
});
console.log(`          Escrow #${escrowId} created  tx: ${createTx}\n`);

// ── Step 2: Agent B performs work ───────────────────────────────────────────
console.log("[Agent B] Performing data analysis on Q1 sales dataset...");
const deliverable = await performJob(job, Q1_SALES_CSV);
const outputHash = hashDeliverable(deliverable);

const report = JSON.parse(deliverable) as { generatedBy: string; topProduct: string; recommendation: string };
console.log(`          Deliverable ready (${report.generatedBy})`);
console.log(`          Top product: ${report.topProduct}`);
console.log(`          Insight: ${report.recommendation.slice(0, 80)}...`);
console.log(`          Output hash: ${outputHash.slice(0, 18)}...\n`);

// ── Step 3: Agent B submits deliverable commitment on-chain ─────────────────
console.log("[Agent B] Submitting milestone deliverable hash on-chain...");
const submitTx = await sdkB.submitMilestone({
  escrowId,
  milestoneIndex: 0n,
  outputHash,
});
console.log(`          Submitted  tx: ${submitTx}\n`);

// ── Step 4: Oracle verifies quality → signs attestation ─────────────────────
console.log("[Oracle]  Verifying deliverable matches job requirements...");
verifyDeliverable(deliverable, job.id);
console.log("          Quality check passed ✓");

const oracleSig = await signAttestation(ORACLE_KEY, escrowId, 0n, outputHash);
console.log("          Attestation signed\n");

// ── Step 5: Agent A releases payment; receives deliverable ──────────────────
console.log("[Agent A] Releasing payment to Agent B...");
const releaseTx = await sdkA.releaseMilestone({
  escrowId,
  milestoneIndex: 0n,
  oracleSignature: oracleSig,
});
console.log(`          Released ${formatUnits(job.milestoneAmounts[0]!, 6)} USDT  tx: ${releaseTx}\n`);

const outDir = join(process.cwd(), "deliverables");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `escrow-${escrowId}-${job.deliverable}`);
writeFileSync(outPath, deliverable, "utf8");

console.log("  ─────────────────────────────────────────────");
console.log("  JOB COMPLETE");
console.log(`  Escrow ID:    ${escrowId}`);
console.log(`  Deliverable:  ${outPath}`);
console.log("  Tx hashes:");
console.log(`    create:   ${createTx}`);
console.log(`    submit:   ${submitTx}`);
console.log(`    release:  ${releaseTx}`);
console.log("  ─────────────────────────────────────────────\n");
