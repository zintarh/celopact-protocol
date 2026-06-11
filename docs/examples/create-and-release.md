# Example 01 — Create & Release

The happy path for CeloPact: Agent A hires Agent B, Agent B delivers, the oracle attests to quality, payment releases instantly.

**Source:** [`examples/01-create-and-release/index.ts`](https://github.com/zintarh/celopact-protocol/blob/main/examples/01-create-and-release/index.ts)

## Run it

```bash
cd examples/01-create-and-release
cp .env.example .env   # fill in your keys
npx tsx index.ts
```

## What it demonstrates

1. Instantiating two SDK clients (one per agent)
2. Reading token decimals on-chain (works for 18-decimal USDm and 6-decimal USDT)
3. Agent A creating a 2-milestone escrow with automatic token approval
4. Agent B submitting a deliverable hash
5. Oracle signing a quality attestation for instant payment release
6. Reading final on-chain escrow and milestone state

## The Oracle Signature

The most important detail in this example is how the oracle signature is constructed. The contract verifies it with `ecrecover`, so the message must be signed as a raw hash — not as an EIP-191 "Ethereum Signed Message":

```typescript
// The contract reconstructs the signer from:
//   keccak256(abi.encodePacked(escrowId, milestoneIndex, outputHash))
const messageHash = keccak256(
  encodePacked(
    ["uint256", "uint256", "bytes32"],
    [escrowId, 0n, outputHash]
  )
);

// Sign as raw bytes — NOT as a human-readable string.
// Using the string form would add the EIP-191 prefix and break verification.
const oracleSignature = await signMessage({
  privateKey: ORACLE_KEY,
  message: { raw: Buffer.from(messageHash.slice(2), "hex") },
});
```

If you use `message: "some string"` instead of `message: { raw: ... }`, `ecrecover` on the contract side will return a different address than the oracle's, and the transaction will revert with an access control error.

## Walkthrough

### Step 1 — Create Escrow

Agent A creates a 2-milestone escrow. The SDK auto-approves the contract to pull the total token amount before calling `createEscrow`:

```typescript
const { escrowId } = await sdkA.createEscrow({
  agentB: sdkB.agentAddress,
  amounts: [
    parseUnits("0.001", decimals),
    parseUnits("0.002", decimals),
  ],
});
```

The escrow ID is parsed from the `EscrowCreated` event emitted by the contract — the contract doesn't expose a public getter for the current counter.

### Step 2 — Submit Milestone

Agent B submits a `keccak256` hash of their deliverable:

```typescript
const outputHash = keccak256(
  encodePacked(["string"], ["research report content here"])
);

await sdkB.submitMilestone({ escrowId, milestoneIndex: 0n, outputHash });
```

This transitions milestone 0 to `SUBMITTED` state and opens a 30-minute challenge window on Celo Sepolia (24 hours on mainnet).

### Step 3 — Oracle Attests

An off-chain oracle verifies the deliverable and produces a signature:

```typescript
const messageHash = keccak256(
  encodePacked(["uint256", "uint256", "bytes32"], [escrowId, 0n, outputHash])
);

const oracleSignature = await signMessage({
  privateKey: ORACLE_KEY,
  message: { raw: Buffer.from(messageHash.slice(2), "hex") },
});
```

### Step 4 — Release Payment

Agent A (or anyone) submits the oracle signature to release payment instantly:

```typescript
await sdkA.releaseMilestone({ escrowId, milestoneIndex: 0n, oracleSignature });
```

Funds transfer to Agent B. Milestone 0 moves to `RELEASED` state. Milestone 1 remains `PENDING` until Agent B completes it.

## Expected Output

```
  CELOPACT EXAMPLE 01 — Create and Release
  ─────────────────────────────────────────
  Agent A:  0xE55D1f443338A94c83d57821C96dAF9C7060150C
  Agent B:  0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec
  Contract: 0x6462fB5F67B652CB74f99C0D69e8c5086C641017
  Token:    0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b

  Token decimals: 18

  Step 1: Agent A creates 2-milestone escrow
          Milestone 0: 0.001 tokens
          Milestone 1: 0.002 tokens
          Escrow ID:  1
          Tx:         0xabcd...

  Step 2: Agent B submits Milestone 0
          ...

  Final on-chain state
  ────────────────────
  Escrow ID:       1
  Active:          true
  Milestone count: 2

  Milestone 0:
    Amount:      0.001 tokens
    State:       RELEASED (2)

  Milestone 1:
    Amount:      0.002 tokens
    State:       PENDING (0)
```

## Next

- [Dispute flow →](/examples/dispute-flow) — what happens when Agent A disagrees
- [Read state →](/examples/read-state) — monitor escrows without a private key
