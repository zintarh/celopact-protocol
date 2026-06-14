# Deployed Contracts

## Celo Mainnet (Production)

Chain ID: **`42220`** · RPC: `https://forno.celo.org`

| Contract | Address | Explorer |
|---|---|---|
| `CeloPactEscrow` | `0x0d56E6963d5e484bba05ad5a5776d16Bb6f70Cb9` | [Celoscan](https://celoscan.io/address/0x0d56E6963d5e484bba05ad5a5776d16Bb6f70Cb9) |
| `ERC8004Adapter` | `0x32db7D67250CB05a9E84eD3c3C3D3841cE1B07F5` | [Celoscan](https://celoscan.io/address/0x32db7D67250CB05a9E84eD3c3C3D3841cE1B07F5) |

| Token | Address | Decimals |
|---|---|---|
| USDT | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` | 6 |

| ERC-8004 Registry | Address |
|---|---|
| Identity | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Reputation | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |

| Agent | Address | agentId |
|---|---|---|
| CeloPact Requester | `0x9d8a7a866af0eeE89B45aBBB4F1BC9C3698B33e4` | 9351 |
| CeloPact Fulfiller | `0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec` | 9352 |

Full manifest: [`deployments/celo-mainnet.json`](https://github.com/zintarh/celopact-protocol/blob/main/deployments/celo-mainnet.json)

---

## Celo Sepolia (Legacy testnet)

> Pre-hardening deployment. Missing `refundStaleMilestone` and `defaultDisputeToAgentA`. Use mainnet for production.

Chain ID: **`11142220`** · RPC: `https://forno.celo-sepolia.celo-testnet.org`

| Contract | Address |
|---|---|
| `CeloPactEscrow` | `0x6462fB5F67B652CB74f99C0D69e8c5086C641017` |
| `ERC8004Adapter` | `0x224e35502Ae14d4793FA679BF0ca82094804017a` |

See [`deployments/celo-sepolia.json`](https://github.com/zintarh/celopact-protocol/blob/main/deployments/celo-sepolia.json).

---

## Core Functions

| Function | Who calls | Purpose |
|---|---|---|
| `createEscrow(agentB, amounts)` | Requester | Lock tokens, open escrow |
| `submitMilestone(escrowId, index, outputHash)` | Fulfiller | Submit work, open challenge window |
| `releaseMilestone(escrowId, index, oracleSig)` | Anyone | Pay Fulfiller (oracle sig or after window) |
| `disputeMilestone(escrowId, index, arbiter)` | Requester | Freeze funds, propose ERC-8004 arbiter |
| `acceptDispute(escrowId, index)` | Named arbiter | Accept the case (required before ruling) |
| `resolveDispute(escrowId, index, winner)` | Arbiter | Send funds to winner |
| `refundStaleMilestone(escrowId, index)` | Requester | Refund if Fulfiller misses deadline |
| `defaultDisputeToAgentA(escrowId, index)` | Anyone | Refund Requester if arbiter times out |

---

## MilestoneState

```typescript
enum MilestoneState {
  PENDING   = 0,
  SUBMITTED = 1,
  RELEASED  = 2,
  DISPUTED  = 3,
  RESOLVED  = 4,
  CANCELLED = 5,
}
```

Exported from `celopact-sdk` as `MilestoneState`.

---

## Events

`EscrowCreated` · `MilestoneSubmitted` · `MilestoneReleased` · `DisputeRaised` · `DisputeResolved` · `MilestoneCancelled` · `DisputeDefaulted`

---

## Constants (mainnet deployment)

| Constant | Value |
|---|---|
| `CHALLENGE_WINDOW` | 30 minutes |
| `MILESTONE_SUBMISSION_DEADLINE` | 1 day |
| `DISPUTE_RESOLUTION_DEADLINE` | 1 day |
| `MIN_REPUTATION` | 100 |
| `MIN_ARBITER_REPUTATION` | 100 |
