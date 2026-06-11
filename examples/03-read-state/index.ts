/**
 * Example 03: Read Escrow and Milestone State
 *
 * This example requires NO private key. It uses a public client to read
 * on-chain state — perfect for monitoring bots, dashboards, indexers, or
 * any off-chain system that needs to observe escrow status.
 *
 * It demonstrates two complementary approaches:
 *
 *   1. Using the CeloPact SDK convenience methods (getEscrow / getMilestone)
 *      — the recommended path for most applications.
 *
 *   2. Using viem's createPublicClient and readContract directly with the
 *      raw CELOPACT_ESCROW_ABI — useful when you need low-level control,
 *      want to batch calls, or are integrating into a system that already
 *      manages its own viem client.
 *
 * Both approaches talk to the same RPC and produce the same data.
 *
 * Run:
 *   cp .env.example .env   # set ESCROW_ID to an existing escrow on-chain
 *   npm install
 *   npm start
 */

import "dotenv/config";
import { createPublicClient, http, formatUnits, type Address } from "viem";
import {
  celoCeloSepolia,
  CELOPACT_ESCROW_ABI,
  ERC20_ABI,
  MilestoneState,
} from "@celopact/sdk";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Load configuration — no private keys needed
// ─────────────────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing required environment variable: ${name}`);
    console.error(`Copy .env.example to .env and fill in your values.`);
    process.exit(1);
  }
  return val;
}

const CONTRACT_ADDRESS = requireEnv("CONTRACT_ADDRESS") as Address;
const RPC_URL          = requireEnv("RPC_URL");
const ESCROW_ID        = BigInt(requireEnv("ESCROW_ID"));

// ─────────────────────────────────────────────────────────────────────────────
// 2. Create a public client — read-only, no wallet needed
//
// createPublicClient is viem's read-only client. It can query any view or
// pure function on a contract without spending gas. This is what you use for
// dashboards, bots, and any code that only observes rather than mutates state.
// ─────────────────────────────────────────────────────────────────────────────

const client = createPublicClient({
  chain: celoCeloSepolia,
  transport: http(RPC_URL),
});

console.log("\n  CELOPACT EXAMPLE 03 — Read State");
console.log("  ─────────────────────────────────");
console.log(`  Contract: ${CONTRACT_ADDRESS}`);
console.log(`  Escrow:   ${ESCROW_ID}`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Approach A — Using the raw ABI with readContract directly
//
// This is the lowest-level approach. You specify the function name and args
// as strings and viem handles the ABI encoding/decoding. Useful when you want
// to skip the SDK class or read multiple contracts in a multicall batch.
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n  Reading escrow via raw ABI (low-level approach)`);

const rawEscrow = await client.readContract({
  address: CONTRACT_ADDRESS,
  abi: CELOPACT_ESCROW_ABI,
  functionName: "getEscrow",
  args: [ESCROW_ID],
}) as [Address, Address, bigint, boolean, bigint];

const [agentA, agentB, totalAmount, active, milestoneCount] = rawEscrow;

// To display amounts in human-readable form we need the token address.
// We read it from the contract's stored state by looking up agentA's balance
// address — but simpler: we read the CHALLENGE_WINDOW as a sanity check and
// find the token address from the first milestone's data. For this read-only
// example we ask the user to optionally provide TOKEN_ADDRESS.
//
// If TOKEN_ADDRESS is not provided we display raw bigint amounts.
const TOKEN_ADDRESS = (process.env["TOKEN_ADDRESS"] ?? "") as Address;
let decimals = 0;
if (TOKEN_ADDRESS) {
  decimals = await client.readContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
  }) as number;
}

const formatAmount = (n: bigint): string =>
  decimals > 0 ? `${formatUnits(n, decimals)} tokens` : `${n} base units`;

console.log(`\n  Escrow #${ESCROW_ID}`);
console.log(`  ─────────────────────────────────────────────`);
console.log(`  Agent A (client):  ${agentA}`);
console.log(`  Agent B (worker):  ${agentB}`);
console.log(`  Total locked:      ${formatAmount(totalAmount)}`);
console.log(`  Active:            ${active}`);
console.log(`  Milestone count:   ${milestoneCount}`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Read all milestones
//
// We loop from index 0 to milestoneCount - 1, reading each milestone's state.
// This is more reliable than assuming you know how many milestones exist —
// always derive it from the on-chain data.
//
// Milestone state is stored as a uint8 enum. We map it to a name for display.
// These names mirror the MilestoneState enum in the SDK's types.ts.
// ─────────────────────────────────────────────────────────────────────────────

const STATE_NAMES: Record<number, string> = {
  [MilestoneState.PENDING]:   "PENDING   — work not yet submitted",
  [MilestoneState.SUBMITTED]: "SUBMITTED — work delivered, challenge window open",
  [MilestoneState.RELEASED]:  "RELEASED  — payment sent to Agent B",
  [MilestoneState.DISPUTED]:  "DISPUTED  — under arbiter review",
  [MilestoneState.RESOLVED]:  "RESOLVED  — arbiter ruling applied",
};

console.log(`\n  Milestones (reading via raw ABI)`);
console.log(`  ─────────────────────────────────────────────`);

for (let i = 0n; i < milestoneCount; i++) {
  const rawMilestone = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: CELOPACT_ESCROW_ABI,
    functionName: "getMilestone",
    args: [ESCROW_ID, i],
  }) as [bigint, `0x${string}`, bigint, number, Address];

  const [amount, outputHash, submittedAt, state, arbiter] = rawMilestone;

  const submittedAtStr = submittedAt === 0n
    ? "not yet submitted"
    : new Date(Number(submittedAt) * 1000).toISOString();

  console.log(`\n  Milestone ${i}`);
  console.log(`    Amount:       ${formatAmount(amount)}`);
  console.log(`    State:        ${STATE_NAMES[state] ?? `UNKNOWN (${state})`}`);
  console.log(`    Output hash:  ${outputHash === "0x0000000000000000000000000000000000000000000000000000000000000000"
    ? "(none — not yet submitted)"
    : outputHash}`);
  console.log(`    Submitted at: ${submittedAtStr}`);
  console.log(`    Arbiter:      ${arbiter === "0x0000000000000000000000000000000000000000"
    ? "(none — not disputed)"
    : arbiter}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Approach B — Using the CELOPACT_ESCROW_ABI in a monitoring context
//
// Here we show how you'd use this in a monitoring bot that polls for escrow
// state changes. The key pattern: keep the publicClient alive and re-call
// readContract whenever you need fresh data. No subscriptions needed for
// simple polling — just a setInterval around this same code.
//
// For event-driven monitoring (reacting to on-chain events in real time),
// use client.watchContractEvent() with CELOPACT_ESCROW_ABI and the event
// name (e.g. "MilestoneSubmitted"). That is outside the scope of this
// example but follows directly from this pattern.
// ─────────────────────────────────────────────────────────────────────────────

const challengeWindow = await client.readContract({
  address: CONTRACT_ADDRESS,
  abi: CELOPACT_ESCROW_ABI,
  functionName: "CHALLENGE_WINDOW",
}) as bigint;

console.log(`\n  Contract metadata`);
console.log(`  ─────────────────────────────────────────────`);
console.log(`  CHALLENGE_WINDOW: ${challengeWindow}s (${Number(challengeWindow) / 60} minutes)`);

console.log(`\n  Example 03 complete.`);
console.log(`  This example required zero gas — pure read-only RPC calls.\n`);
