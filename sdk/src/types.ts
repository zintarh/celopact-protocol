import type { Address, Hash, Hex } from "viem";

// ─────────────────────────────────────────────────────────────────────────────
// Milestone States — mirrors CeloPactEscrow.sol MilestoneState enum
// ─────────────────────────────────────────────────────────────────────────────

export enum MilestoneState {
  PENDING   = 0,
  SUBMITTED = 1,
  RELEASED  = 2,
  DISPUTED  = 3,
  RESOLVED  = 4,
}

// ─────────────────────────────────────────────────────────────────────────────
// Input / Output Types
// ─────────────────────────────────────────────────────────────────────────────

/** Parameters required to open a new escrow agreement. */
export interface CreateEscrowParams {
  /** ERC-8004 registered address of the specialist agent being hired. */
  agentB: Address;
  /** Token amount (in base units — check decimals on-chain) for each milestone. */
  amounts: bigint[];
}

/** Result returned after successfully creating an escrow. */
export interface CreateEscrowResult {
  /** Unique on-chain identifier for this escrow. */
  escrowId: bigint;
  /** Transaction hash of the createEscrow call. */
  txHash: Hash;
}

/** Parameters for Agent B to submit a completed milestone. */
export interface SubmitMilestoneParams {
  /** The escrow this milestone belongs to. */
  escrowId: bigint;
  /** Zero-based index of the milestone being submitted. */
  milestoneIndex: bigint;
  /** keccak256 hash of the work product delivered by Agent B. */
  outputHash: Hex;
}

/** Parameters to release payment for a submitted milestone. */
export interface ReleaseMilestoneParams {
  /** The escrow containing this milestone. */
  escrowId: bigint;
  /** Zero-based index of the milestone to release. */
  milestoneIndex: bigint;
  /**
   * Optional oracle-signed quality attestation for immediate release.
   * Pass "0x" to use the optimistic path (waits for challenge window to expire).
   * In production this signature comes from the Phala TEE oracle.
   */
  oracleSignature?: Hex;
}

/** Parameters for Agent A to dispute a submitted milestone. */
export interface DisputeMilestoneParams {
  /** The escrow containing the disputed milestone. */
  escrowId: bigint;
  /** Zero-based index of the disputed milestone. */
  milestoneIndex: bigint;
  /** ERC-8004 registered address of the proposed arbiter. Must have high reputation. */
  proposedArbiter: Address;
}

/** Full details of an on-chain escrow agreement. */
export interface EscrowDetails {
  agentA: Address;
  agentB: Address;
  totalAmount: bigint;
  active: boolean;
  milestoneCount: bigint;
}

/** Full details of a single milestone. */
export interface MilestoneDetails {
  amount: bigint;
  outputHash: Hex;
  submittedAt: bigint;
  state: MilestoneState;
  arbiter: Address;
}

/** Configuration required to instantiate the CeloPact SDK client. */
export interface CeloPactConfig {
  /** Address of the deployed CeloPactEscrow contract. */
  contractAddress: Address;
  /**
   * Address of the ERC-20 token used for escrow payments.
   * Celo Sepolia USDm:  0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b  (18 decimals)
   * Celo Mainnet USDT:  0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e  (6 decimals)
   *
   * The SDK is token-agnostic — always read decimals on-chain via `ERC20_ABI` before
   * computing amounts; do not assume a fixed decimal count.
   */
  tokenAddress: Address;
  /** Private key of the calling agent (hex string, with 0x prefix). */
  privateKey: Hex;
  /** RPC URL for the target Celo network. */
  rpcUrl: string;
}
