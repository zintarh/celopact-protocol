# Example 04 — Agent Job Market

The real-world demo. Agent A posts a data-analysis job and locks payment in escrow. Agent B performs the analysis and returns a structured JSON report. The oracle verifies the report content before signing — if Agent B submits garbage, the oracle refuses to sign and the milestone stays unresolved.

**Source:** [`examples/04-agent-job-market/`](https://github.com/zintarh/celopact-protocol/tree/main/examples/04-agent-job-market)

## Run it

```bash
cd examples/04-agent-job-market
npm install
cp .env.example .env   # fill in your keys
npm start
```

Optional: set `OPENAI_API_KEY` in `.env` to use an LLM for the analysis. Without it, a deterministic worker runs instead — the oracle verification and on-chain flow are identical either way.

## What it demonstrates

1. Agent A posting a structured job spec (title, dataset, required output format)
2. Agent B performing real work — not just submitting a placeholder hash
3. **Oracle content verification** — the oracle reads the actual deliverable and checks it before signing
4. Milestone release gated on a verified real-world output
5. Agent A saving the deliverable to disk after payment releases

## The oracle quality gate

This is what separates this example from a simple hash submission. The oracle runs `verifyDeliverable` before it will sign anything:

```typescript
// oracle.ts
export function verifyDeliverable(deliverable: string, expectedJobId: string): AnalysisReport {
  // 1. Must be valid JSON
  const report = JSON.parse(deliverable);

  // 2. Must have all required fields
  for (const field of ["jobId", "totalRevenueUsd", "topProduct", "recommendation"]) {
    if (!report[field]) throw new Error(`Missing field: ${field}`);
  }

  // 3. jobId must match the job Agent A posted
  if (report.jobId !== expectedJobId) throw new Error("jobId mismatch");

  // 4. Revenue must be a positive number
  if (report.totalRevenueUsd <= 0) throw new Error("totalRevenueUsd must be positive");

  return report;
}
```

If any check fails — oracle throws, never signs, milestone stays `SUBMITTED`. Agent A can then dispute.

## Walkthrough

### Step 1 — Agent A posts job + creates escrow

Agent A defines the job spec and locks **0.5 USDT** in a single-milestone escrow:

```typescript
const job = {
  id: "job-q1-sales-2026",
  title: "Q1 Sales Analysis",
  dataset: Q1_SALES_CSV,  // embedded CSV data
  requiredFields: ["jobId", "totalRevenueUsd", "topProduct", "recommendation"],
};

const { escrowId } = await sdkA.createEscrow({
  agentB: sdkB.agentAddress,
  amounts: [parseUnits("0.5", decimals)],
});
```

### Step 2 — Agent B performs the job

Agent B receives the job spec, analyzes the data (LLM or deterministic), and produces a JSON report:

```typescript
const report = await performJob(job);
// {
//   jobId: "job-q1-sales-2026",
//   totalRevenueUsd: 124500,
//   topProduct: "Enterprise Plan",
//   recommendation: "Increase enterprise outreach by 20%",
//   generatedAt: "2026-06-14T12:00:00Z"
// }
```

Agent B hashes the report and submits on-chain:

```typescript
const deliverable = JSON.stringify(report);
const outputHash = hashDeliverable(deliverable);  // keccak256(utf8 bytes)

await sdkB.submitMilestone({ escrowId, milestoneIndex: 0n, outputHash });
```

### Step 3 — Oracle verifies and signs

The oracle fetches the deliverable, runs `verifyDeliverable`, and signs only if it passes:

```typescript
const verified = verifyDeliverable(deliverable, job.id);  // throws if bad
const sig = await signAttestation(ORACLE_KEY, escrowId, 0n, outputHash);
```

### Step 4 — Payment releases, Agent A saves the report

```typescript
await sdkA.releaseMilestone({ escrowId, milestoneIndex: 0n, oracleSignature: sig });

// Agent A saves the verified deliverable to disk
writeFileSync(`deliverables/escrow-${escrowId}-analysis-report.json`, deliverable);
```

## Expected output

```
  CELOPACT EXAMPLE 04 — Agent Job Market
  ─────────────────────────────────────────────
  Job:       Q1 Sales Analysis (job-q1-sales-2026)
  Agent A:   0x9d8a7a866af0eeE89B45aBBB4F1BC9C3698B33e4  (posts job + funds escrow)
  Agent B:   0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec  (hired specialist)
  LLM mode:  deterministic worker (set OPENAI_API_KEY for LLM)
  ─────────────────────────────────────────────

  Step 1: Agent A posts job + creates escrow
          Milestone 0: 0.5 USDT
          Escrow ID:   1
          Tx:          0xebeb29...

  Step 2: Agent B performs Q1 Sales Analysis
          [Worker] Analysing 12 rows of Q1 sales data...
          [Worker] Done — totalRevenueUsd: 124500, topProduct: Enterprise Plan
          Output hash: 0x7f4a3b...
          Submitted:   0x2e122c...

  Step 3: Oracle verifying deliverable...
          ✓ Valid JSON
          ✓ All required fields present
          ✓ jobId matches
          ✓ totalRevenueUsd = 124500 (positive)
          Oracle signed attestation ✓

  Step 4: Payment releasing to Agent B...
          Released: 0x4813f2...
          Report saved → deliverables/escrow-1-analysis-report.json

  ✓ Job complete. Agent B received 0.5 USDT for verified work.
```

## .env.example

```bash
CONTRACT_ADDRESS=0x0d56E6963d5e484bba05ad5a5776d16Bb6f70Cb9
TOKEN_ADDRESS=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
RPC_URL=https://forno.celo.org
NETWORK=celo-mainnet

AGENT_A_PRIVATE_KEY=0x...
AGENT_B_PRIVATE_KEY=0x...
ORACLE_PRIVATE_KEY=0x...

# Optional — uses OpenAI for real analysis
# OPENAI_API_KEY=sk-...
```

## Next

- [Dispute flow →](/examples/dispute-flow) — what if Agent B submits garbage and doesn't get caught by the oracle?
- [Read state →](/examples/read-state) — monitor an escrow with no private key
