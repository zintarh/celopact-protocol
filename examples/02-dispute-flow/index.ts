/**
 * Example 02: Dispute Flow
 *
 * Demonstrates what happens when Agent A is unsatisfied with Agent B's work
 * and raises a dispute. A registered arbiter steps in to decide who wins.
 *
 * The dispute mechanism is CeloPact's safety net: Agent A can't just refuse
 * to release payment forever (that would let them steal Agent B's work), and
 * Agent B can't just claim payment for bad output. An impartial arbiter —
 * verified on-chain via ERC-8004 reputation — resolves the conflict fairly.
 *
 * Dispute flow:
 *   1. Agent A creates escrow with 1 milestone
 *   2. Agent B submits the milestone (opens challenge window)
 *   3. Agent A disputes within the challenge window, naming an arbiter
 *   4. Arbiter calls resolveDispute, choosing the winner
 *   5. Funds transfer to the winner; escrow is settled
 *
 * Prerequisites:
 *   - The ARBITER wallet must be registered in the ERC-8004 registry with
 *     a reputation score >= 100. The contract enforces this on-chain.
 *     See contracts/src/AgentRegistry.sol for the registration flow.
 *
 * Run:
 *   cp .env.example .env   # fill in your keys
 *   npm install
 *   npm start
 */

import "dotenv/config";
import {
  createPublicClient,
  http,
  keccak256,
  encodePacked,
  parseUnits,
  formatUnits,
  type Address,
  type Hex,
} from "viem";
import {
  CeloPact,
  ERC20_ABI,
  MilestoneState,
  resolveChain,
  type CeloPactConfig,
} from "celopact-sdk";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Load and validate environment variables
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

const CONTRACT_ADDRESS  = requireEnv("CONTRACT_ADDRESS") as Address;
const TOKEN_ADDRESS     = requireEnv("TOKEN_ADDRESS") as Address;
const RPC_URL           = requireEnv("RPC_URL");
const AGENT_A_KEY       = requireEnv("AGENT_A_PRIVATE_KEY") as Hex;
const AGENT_B_KEY       = requireEnv("AGENT_B_PRIVATE_KEY") as Hex;
const ARBITER_KEY       = requireEnv("ARBITER_PRIVATE_KEY") as Hex;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Create SDK instances — one per participant
//
// Agent A and Agent B each get a full SDK instance. The arbiter also gets one
// because resolveDispute is a write transaction that needs a private key.
// ─────────────────────────────────────────────────────────────────────────────

const baseConfig: Omit<CeloPactConfig, "privateKey"> = {
  contractAddress: CONTRACT_ADDRESS,
  tokenAddress: TOKEN_ADDRESS,
  rpcUrl: RPC_URL,
};

const sdkA       = new CeloPact({ ...baseConfig, privateKey: AGENT_A_KEY });
const sdkB       = new CeloPact({ ...baseConfig, privateKey: AGENT_B_KEY });
const sdkArbiter = new CeloPact({ ...baseConfig, privateKey: ARBITER_KEY });

