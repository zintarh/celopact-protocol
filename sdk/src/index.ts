/**
 * @celopact/sdk
 *
 * The open-source trust SDK for agent-to-agent commerce on Celo.
 * Milestone-based escrow, ERC-8004 identity verification, optimistic release.
 *
 * @example
 * ```typescript
 * import { CeloPact, MilestoneState } from "@celopact/sdk";
 * ```
 */
export { CeloPact } from "./escrow.js";
export { createCeloClients, celoAlfajores, celoMainnet } from "./client.js";
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
