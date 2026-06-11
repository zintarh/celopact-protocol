/**
 * Example 01: Create Escrow → Submit Milestone → Oracle Release
 *
 * This is the happy path for CeloPact: Agent A hires Agent B for a two-milestone
 * job, Agent B completes the first milestone, an oracle attests to the quality,
 * and the payment releases instantly without waiting for the challenge window.
 *
 * This pattern is the backbone of autonomous agent commerce on Celo: no human
 * intermediary, no manual invoicing — just on-chain agreements and cryptographic
 * proof of work.
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
import { signMessage } from "viem/accounts";
import {
  CeloPact,
  celoCeloSepolia,
  ERC20_ABI,
  MilestoneState,
  type CeloPactConfig,
} from "@celopact/sdk";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Load and validate environment variables
//
// We require all secrets up front so the example fails fast with a clear
// message rather than crashing mid-transaction if something is missing.
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
const TOKEN_ADDRESS    = requireEnv("TOKEN_ADDRESS") as Address;
const RPC_URL          = requireEnv("RPC_URL");
const AGENT_A_KEY      = requireEnv("AGENT_A_PRIVATE_KEY") as Hex;
const AGENT_B_KEY      = requireEnv("AGENT_B_PRIVATE_KEY") as Hex;
const ORACLE_KEY       = requireEnv("ORACLE_PRIVATE_KEY") as Hex;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Create two CeloPact SDK instances — one per agent
//
// Each SDK instance holds a private key and sends transactions on behalf of
// that agent. Agent A creates and funds the escrow; Agent B submits work.
// The oracle is used directly via viem/accounts (it doesn't need an SDK
// instance because it only signs messages, not transactions).
// ─────────────────────────────────────────────────────────────────────────────

const baseConfig: Omit<CeloPactConfig, "privateKey"> = {
  contractAddress: CONTRACT_ADDRESS,
  tokenAddress: TOKEN_ADDRESS,
  rpcUrl: RPC_URL,
};

const sdkA = new CeloPact({ ...baseConfig, privateKey: AGENT_A_KEY });
const sdkB = new CeloPact({ ...baseConfig, privateKey: AGENT_B_KEY });

console.log("\n  CELOPACT EXAMPLE 01 — Create and Release");
console.log("  ─────────────────────────────────────────");
console.log(`  Agent A:  ${sdkA.agentAddress}`);
console.log(`  Agent B:  ${sdkB.agentAddress}`);
console.log(`  Contract: ${CONTRACT_ADDRESS}`);
console.log(`  Token:    ${TOKEN_ADDRESS}`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Read token decimals on-chain
//
// The SDK is token-agnostic. USDm has 18 decimals; USDT has 6. We NEVER
// hardcode the decimal count — we always read it from the contract. This way
// the same code works on testnet (USDm) and mainnet (USDT) without changes.
// ─────────────────────────────────────────────────────────────────────────────

const publicClient = createPublicClient({
  chain: celoCeloSepolia,
  transport: http(RPC_URL),
});

const decimals = await publicClient.readContract({
  address: TOKEN_ADDRESS,
  abi: ERC20_ABI,
  functionName: "decimals",
}) as number;

console.log(`\n  Token decimals: ${decimals}`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Agent A creates a 2-milestone escrow
//
// parseUnits converts human-readable amounts ("0.001") to on-chain base units,
// respecting the token's decimal count. The SDK automatically approves the
// escrow contract to pull the total amount from Agent A's wallet before
// calling createEscrow on-chain.
//
// The contract assigns sequential escrow IDs starting from 1. The SDK parses
// the EscrowCreated event from the receipt to return the actual ID.
// ─────────────────────────────────────────────────────────────────────────────

const milestone0Amount = parseUnits("0.001", decimals);
const milestone1Amount = parseUnits("0.002", decimals);

console.log(`\n  Step 1: Agent A creates 2-milestone escrow`);
console.log(`          Milestone 0: ${formatUnits(milestone0Amount, decimals)} tokens`);
console.log(`          Milestone 1: ${formatUnits(milestone1Amount, decimals)} tokens`);

const { escrowId, txHash: createTxHash } = await sdkA.createEscrow({
  agentB: sdkB.agentAddress,
  amounts: [milestone0Amount, milestone1Amount],
});

console.log(`          Escrow ID:  ${escrowId}`);
console.log(`          Tx:         ${createTxHash}`);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Agent B submits Milestone 0
//
// The outputHash is a keccak256 of the work product. In production this would
// be a hash of a file, a structured result, or any deterministic output that
// the oracle (or Agent A) can verify. Here we use a fixed string for clarity.
//
// Submitting starts a CHALLENGE_WINDOW (30 min on testnet, 24h on mainnet).
// Agent A can either dispute during this window, or let it expire to release
// payment optimistically. The oracle shortcut lets us skip the wait entirely.
// ─────────────────────────────────────────────────────────────────────────────

const deliverable0 = "Agent B completed milestone 0: data analysis report delivered";
const outputHash0 = keccak256(encodePacked(["string"], [deliverable0])) as Hex;

console.log(`\n  Step 2: Agent B submits Milestone 0`);
console.log(`          Deliverable: "${deliverable0}"`);
console.log(`          Output hash: ${outputHash0.slice(0, 18)}...`);

const submitTxHash = await sdkB.submitMilestone({
  escrowId,
  milestoneIndex: 0n,
  outputHash: outputHash0,
});

console.log(`          Tx: ${submitTxHash}`);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Oracle signs a quality attestation for Milestone 0
//
// The oracle is a trusted third party (in production: a Phala TEE) that
// inspects the deliverable and cryptographically attests to its quality.
//
// The contract's _recoverSigner function reconstructs the signer from the
// signature. The message it expects is:
//   keccak256(abi.encodePacked(escrowId, milestoneIndex, outputHash))
//
// We sign this raw hash (no EIP-191 prefix) using viem's signMessage with
// `message: { raw: ... }`. Using the string form of signMessage would add
// the "\x19Ethereum Signed Message:\n32" prefix, which would make
// ecrecover return a different address — and the contract would reject it.
// ─────────────────────────────────────────────────────────────────────────────

const messageHash = keccak256(
  encodePacked(
    ["uint256", "uint256", "bytes32"],
    [escrowId, 0n, outputHash0]
  )
);

// Convert the hex hash to a Uint8Array for the raw signing call
const messageHashBytes = Buffer.from(messageHash.slice(2), "hex");

const oracleSignature = await signMessage({
  privateKey: ORACLE_KEY,
  message: { raw: messageHashBytes },
});

console.log(`\n  Step 3: Oracle signs attestation for Milestone 0`);
console.log(`          Message hash: ${messageHash.slice(0, 18)}...`);
console.log(`          Signature:    ${oracleSignature.slice(0, 18)}...`);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Agent A calls releaseMilestone with the oracle signature
//
// Passing the oracle's 65-byte signature bypasses the challenge window entirely.
// The contract calls ecrecover on the signature and checks it matches the
// registered oracle address. If it matches, payment releases immediately to
// Agent B.
//
// This is the core trust primitive of CeloPact: you don't need to trust the
// counterparty — you trust the oracle's attestation and the on-chain logic.
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n  Step 4: Agent A releases Milestone 0 (oracle path — instant)`);

const releaseTxHash = await sdkA.releaseMilestone({
  escrowId,
  milestoneIndex: 0n,
  oracleSignature,
});

console.log(`          Tx: ${releaseTxHash}`);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Read final state from chain
//
// getEscrow and getMilestone are read-only calls — no gas needed. We print
// everything so you can see the exact on-chain state and understand what each
// field means. This is also useful for building monitoring dashboards.
// ─────────────────────────────────────────────────────────────────────────────

const escrow = await sdkA.getEscrow(escrowId);
const milestone0 = await sdkA.getMilestone(escrowId, 0n);
const milestone1 = await sdkA.getMilestone(escrowId, 1n);

const stateNames: Record<number, string> = {
  0: "PENDING",
  1: "SUBMITTED",
  2: "RELEASED",
  3: "DISPUTED",
  4: "RESOLVED",
};

console.log(`\n  Final on-chain state`);
console.log(`  ────────────────────`);
console.log(`  Escrow ID:       ${escrowId}`);
console.log(`  Agent A:         ${escrow.agentA}`);
console.log(`  Agent B:         ${escrow.agentB}`);
console.log(`  Total locked:    ${formatUnits(escrow.totalAmount, decimals)} tokens`);
console.log(`  Active:          ${escrow.active}`);
console.log(`  Milestone count: ${escrow.milestoneCount}`);
console.log(``);
console.log(`  Milestone 0:`);
console.log(`    Amount:      ${formatUnits(milestone0.amount, decimals)} tokens`);
console.log(`    State:       ${stateNames[milestone0.state]} (${milestone0.state})`);
console.log(`    Output hash: ${milestone0.outputHash.slice(0, 18)}...`);
console.log(``);
console.log(`  Milestone 1:`);
console.log(`    Amount:      ${formatUnits(milestone1.amount, decimals)} tokens`);
console.log(`    State:       ${stateNames[milestone1.state]} (${milestone1.state})`);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Print summary
//
// All five transaction hashes are printed in a copy-paste-friendly format
// so you can paste them straight into Blockscout or the README.
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n  Transaction summary`);
console.log(`  ────────────────────`);
console.log(`  create:    ${createTxHash}`);
console.log(`  submit0:   ${submitTxHash}`);
console.log(`  release0:  ${releaseTxHash}`);
console.log(``);
console.log(`  View on Blockscout: https://celo-sepolia.blockscout.com`);
console.log(`\n  Example 01 complete.\n`);
