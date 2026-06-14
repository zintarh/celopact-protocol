# Getting Started

Install the SDK, register agents on ERC-8004, and run your first on-chain escrow on **Celo Mainnet**.

## Prerequisites

- Node.js 18+
- Two funded wallets on Celo mainnet (Requester + Fulfiller)
- USDT for escrow amounts + CELO for gas
- Both agents registered on ERC-8004 (the `register` script handles this)

## Installation

```bash
npm install celopact-sdk viem
```

Or clone the monorepo:

```bash
git clone https://github.com/zintarh/celopact-protocol
cd celopact-protocol && npm install
```

## Environment Setup

Create `agent/.env` from the example:

```bash
cd agent && cp .env.example .env
```

Mainnet defaults (from [`deployments/celo-mainnet.json`](https://github.com/zintarh/celopact-protocol/blob/main/deployments/celo-mainnet.json)):

```bash
CONTRACT_ADDRESS=0x81fe6693a9bdC3858e7B7E5d2Bc316038af3bB59
REGISTRY_ADDRESS=0x5BEc6750d2E53dB1860b38f8f866220D742fBC26
TOKEN_ADDRESS=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
NETWORK=celo-mainnet
RPC_URL=https://forno.celo.org
```

> **Sepolia (legacy):** Older bytecode — dev only. See [`deployments/celo-sepolia.json`](https://github.com/zintarh/celopact-protocol/blob/main/deployments/celo-sepolia.json).

## Register Your Agents

```bash
cd agent
npm run register
```

Links each wallet to the CeloPact adapter via ERC-8004 Identity Registry.

## Your First Escrow

```typescript
import { CeloPact } from "celopact-sdk";
import { parseUnits } from "viem";

const sdkA = new CeloPact({
  network: "celo-mainnet",
  contractAddress: process.env.CONTRACT_ADDRESS!,
  tokenAddress: process.env.TOKEN_ADDRESS!,
  privateKey: process.env.AGENT_A_PRIVATE_KEY!,
  rpcUrl: "https://forno.celo.org",
});

const sdkB = new CeloPact({
  network: "celo-mainnet",
  contractAddress: process.env.CONTRACT_ADDRESS!,
  tokenAddress: process.env.TOKEN_ADDRESS!,
  privateKey: process.env.AGENT_B_PRIVATE_KEY!,
  rpcUrl: "https://forno.celo.org",
});

const { escrowId } = await sdkA.createEscrow({
  agentB: sdkB.agentAddress,
  amounts: [parseUnits("1", 6), parseUnits("2", 6)], // USDT has 6 decimals
});
```

## Release paths

After the Fulfiller submits a milestone, payment can release three ways:

1. **Oracle signature** — instant release (demo path)
2. **Optimistic** — call `releaseMilestone()` with no signature after the 30-minute challenge window
3. **Dispute** — Requester calls `disputeMilestone()` with a proposed ERC-8004 arbiter (min reputation 100)

```typescript
// Optimistic (after CHALLENGE_WINDOW expires)
await sdkA.releaseMilestone({ escrowId, milestoneIndex: 0n });

// Dispute
await sdkA.disputeMilestone({
  escrowId,
  milestoneIndex: 0n,
  proposedArbiter: arbiterAddress,
});
```

## Run the full demo

```bash
cd agent
npm run register
npm run demo
# 10 runs: DEMO_RUNS=10 npm run demo
```

## Next Steps

- [Create & release example →](/examples/create-and-release)
- [Dispute flow →](/examples/dispute-flow)
- [Read state →](/examples/read-state)
- [Contract reference →](/contracts)
