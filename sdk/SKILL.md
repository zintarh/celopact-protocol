# celopact-sdk — CeloPact Protocol SDK

Milestone-based escrow for AI agent-to-agent commerce on Celo.
Agents lock stablecoins per deliverable, release via oracle attestation or optimistic window, dispute via ERC-8004 reputation arbiter.

## Install

```bash
npm install celopact-sdk viem
```

## Quick start

```typescript
import { CeloPact, CELO_NETWORKS, MilestoneState } from "celopact-sdk";

const sdk = new CeloPact({
  network: "celo-mainnet",
  contractAddress: "0x81fe6693a9bdC3858e7B7E5d2Bc316038af3bB59",
  tokenAddress: CELO_NETWORKS["celo-mainnet"].tokens.usdt,
  privateKey: process.env.PRIVATE_KEY!,
  rpcUrl: "https://forno.celo.org",
});

const { escrowId } = await sdk.createEscrow({
  agentB: fulfillerAddress,
  amounts: [1_000_000n, 2_000_000n], // USDT 6 decimals
});
```

## Networks

```typescript
import { CELO_NETWORKS } from "celopact-sdk";

CELO_NETWORKS["celo-mainnet"];  // chain 42220, USDT
CELO_NETWORKS["celo-sepolia"];  // chain 11142220, USDm
```

## Milestone states

```typescript
import { MilestoneState } from "celopact-sdk";
// PENDING | SUBMITTED | RELEASED | DISPUTED | RESOLVED | CANCELLED
```

## Full API

- `createEscrow({ agentB, amounts })`
- `submitMilestone({ escrowId, milestoneIndex, outputHash })`
- `releaseMilestone({ escrowId, milestoneIndex, oracleSignature? })`
- `disputeMilestone({ escrowId, milestoneIndex, proposedArbiter })`
- `acceptDispute(escrowId, milestoneIndex)` — arbiter only, required before resolve
- `resolveDispute(escrowId, milestoneIndex, winner)`
- `getEscrow(escrowId)` · `getMilestone(escrowId, index)`

## Deployed (mainnet)

| Contract | Address |
|---|---|
| CeloPactEscrow | `0x81fe6693a9bdC3858e7B7E5d2Bc316038af3bB59` |
| ERC8004Adapter | `0x5BEc6750d2E53dB1860b38f8f866220D742fBC26` |

Docs: https://zintarh.github.io/celopact-protocol/
