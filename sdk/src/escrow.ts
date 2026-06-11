import { decodeEventLog, type Address, type Chain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createCeloClients } from "./client.js";
import { CELOPACT_ESCROW_ABI, ERC20_ABI } from "./abi.js";
import type {
  CeloPactConfig,
  CreateEscrowParams,
  CreateEscrowResult,
  SubmitMilestoneParams,
  ReleaseMilestoneParams,
  DisputeMilestoneParams,
  EscrowDetails,
  MilestoneDetails,
  MilestoneState,
} from "./types.js";

/**
 * CeloPact SDK — the primary interface for agent-to-agent escrow on Celo.
 *
 * @example
 * ```typescript
 * import { CeloPact } from "@celopact/sdk";
 *
 * const sdk = new CeloPact({
 *   contractAddress: "0x...",
 *   tokenAddress: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b", // USDm on Celo Sepolia
 *   privateKey: "0x...",
 *   rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
 * });
 *
 * const { escrowId } = await sdk.createEscrow({
 *   agentB: "0x...",
 *   amounts: [1_000_000_000_000_000n, 2_000_000_000_000_000n], // 0.001 + 0.002 USDm (18 decimals)
 * });
 * ```
 */
export class CeloPact {
  private readonly contractAddress: Address;
  private readonly tokenAddress: Address;
  private readonly account: ReturnType<typeof privateKeyToAccount>;
  private readonly chain: Chain;
  private readonly publicClient: ReturnType<typeof createCeloClients>["publicClient"];
  private readonly walletClient: ReturnType<typeof createCeloClients>["walletClient"];

  constructor(config: CeloPactConfig) {
    this.contractAddress = config.contractAddress;
    this.tokenAddress    = config.tokenAddress;
    this.account         = privateKeyToAccount(config.privateKey);
    const { publicClient, walletClient, chain } = createCeloClients(config.privateKey, {
      rpcUrl: config.rpcUrl,
      network: config.network,
      chainId: config.chainId,
    });
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.chain = chain;
  }

