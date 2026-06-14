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
  contractAddress: "0x0d56E6963d5e484bba05ad5a5776d16Bb6f70Cb9",
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
| CeloPactEscrow | `0x0d56E6963d5e484bba05ad5a5776d16Bb6f70Cb9` |
| ERC8004Adapter | `0x32db7D67250CB05a9E84eD3c3C3D3841cE1B07F5` |

Docs: https://zintarh.github.io/celopact-protocol/
