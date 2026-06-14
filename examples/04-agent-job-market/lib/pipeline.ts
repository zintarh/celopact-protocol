import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatUnits, type Address, type Hex } from "viem";
import { CeloPact, type CeloPactConfig } from "celopact-sdk";
import { SAMPLE_DATA_ANALYSIS_JOB, Q1_SALES_CSV } from "./job.js";
import { performJob, type AnalysisReport } from "./worker.js";
import { hashDeliverable, signAttestation, verifyDeliverable } from "./oracle.js";

export type StepId = "create" | "work" | "submit" | "verify" | "release" | "complete";

export type LogLevel = "system" | "agent-a" | "agent-b" | "oracle" | "sdk" | "success" | "error" | "tx";

export interface StepEvent {
  kind: "step";
  step: StepId;
  status: "start" | "done" | "error";
  message: string;
  txHash?: string;
  data?: Record<string, unknown>;
}

export interface LogEvent {
  kind: "log";
  level: LogLevel;
  message: string;
  txHash?: string;
}

export type StreamEvent = StepEvent | LogEvent;

export interface JobResult {
  escrowId: string;
  deliverable: string;
  report: AnalysisReport;
  outputHash: string;
  txs: { create: string; submit: string; release: string };
  explorerBase: string;
}

export type StepListener = (event: StreamEvent) => void;

function emit(listener: StepListener | undefined, event: StreamEvent): void {
  listener?.(event);
}

