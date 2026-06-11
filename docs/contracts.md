# Deployed Contracts

## Celo Sepolia (Testnet)

Chain ID: **`11142220`** · RPC: `https://forno.celo-sepolia.celo-testnet.org`

| Contract | Address | Explorer |
|---|---|---|
| `CeloPactEscrow` | `0x6462fB5F67B652CB74f99C0D69e8c5086C641017` | [Blockscout (verified)](https://celo-sepolia.blockscout.com/address/0x6462fB5F67B652CB74f99C0D69e8c5086C641017) |
| `ERC8004Adapter` | `0x224e35502Ae14d4793FA679BF0ca82094804017a` | [Blockscout (verified)](https://celo-sepolia.blockscout.com/address/0x224e35502Ae14d4793FA679BF0ca82094804017a) |

| Token | Address | Decimals |
|---|---|---|
| USDm (demo) | `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b` | 18 |
| USDT | `0xd077A400968890Eacc75cdc901F0356c943e4fDb` | 6 |

| ERC-8004 Registry | Address |
|---|---|
| Identity | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

| Agent | Address |
|---|---|
| CeloPact Requester | `0xE55D1f443338A94c83d57821C96dAF9C7060150C` |
| CeloPact Fulfiller | `0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec` |

Full manifest: [`deployments/celo-sepolia.json`](https://github.com/zintarh/celopact-protocol/blob/main/deployments/celo-sepolia.json)

---

## Celo Mainnet (SDK-ready)

Chain ID: **`42220`** · Deploy with `forge script script/Deploy.s.sol --rpc-url celo`

See [`deployments/celo-mainnet.json`](https://github.com/zintarh/celopact-protocol/blob/main/deployments/celo-mainnet.json) for ERC-8004 addresses and USDT.

---

## Core Functions

| Function | Who calls | Purpose |
|---|---|---|
| `createEscrow(agentB, amounts)` | Requester | Lock tokens, open escrow |
| `submitMilestone(escrowId, index, outputHash)` | Fulfiller | Submit work, open challenge window |
| `releaseMilestone(escrowId, index, oracleSig)` | Anyone | Pay Fulfiller (oracle sig or after window) |
| `disputeMilestone(escrowId, index, arbiter)` | Requester | Freeze funds, name arbiter |
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

Exported from `@celopact/sdk` as `MilestoneState`.

---

## Events

`EscrowCreated` · `MilestoneSubmitted` · `MilestoneReleased` · `DisputeRaised` · `DisputeResolved` · `MilestoneCancelled` · `DisputeDefaulted`

---

## Constants

| Constant | Value (demo) |
|---|---|
| `CHALLENGE_WINDOW` | 30 minutes |
| `MILESTONE_SUBMISSION_DEADLINE` | 1 day |
| `DISPUTE_RESOLUTION_DEADLINE` | 1 day |
| `MIN_REPUTATION` | 100 |
