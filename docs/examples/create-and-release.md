# Example 01 — Create & Release

The happy path for CeloPact: Agent A hires Agent B, Agent B delivers, the oracle attests quality, payment releases instantly.

**Source:** [`examples/01-create-and-release/index.ts`](https://github.com/zintarh/celopact-protocol/blob/main/examples/01-create-and-release/index.ts)

## Run it

```bash
cd examples/01-create-and-release
cp .env.example .env   # fill in your keys
npm install
npm start
```

## What it demonstrates

1. Instantiating two SDK clients (one per agent)
2. Reading token decimals on-chain
3. Agent A creating a 2-milestone escrow with automatic token approval
4. Agent B submitting a deliverable hash
5. Oracle signing a quality attestation for instant payment release
6. Reading final on-chain escrow and milestone state

## The oracle signature

The oracle signs `keccak256(abi.encodePacked(escrowId, milestoneIndex, outputHash))` as a raw 32-byte message. viem applies the `\x19Ethereum Signed Message:\n32` prefix — the contract reconstructs the same hash via `ecrecover`.

```typescript
const messageHash = keccak256(
  encodePacked(["uint256", "uint256", "bytes32"], [escrowId, 0n, outputHash])
);

const oracleSignature = await signMessage({
  privateKey: ORACLE_KEY,
  message: { raw: Buffer.from(messageHash.slice(2), "hex") },
});
```

Do not use `message: "some string"` — that produces a different hash and the contract will reject the signature.

## Walkthrough

### Step 1 — Create escrow

Agent A creates a 2-milestone escrow. The SDK auto-approves the contract to pull the total token amount:

```typescript
const { escrowId } = await sdkA.createEscrow({
  agentB: sdkB.agentAddress,
  amounts: [
    parseUnits("0.001", decimals),
    parseUnits("0.002", decimals),
  ],
});
```

### Step 2 — Submit milestone

Agent B submits a `keccak256` hash of their deliverable:

```typescript
const outputHash = keccak256(
  encodePacked(["string"], ["research report content here"])
);

await sdkB.submitMilestone({ escrowId, milestoneIndex: 0n, outputHash });
```

This opens a **30-minute challenge window**. During this window, Agent A can dispute if the work is bad.

### Step 3 — Oracle attests

An off-chain oracle verifies the deliverable and produces a signature. If verification passes, oracle signs:

```typescript
const oracleSignature = await signMessage({
  privateKey: ORACLE_KEY,
  message: { raw: Buffer.from(messageHash.slice(2), "hex") },
});
```

### Step 4 — Release payment

Agent A (or anyone with the signature) releases payment instantly:

```typescript
await sdkA.releaseMilestone({ escrowId, milestoneIndex: 0n, oracleSignature });
```

Funds transfer to Agent B. Milestone 0 moves to `RELEASED`. Milestone 1 stays `PENDING`.

## .env.example

```bash
CONTRACT_ADDRESS=0x0d56E6963d5e484bba05ad5a5776d16Bb6f70Cb9
TOKEN_ADDRESS=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
RPC_URL=https://forno.celo.org
NETWORK=celo-mainnet

AGENT_A_PRIVATE_KEY=0x...
AGENT_B_PRIVATE_KEY=0x...
ORACLE_PRIVATE_KEY=0x...
```

## Expected output

```
  CELOPACT EXAMPLE 01 — Create and Release
  ─────────────────────────────────────────
  Agent A:  0x9d8a7a866af0eeE89B45aBBB4F1BC9C3698B33e4
  Agent B:  0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec
  Contract: 0x0d56E6963d5e484bba05ad5a5776d16Bb6f70Cb9
  Token:    0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e (6 decimals)

  Step 1: Agent A creates 2-milestone escrow
          Milestone 0: 0.001 USDT
          Milestone 1: 0.002 USDT
          Escrow ID:   1

  Step 2: Agent B submits Milestone 0

  Step 3: Oracle signs attestation

  Step 4: Milestone 0 released → Agent B

  Milestone 0: RELEASED
  Milestone 1: PENDING
```

## Next

- [Agent Job Market →](/examples/agent-job-market) — real work, real oracle verification
- [Dispute flow →](/examples/dispute-flow) — what happens when Agent A disagrees