  /** The wallet address of the agent using this SDK instance. */
  get agentAddress(): Address {
    return this.account.address;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core Escrow Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creates a milestone-based escrow and locks tokens from Agent A.
   * Automatically approves the escrow contract to spend the token if needed.
   *
   * @param params.agentB - ERC-8004 registered address of the specialist agent.
   * @param params.amounts - Token amount per milestone in base units (check decimals on-chain).
   * @returns escrowId and transaction hash.
   */
  async createEscrow(params: CreateEscrowParams): Promise<CreateEscrowResult> {
    const totalAmount = params.amounts.reduce((sum, a) => sum + a, 0n);

    await this._ensureTokenApproval(totalAmount);

    const txHash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CELOPACT_ESCROW_ABI,
      functionName: "createEscrow",
      args: [params.agentB, params.amounts],
      account: this.account,
      chain: this.chain,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

    // Extract escrowId from the EscrowCreated event using viem's decodeEventLog.
    // This is robust: it matches by topic0 (event signature hash) and correctly
    // ABI-decodes all indexed and non-indexed parameters — no manual keccak256
    // topic matching or raw hex parsing needed.
    let escrowId: bigint | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: CELOPACT_ESCROW_ABI,
          eventName: "EscrowCreated",
          topics: log.topics,
          data: log.data,
        });
        // decoded.args is typed as a named object when eventName is specified
        escrowId = (decoded.args as unknown as { escrowId: bigint }).escrowId;
        break;
      } catch {
        // Not the EscrowCreated log — continue to next log
      }
    }

    if (escrowId === undefined) {
      throw new Error(
        `createEscrow: transaction ${txHash} succeeded but EscrowCreated event was not found in receipt logs. ` +
        `This likely means CONTRACT_ADDRESS is wrong or the ABI is out of sync with the deployed contract.`
      );
    }

    return { escrowId, txHash };
  }

  /**
   * Agent B submits a completed milestone, opening the challenge window.
   * The outputHash is a keccak256 of the deliverable content.
   *
   * @param params.escrowId - The escrow this milestone belongs to.
   * @param params.milestoneIndex - Zero-based milestone index.
   * @param params.outputHash - keccak256 of the work product.
   * @returns Transaction hash.
   */
  async submitMilestone(params: SubmitMilestoneParams): Promise<Hex> {
    const txHash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CELOPACT_ESCROW_ABI,
      functionName: "submitMilestone",
      args: [params.escrowId, params.milestoneIndex, params.outputHash],
      account: this.account,
      chain: this.chain,
    });

    await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  /**
   * Releases payment for a submitted milestone to Agent B.
   *
   * Two paths:
   * - Oracle path (immediate): pass a valid oracle-signed attestation as `oracleSignature`.
   * - Optimistic path (after window): omit `oracleSignature` or pass "0x".
   *   Call this after CHALLENGE_WINDOW (30 min demo / 24h production) has elapsed.
   *
   * @param params.escrowId - The escrow containing this milestone.
   * @param params.milestoneIndex - The milestone index to release.
   * @param params.oracleSignature - Optional 65-byte oracle signature (0x-prefixed).
   * @returns Transaction hash.
   */
  async releaseMilestone(params: ReleaseMilestoneParams): Promise<Hex> {
    const sig = params.oracleSignature ?? "0x";

    const txHash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CELOPACT_ESCROW_ABI,
      functionName: "releaseMilestone",
      args: [params.escrowId, params.milestoneIndex, sig],
      account: this.account,
      chain: this.chain,
    });

    await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  /**
   * Agent A disputes a submitted milestone within the challenge window.
   * Assigns a high-reputation ERC-8004 agent as arbiter.
   *
   * @param params.escrowId - The escrow containing the disputed milestone.
   * @param params.milestoneIndex - The disputed milestone index.
   * @param params.proposedArbiter - ERC-8004 registered arbiter address.
   * @returns Transaction hash.
   */
  async disputeMilestone(params: DisputeMilestoneParams): Promise<Hex> {
    const txHash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CELOPACT_ESCROW_ABI,
      functionName: "disputeMilestone",
      args: [params.escrowId, params.milestoneIndex, params.proposedArbiter],
      account: this.account,
      chain: this.chain,
    });

    await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  /**
   * Resolves a disputed milestone. Must be called by the assigned arbiter.
   *
   * The arbiter must be ERC-8004 registered with a reputation score ≥ 100.
   * The `winner` must be either agentA or agentB of the escrow; the contract
   * transfers the milestone's locked amount to the winner.
   *
   * @param escrowId - The escrow containing the disputed milestone.
   * @param milestoneIndex - The disputed milestone index.
   * @param winner - Address of the winner (agentA or agentB).
   * @returns Transaction hash.
   */
  async resolveDispute(escrowId: bigint, milestoneIndex: bigint, winner: Address): Promise<Hex> {
    const txHash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: CELOPACT_ESCROW_ABI,
      functionName: "resolveDispute",
      args: [escrowId, milestoneIndex, winner],
      account: this.account,
      chain: this.chain,
    });

    await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Read Functions
  // ─────────────────────────────────────────────────────────────────────────

  /** Returns full details of an on-chain escrow. */
  async getEscrow(escrowId: bigint): Promise<EscrowDetails> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CELOPACT_ESCROW_ABI,
      functionName: "getEscrow",
      args: [escrowId],
    }) as [Address, Address, bigint, boolean, bigint];

    return {
      agentA: result[0],
      agentB: result[1],
      totalAmount: result[2],
      active: result[3],
      milestoneCount: result[4],
    };
  }

  /** Returns the current state of a specific milestone. */
  async getMilestone(escrowId: bigint, milestoneIndex: bigint): Promise<MilestoneDetails> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CELOPACT_ESCROW_ABI,
      functionName: "getMilestone",
      args: [escrowId, milestoneIndex],
    }) as [bigint, Hex, bigint, number, Address];

    return {
      amount: result[0],
      outputHash: result[1],
      submittedAt: result[2],
      state: result[3] as MilestoneState,
      arbiter: result[4],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Approves the escrow contract to spend the token if the current allowance is insufficient. */
  private async _ensureTokenApproval(amount: bigint): Promise<void> {
    const allowance = await this.publicClient.readContract({
      address: this.tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [this.account.address, this.contractAddress],
    }) as bigint;

    if (allowance < amount) {
      const approveTx = await this.walletClient.writeContract({
        address: this.tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [this.contractAddress, amount],
        account: this.account,
        chain: this.chain,
      });
      await this.publicClient.waitForTransactionReceipt({ hash: approveTx });
    }
  }
}
