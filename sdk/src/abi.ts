/** ABI for CeloPactEscrow — generated from compiled contract. */
export const CELOPACT_ESCROW_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_registry", type: "address" },
      { name: "_usdt",     type: "address" },
      { name: "_oracle",   type: "address" },
    ],
  },
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentB",   type: "address" },
      { name: "amounts",  type: "uint256[]" },
    ],
    outputs: [{ name: "escrowId", type: "uint256" }],
  },
  {
    type: "function",
    name: "submitMilestone",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId",       type: "uint256" },
      { name: "milestoneIndex", type: "uint256" },
      { name: "outputHash",     type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "releaseMilestone",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId",        type: "uint256" },
      { name: "milestoneIndex",  type: "uint256" },
      { name: "oracleSignature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "disputeMilestone",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId",        type: "uint256" },
      { name: "milestoneIndex",  type: "uint256" },
      { name: "proposedArbiter", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "resolveDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId",       type: "uint256" },
      { name: "milestoneIndex", type: "uint256" },
      { name: "winner",         type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getEscrow",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [
      { name: "agentA",         type: "address" },
      { name: "agentB",         type: "address" },
      { name: "totalAmount",    type: "uint256" },
      { name: "active",         type: "bool" },
      { name: "milestoneCount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getMilestone",
    stateMutability: "view",
    inputs: [
      { name: "escrowId",       type: "uint256" },
      { name: "milestoneIndex", type: "uint256" },
    ],
    outputs: [
      { name: "amount",      type: "uint256" },
      { name: "outputHash",  type: "bytes32" },
      { name: "submittedAt", type: "uint256" },
      { name: "state",       type: "uint8" },
      { name: "arbiter",     type: "address" },
    ],
  },
  {
    type: "function",
    name: "escrowCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "count", type: "uint256" }],
  },
  {
    type: "function",
    name: "CHALLENGE_WINDOW",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ── Events ──
  {
    type: "event",
    name: "EscrowCreated",
    inputs: [
      { name: "escrowId",       type: "uint256", indexed: true },
      { name: "agentA",         type: "address", indexed: true },
      { name: "agentB",         type: "address", indexed: true },
      { name: "totalAmount",    type: "uint256", indexed: false },
      { name: "milestoneCount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MilestoneSubmitted",
    inputs: [
      { name: "escrowId",            type: "uint256", indexed: true },
      { name: "milestoneIndex",      type: "uint256", indexed: true },
      { name: "outputHash",          type: "bytes32", indexed: false },
      { name: "challengeWindowEnds", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MilestoneReleased",
    inputs: [
      { name: "escrowId",       type: "uint256", indexed: true },
      { name: "milestoneIndex", type: "uint256", indexed: true },
      { name: "recipient",      type: "address", indexed: true },
      { name: "amount",         type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DisputeRaised",
    inputs: [
      { name: "escrowId",       type: "uint256", indexed: true },
      { name: "milestoneIndex", type: "uint256", indexed: true },
      { name: "arbiter",        type: "address", indexed: true },
      { name: "arbiterScore",   type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DisputeResolved",
    inputs: [
      { name: "escrowId",       type: "uint256", indexed: true },
      { name: "milestoneIndex", type: "uint256", indexed: true },
      { name: "winner",         type: "address", indexed: true },
      { name: "amount",         type: "uint256", indexed: false },
    ],
  },
] as const;

/** Minimal ERC-20 ABI for USDT approval. */
export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;
