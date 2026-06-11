# Example 03 — Read State

Read-only monitoring of escrow and milestone state. No private key required — uses a public client to query on-chain data directly.

**Source:** [`examples/03-read-state/index.ts`](https://github.com/zintarh/celopact-protocol/blob/main/examples/03-read-state/index.ts)

## Run it

```bash
cd examples/03-read-state
cp .env.example .env   # set ESCROW_ID to an existing escrow
npx tsx index.ts
```

## .env.example

```bash
CONTRACT_ADDRESS=0x6462fB5F67B652CB74f99C0D69e8c5086C641017
TOKEN_ADDRESS=0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b  # optional, for formatted amounts
RPC_URL=https://forno.celo-sepolia.celo-testnet.org
ESCROW_ID=1
```

## What it demonstrates

1. Creating a read-only viem `publicClient` (no wallet needed)
2. Calling `getEscrow` and `getMilestone` with the raw `CELOPACT_ESCROW_ABI`
3. Reading token decimals to format amounts correctly
4. Mapping milestone state enum values to human-readable names
5. Reading the `CHALLENGE_WINDOW` constant from the contract

## Two Reading Approaches

The example shows two equivalent ways to read on-chain data:

**Approach A — Raw ABI with `readContract`**

Good for low-level control, multicall batching, or integrating into a system with its own viem client:

```typescript
import { createPublicClient, http } from "viem";
import { celoCeloSepolia, CELOPACT_ESCROW_ABI } from "@celopact/sdk";

const client = createPublicClient({
  chain: celoCeloSepolia,
  transport: http(RPC_URL),
});

const [agentA, agentB, totalAmount, active, milestoneCount] =
  await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: CELOPACT_ESCROW_ABI,
    functionName: "getEscrow",
    args: [ESCROW_ID],
  });
```

**Approach B — SDK convenience methods** _(used in Examples 01 and 02)_

```typescript
const escrow = await sdkA.getEscrow(escrowId);
const milestone = await sdkA.getMilestone(escrowId, 0n);
```

Both produce the same data — the SDK methods use `readContract` internally.

## Milestone States

| Value | Name | Meaning |
|---|---|---|
| `0` | `PENDING` | Milestone created, no submission yet |
| `1` | `SUBMITTED` | Agent B submitted output hash, challenge window open |
| `2` | `RELEASED` | Payment sent to Agent B (oracle or optimistic) |
| `3` | `DISPUTED` | Agent A disputed, waiting for arbiter |
| `4` | `RESOLVED` | Arbiter ruled, funds moved to winner |

The `MilestoneState` enum is exported from the SDK:

```typescript
import { MilestoneState } from "@celopact/sdk";

if (milestone.state === MilestoneState.RELEASED) {
  console.log("Payment complete");
}
```

## Building a Monitoring Bot

The pattern in this example extends directly to a polling bot:

```typescript
setInterval(async () => {
  const escrow = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: CELOPACT_ESCROW_ABI,
    functionName: "getEscrow",
    args: [ESCROW_ID],
  });

  if (!escrow[3]) { // active === false
    console.log("Escrow completed");
    clearInterval(timer);
  }
}, 30_000); // poll every 30 seconds
```

For real-time notifications without polling, use `client.watchContractEvent()` with the `CELOPACT_ESCROW_ABI` and event names like `MilestoneSubmitted`, `MilestoneReleased`, or `DisputeRaised`.

## Expected Output

```
  CELOPACT EXAMPLE 03 — Read State
  ─────────────────────────────────
  Contract: 0x6462fB5F67B652CB74f99C0D69e8c5086C641017
  Escrow:   1

  Reading escrow via raw ABI (low-level approach)

  Escrow #1
  ─────────────────────────────────────────────
  Agent A (client):  0xE55D1f443338A94c83d57821C96dAF9C7060150C
  Agent B (worker):  0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec
  Total locked:      0.003 tokens
  Active:            true
  Milestone count:   2

  Milestones (reading via raw ABI)
  ─────────────────────────────────────────────

  Milestone 0
    Amount:       0.001 tokens
    State:        RELEASED  — payment sent to Agent B
    Output hash:  0x1234567890abcdef...
    Submitted at: 2026-06-11T12:34:56.000Z
    Arbiter:      (none — not disputed)

  Milestone 1
    Amount:       0.002 tokens
    State:        PENDING   — work not yet submitted
    Output hash:  (none — not yet submitted)
    Submitted at: not yet submitted
    Arbiter:      (none — not disputed)

  Contract metadata
  ─────────────────────────────────────────────
  CHALLENGE_WINDOW: 1800s (30 minutes)

  Example 03 complete.
  This example required zero gas — pure read-only RPC calls.
```

## Next

- [Create & release →](/examples/create-and-release) — write your first escrow
- [Dispute flow →](/examples/dispute-flow) — resolution when things go wrong
- [Contract addresses →](/contracts) — full ABI reference
