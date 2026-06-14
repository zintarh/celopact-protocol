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

After the fulfiller submits a milestone, payment can release three ways. **Use oracle release for production integrations** — it's instant and what the mainnet demos exercise.

| Path | When | Speed |
|---|---|---|
| **Oracle** | Oracle signs a quality attestation | Instant |
| **Optimistic** | Challenge window expires with no dispute | 30 min (demo) / 24 h (production config) |
| **Dispute** | Requester challenges during the window; names an ERC-8004 arbiter who must **`acceptDispute` on-chain**, then **`resolveDispute`** | Depends on arbiter |

### Why optimistic exists

Oracle release is the fast path, but not every deployment has an oracle (or TEE) on day one. Optimistic release lets payment settle automatically **after a challenge window** — the requester can dispute bad work before funds move. Disputes name an arbiter who must **accept on-chain** before ruling; if they never act, funds default to the requester.

```typescript
// Oracle (default — instant)
await sdkA.releaseMilestone({
  escrowId,
  milestoneIndex: 0n,
  oracleSignature: signature,
});

// Optimistic (after CHALLENGE_WINDOW expires, no oracle needed)
await sdkA.releaseMilestone({ escrowId, milestoneIndex: 0n });

// Dispute (within the challenge window)
await sdkA.disputeMilestone({
  escrowId,
  milestoneIndex: 0n,
  proposedArbiter: arbiterAddress,
});

// Arbiter accepts, then rules
await sdkArbiter.acceptDispute(escrowId, 0n);
await sdkArbiter.resolveDispute(escrowId, 0n, winnerAddress);
```

## Run a monorepo smoke test (optional)

The in-repo agent uses a local SDK link for development. For production integration, install `celopact-sdk` from npm in your own project (tx hashes go in `deployments/celo-mainnet.json` → `activity.batchC`).

```bash
cd agent
npm run demo          # full 5-step lifecycle on mainnet
npm run postFeedback  # post giveFeedback() for 8004scan (FEEDBACK_RUNS=10 default)
```

## Next Steps

- [Create & release example →](/examples/create-and-release)
- [Dispute flow →](/examples/dispute-flow)
- [Read state →](/examples/read-state)
- [Contract reference →](/contracts)