function log(
  listener: StepListener | undefined,
  level: LogLevel,
  message: string,
  txHash?: string
): void {
  emit(listener, { kind: "log", level, message, txHash });
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export function loadConfig() {
  const contractAddress = requireEnv("CONTRACT_ADDRESS") as Address;
  const tokenAddress = requireEnv("TOKEN_ADDRESS") as Address;
  const rpcUrl = requireEnv("RPC_URL");

  const baseConfig: Omit<CeloPactConfig, "privateKey"> = {
    contractAddress,
    tokenAddress,
    rpcUrl,
    network: "celo-mainnet",
  };

  const sdkA = new CeloPact({ ...baseConfig, privateKey: requireEnv("AGENT_A_PRIVATE_KEY") as Hex });
  const sdkB = new CeloPact({ ...baseConfig, privateKey: requireEnv("AGENT_B_PRIVATE_KEY") as Hex });
  const oracleKey = requireEnv("ORACLE_PRIVATE_KEY") as Hex;

  return {
    contractAddress,
    tokenAddress,
    rpcUrl,
    sdkA,
    sdkB,
    oracleKey,
    agentA: sdkA.agentAddress,
    agentB: sdkB.agentAddress,
    llmMode: Boolean(process.env["OPENAI_API_KEY"]),
  };
}

export async function runJobMarket(onStep?: StepListener): Promise<JobResult> {
  const job = SAMPLE_DATA_ANALYSIS_JOB;
  const cfg = loadConfig();
  const { sdkA, sdkB, oracleKey, agentA, agentB, llmMode, contractAddress } = cfg;
  const explorerBase = "https://celoscan.io/tx/";

  log(onStep, "system", "═══════════════════════════════════════════════════════");
  log(onStep, "system", "CELOPACT SDK DEMO — LIVE RUN");
  log(onStep, "system", "Network: celo-mainnet · chain 42220");
  log(onStep, "agent-a", `Agent A (requester): ${agentA}`);
  log(onStep, "agent-b", `Agent B (specialist):  ${agentB}`);
  log(onStep, "sdk", `celopact-sdk · contract ${contractAddress}`);
  log(onStep, "sdk", llmMode ? "Worker: OpenAI (OPENAI_API_KEY set)" : "Worker: deterministic analysis engine");
  log(onStep, "system", `Job: ${job.title} · ${job.id}`);
  log(onStep, "system", "───────────────────────────────────────────────────────");

  emit(onStep, {
    kind: "step",
    step: "create",
    status: "start",
    message: "Agent A posts job and locks 0.5 USDT in milestone escrow",
  });
  log(onStep, "agent-a", `Posting job: "${job.description.slice(0, 60)}…"`);
  log(onStep, "agent-a", "Calling sdk.createEscrow({ agentB, amounts: [500000] }) — 0.5 USDT");

  const { escrowId, txHash: createTx } = await sdkA.createEscrow({
    agentB: sdkB.agentAddress,
    amounts: job.milestoneAmounts,
  });

  emit(onStep, {
    kind: "step",
    step: "create",
    status: "done",
    message: `Escrow #${escrowId} created on Celo mainnet`,
    txHash: createTx,
    data: { escrowId: escrowId.toString() },
  });
  log(onStep, "success", `Escrow #${escrowId} created · USDT locked in contract`, createTx);

  emit(onStep, {
    kind: "step",
    step: "work",
    status: "start",
    message: "Agent B runs Q1 sales analysis and builds deliverable",
  });
  log(onStep, "agent-b", "Loading dataset q1_sales.csv (5 products)…");
  log(onStep, "agent-b", "Running analysis → building JSON deliverable");

  const deliverable = await performJob(job, Q1_SALES_CSV);
  const report = JSON.parse(deliverable) as AnalysisReport;
  const outputHash = hashDeliverable(deliverable);

  emit(onStep, {
    kind: "step",
    step: "work",
    status: "done",
    message: `Report ready (${report.generatedBy}) — top product: ${report.topProduct}`,
    data: { outputHash, report },
  });
  log(onStep, "agent-b", `Deliverable ready (${report.generatedBy})`);
  log(onStep, "agent-b", `Top product: ${report.topProduct} · revenue $${report.totalRevenueUsd.toLocaleString()}`);
  log(onStep, "agent-b", `Output hash: ${outputHash}`);

  emit(onStep, {
    kind: "step",
    step: "submit",
    status: "start",
    message: "Agent B submits deliverable hash on-chain",
  });
  log(onStep, "agent-b", "Calling sdk.submitMilestone({ escrowId, milestoneIndex: 0, outputHash })");

  const submitTx = await sdkB.submitMilestone({
    escrowId,
    milestoneIndex: 0n,
    outputHash,
  });

  emit(onStep, {
    kind: "step",
    step: "submit",
    status: "done",
    message: "Milestone submitted — challenge window open",
    txHash: submitTx,
  });
  log(onStep, "success", "Milestone submitted on-chain", submitTx);

  emit(onStep, {
    kind: "step",
    step: "verify",
    status: "start",
    message: "Oracle verifies JSON report before signing attestation",
  });
  log(onStep, "oracle", "Verifying deliverable: JSON schema, jobId, revenue > 0");

  verifyDeliverable(deliverable, job.id);
  const oracleSig = await signAttestation(oracleKey, escrowId, 0n, outputHash);

  emit(onStep, {
    kind: "step",
    step: "verify",
    status: "done",
    message: "Quality check passed — attestation signed",
  });
  log(onStep, "oracle", "Quality check passed ✓");
  log(onStep, "oracle", `Attestation signed for escrow #${escrowId} milestone 0`);

  emit(onStep, {
    kind: "step",
    step: "release",
    status: "start",
    message: "Agent A releases payment to Agent B",
  });
  log(onStep, "agent-a", "Calling sdk.releaseMilestone({ oracleSignature })");

  const releaseTx = await sdkA.releaseMilestone({
    escrowId,
    milestoneIndex: 0n,
    oracleSignature: oracleSig,
  });

  emit(onStep, {
    kind: "step",
    step: "release",
    status: "done",
    message: `Released ${formatUnits(job.milestoneAmounts[0]!, 6)} USDT to Agent B`,
    txHash: releaseTx,
  });
  log(onStep, "success", `Released ${formatUnits(job.milestoneAmounts[0]!, 6)} USDT → Agent B`, releaseTx);

  const outDir = join(process.cwd(), "deliverables");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `escrow-${escrowId}-${job.deliverable}`);
  writeFileSync(outPath, deliverable, "utf8");

  const result: JobResult = {
    escrowId: escrowId.toString(),
    deliverable,
    report,
    outputHash,
    txs: { create: createTx, submit: submitTx, release: releaseTx },
    explorerBase,
  };

  emit(onStep, {
    kind: "step",
    step: "complete",
    status: "done",
    message: "Job complete — deliverable saved locally",
    data: { result },
  });
  log(onStep, "system", "───────────────────────────────────────────────────────");
  log(onStep, "success", `JOB COMPLETE · escrow #${escrowId}`);
  log(onStep, "system", `Deliverable saved: ${outPath}`);
  log(onStep, "system", "═══════════════════════════════════════════════════════");

  return result;
}