console.log("\n  CELOPACT EXAMPLE 02 — Dispute Flow");
console.log("  ───────────────────────────────────");
console.log(`  Agent A:  ${sdkA.agentAddress}`);
console.log(`  Agent B:  ${sdkB.agentAddress}`);
console.log(`  Arbiter:  ${sdkArbiter.agentAddress}`);
console.log(`  Contract: ${CONTRACT_ADDRESS}`);
console.log(`  Token:    ${TOKEN_ADDRESS}`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Read token decimals on-chain
//
// Always read decimals from the contract — never assume 6 or 18.
// ─────────────────────────────────────────────────────────────────────────────

const publicClient = createPublicClient({
  chain: resolveChain({ rpcUrl: RPC_URL }),
  transport: http(RPC_URL),
});

const decimals = await publicClient.readContract({
  address: TOKEN_ADDRESS,
  abi: ERC20_ABI,
  functionName: "decimals",
}) as number;

console.log(`\n  Token decimals: ${decimals}`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Agent A creates a single-milestone escrow
//
// We use a modest 0.001 token amount so this example is cheap to run on
// testnet. The total is locked in the escrow contract; neither agent can
// withdraw it unilaterally — only the contract's logic can move it.
// ─────────────────────────────────────────────────────────────────────────────

const milestoneAmount = parseUnits("0.001", decimals);

console.log(`\n  Step 1: Agent A creates 1-milestone escrow`);
console.log(`          Amount: ${formatUnits(milestoneAmount, decimals)} tokens`);

const { escrowId, txHash: createTxHash } = await sdkA.createEscrow({
  agentB: sdkB.agentAddress,
  amounts: [milestoneAmount],
});

console.log(`          Escrow ID: ${escrowId}`);
console.log(`          Tx:        ${createTxHash}`);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Agent B submits the milestone
//
// Agent B claims the work is done by submitting a hash of their output.
// This opens the CHALLENGE_WINDOW during which Agent A can either:
//   - Do nothing → payment releases optimistically after the window expires
//   - Dispute → payment is frozen until an arbiter resolves it
//
// In this example, Agent A will dispute.
// ─────────────────────────────────────────────────────────────────────────────

const deliverable = "Agent B report: analysis complete (Agent A disagrees with quality)";
const outputHash  = keccak256(encodePacked(["string"], [deliverable])) as Hex;

console.log(`\n  Step 2: Agent B submits milestone`);
console.log(`          Output hash: ${outputHash.slice(0, 18)}...`);

const submitTxHash = await sdkB.submitMilestone({
  escrowId,
  milestoneIndex: 0n,
  outputHash,
});

console.log(`          Tx: ${submitTxHash}`);
console.log(`          Challenge window is now open.`);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Agent A disputes the milestone within the challenge window
//
// Agent A nominates a specific arbiter when raising the dispute. The arbiter
// must be an ERC-8004 registered agent with a reputation score >= 100 — the
// contract checks this on-chain at dispute time.
//
// Why does Agent A name the arbiter rather than the protocol picking one
// randomly? It keeps the system flexible: in practice, the two agents would
// agree on an arbiter off-chain before the job starts, then name that same
// address here. The reputation requirement ensures the arbiter has skin in
// the game (their on-chain reputation is at stake).
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n  Step 3: Agent A raises a dispute`);
console.log(`          Proposed arbiter: ${sdkArbiter.agentAddress}`);
console.log(`          NOTE: The arbiter must be ERC-8004 registered with score >= 100.`);
console.log(`                The contract will revert if this requirement is not met.`);

const disputeTxHash = await sdkA.disputeMilestone({
  escrowId,
  milestoneIndex: 0n,
  proposedArbiter: sdkArbiter.agentAddress,
});

console.log(`          Milestone state is now DISPUTED.`);
console.log(`          Tx: ${disputeTxHash}`);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Arbiter resolves the dispute
//
// The arbiter independently reviews the deliverable and decides who wins.
// In this example we arbitrarily decide in favor of Agent B to demonstrate
// the full flow. In a real system the arbiter would fetch the output hash
// from the chain, retrieve the actual deliverable off-chain, evaluate it,
// and then submit their decision.
//
// The `winner` argument must be either agentA or agentB. The contract
// transfers the milestone's locked tokens to the winner and marks the
// milestone as RESOLVED.
// ─────────────────────────────────────────────────────────────────────────────

// In this demonstration the arbiter rules in favor of Agent B (the worker).
// Change this to sdkA.agentAddress to rule in favor of Agent A (the client).
const winner: Address = sdkB.agentAddress;

console.log(`\n  Step 4: Arbiter resolves dispute`);
console.log(`          Winner: ${winner} (Agent B — work accepted)`);

const resolveTxHash = await sdkArbiter.resolveDispute(
  escrowId,
  0n,
  winner,
);

console.log(`          Dispute resolved. Funds transferred to winner.`);
console.log(`          Tx: ${resolveTxHash}`);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Read final on-chain state
// ─────────────────────────────────────────────────────────────────────────────

const escrow    = await sdkA.getEscrow(escrowId);
const milestone = await sdkA.getMilestone(escrowId, 0n);

const stateNames: Record<number, string> = {
  0: "PENDING",
  1: "SUBMITTED",
  2: "RELEASED",
  3: "DISPUTED",
  4: "RESOLVED",
};

console.log(`\n  Final on-chain state`);
console.log(`  ────────────────────`);
console.log(`  Escrow ID:    ${escrowId}`);
console.log(`  Escrow active: ${escrow.active}`);
console.log(`  Milestone 0 state: ${stateNames[milestone.state]} (${milestone.state})`);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Print transaction summary
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n  Transaction summary`);
console.log(`  ────────────────────`);
console.log(`  create:   ${createTxHash}`);
console.log(`  submit:   ${submitTxHash}`);
console.log(`  dispute:  ${disputeTxHash}`);
console.log(`  resolve:  ${resolveTxHash}`);
console.log(``);
console.log(`  View on Blockscout: https://celo-sepolia.blockscout.com`);
console.log(`\n  Example 02 complete.\n`);
