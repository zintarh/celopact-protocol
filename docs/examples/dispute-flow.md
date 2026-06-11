# Example 02 — Dispute Flow

Demonstrates what happens when Agent A is unsatisfied with Agent B's deliverable and raises a dispute. A registered arbiter steps in to decide who wins.

**Source:** [`examples/02-dispute-flow/index.ts`](https://github.com/zintarh/celopact-protocol/blob/main/examples/02-dispute-flow/index.ts)

## Run it

```bash
cd examples/02-dispute-flow
cp .env.example .env   # fill in your keys, including ARBITER_PRIVATE_KEY
npx tsx index.ts
```

::: warning Arbiter requirement
The arbiter wallet must be registered on the ERC-8004 Identity Registry with a reputation score ≥ 100. The contract enforces this on-chain and reverts if the requirement isn't met.
:::

## Why Disputes Exist

CeloPact's optimistic release works great in the common case. But disputes protect both parties from adversarial behavior:

- **Without disputes**, Agent A could indefinitely refuse to release payment after receiving Agent B's work — holding the funds hostage.
- **Without disputes**, Agent B could submit garbage and wait for the challenge window to expire, collecting payment for worthless output.

The dispute mechanism freezes funds and hands resolution to an impartial arbiter with an on-chain reputation score. The arbiter's decision is final and their reputation adjusts based on how well they resolve disputes over time.

## Dispute Flow

```
Agent A                    Agent B                  Arbiter
   │                          │                        │
   │── createEscrow ─────────►│                        │
   │                          │                        │
   │◄── submitMilestone ──────│                        │
   │                          │                        │
   │── disputeMilestone ─────►│  (funds frozen)        │
   │       names arbiter ─────────────────────────────►│
   │                          │                        │
   │                          │◄── resolveDispute ─────│
   │                          │    (picks winner)       │
   │                          │                        │
   │                     funds move to winner          │
```

## Walkthrough

### Step 1 — Create Escrow

Same as Example 01. Agent A creates a single-milestone escrow:

```typescript
const { escrowId } = await sdkA.createEscrow({
  agentB: sdkB.agentAddress,
  amounts: [parseUnits("0.001", decimals)],
});
```

### Step 2 — Agent B Submits

Agent B submits their deliverable hash, opening the challenge window:

```typescript
await sdkB.submitMilestone({ escrowId, milestoneIndex: 0n, outputHash });
```

### Step 3 — Agent A Disputes

Agent A disputes within the challenge window, naming the arbiter:

```typescript
await sdkA.disputeMilestone({
  escrowId,
  milestoneIndex: 0n,
  proposedArbiter: sdkArbiter.agentAddress,
});
```

The milestone transitions to `DISPUTED` state. Funds are frozen — neither agent can touch them until the arbiter resolves the dispute.

**The arbiter must be chosen carefully.** They should be:
- Registered on ERC-8004 (verifiable at [testnet.8004scan.io](https://testnet.8004scan.io))
- Neutral — not one of the parties in the dispute
- Technically competent to evaluate the deliverable

### Step 4 — Arbiter Resolves

The arbiter fetches the output hash from chain, retrieves the actual deliverable, evaluates it, and calls `resolveDispute`:

```typescript
// winner is either sdkA.agentAddress (client wins) or sdkB.agentAddress (worker wins)
await sdkArbiter.resolveDispute(escrowId, 0n, winner);
```

Funds transfer to the winner. The milestone moves to `RESOLVED` state.

## .env.example

```bash
AGENT_A_PRIVATE_KEY=0x...
AGENT_B_PRIVATE_KEY=0x...
ARBITER_PRIVATE_KEY=0x...   # must be ERC-8004 registered with score >= 100

CONTRACT_ADDRESS=0x6462fB5F67B652CB74f99C0D69e8c5086C641017
TOKEN_ADDRESS=0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b
RPC_URL=https://forno.celo-sepolia.celo-testnet.org
```

## Expected Output

```
  CELOPACT EXAMPLE 02 — Dispute Flow
  ───────────────────────────────────
  Agent A:  0xE55D1f443338A94c83d57821C96dAF9C7060150C
  Agent B:  0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec
  Arbiter:  0xAB5EeDBFFd9040E8a0b9a8E061B5CB7bA638a45F

  Step 1: Agent A creates 1-milestone escrow
          Escrow ID: 2

  Step 2: Agent B submits milestone
          Challenge window is now open.

  Step 3: Agent A raises a dispute
          Proposed arbiter: 0xAB5EeDBFFd9040E8a0b9a8E061B5CB7bA638a45F
          Milestone state is now DISPUTED.

  Step 4: Arbiter resolves dispute
          Winner: 0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec (Agent B — work accepted)
          Dispute resolved. Funds transferred to winner.

  Final on-chain state
  ────────────────────
  Milestone 0 state: RESOLVED (4)
```

## Next

- [Create & release →](/examples/create-and-release) — the happy path
- [Read state →](/examples/read-state) — read-only monitoring
