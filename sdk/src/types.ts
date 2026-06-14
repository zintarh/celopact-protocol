import type { Address, Hash, Hex } from "viem";
import type { CeloNetworkName } from "./networks.js";

// ─────────────────────────────────────────────────────────────────────────────
// Milestone States — mirrors CeloPactEscrow.sol MilestoneState enum
// ─────────────────────────────────────────────────────────────────────────────

export enum MilestoneState {
  PENDING   = 0,
  SUBMITTED = 1,
  RELEASED  = 2,
  DISPUTED  = 3,
  RESOLVED  = 4,
  CANCELLED = 5,
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
  /** True after the assigned arbiter calls `acceptDispute`. */
  arbiterAccepted: boolean;
  /** Block timestamp when arbiter accepted. 0 until accepted. */
  acceptedAt: bigint;
}

/** Configuration required to instantiate the CeloPact SDK client. */
export interface CeloPactConfig {
  /** Address of the deployed CeloPactEscrow contract. */
  contractAddress: Address;
  /**
   * Address of the ERC-20 token used for escrow payments.
   * Use `CELO_NETWORKS[network].tokens` for canonical addresses, or any ERC-20.
   * Always read decimals on-chain — do not assume 6 or 18.
   */
  tokenAddress: Address;
  /** Private key of the calling agent (hex string, with 0x prefix). */
  privateKey: Hex;
  /** RPC URL for the target Celo network. */
  rpcUrl: string;
  /**
   * Target network by name. Preferred over inferring from the RPC URL.
   * @example "celo-sepolia" | "celo-mainnet"
   */
  network?: CeloNetworkName;
  /**
   * Target network by chain ID (11142220 = Sepolia, 42220 = mainnet).
   * Used when `network` is not set.
   */
  chainId?: number;
}
