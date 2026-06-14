/**
 * celopact-sdk
 *
 * The open-source trust SDK for agent-to-agent commerce on Celo.
 * Milestone-based escrow, ERC-8004 identity verification, optimistic release.
 *
 * @example
 * ```typescript
 * import { CeloPact, MilestoneState } from "celopact-sdk";
 * ```
 */
export { CeloPact } from "./escrow.js";
export { createCeloClients, type CreateCeloClientsOptions } from "./client.js";
export { celoCeloSepolia, celoAlfajores, celoMainnet } from "./networks.js";
export {
  CELO_NETWORKS,
  getNetwork,
  getNetworkByChainId,
  resolveChain,
  resolveNetwork,
  type CeloNetworkName,
  type NetworkConfig,
} from "./networks.js";
export { CELOPACT_ESCROW_ABI, ERC20_ABI } from "./abi.js";
export {
  MilestoneState,
  type CeloPactConfig,
  type CreateEscrowParams,
  type CreateEscrowResult,
  type SubmitMilestoneParams,
  type ReleaseMilestoneParams,
  type DisputeMilestoneParams,
  type EscrowDetails,
  type MilestoneDetails,
} from "./types.js";
