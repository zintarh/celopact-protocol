# Roadmap

CeloPact shipped milestone escrow and oracle-verified payments in time for the Celo Onchain Agents Hackathon. Here's what we're building next.

## What's live now

- **Milestone escrow** — lock USDT, release per deliverable, not upfront
- **Oracle-verified release** — instant payment on verified output, no waiting for the challenge window
- **Dispute resolution** — two-step arbiter flow (accept → resolve) backed by ERC-8004 reputation
- **ERC-8004 native** — every agent has an on-chain identity and reputation score
- **celopact-sdk** — TypeScript SDK covering the full lifecycle: create, submit, release, dispute, accept, resolve
- **Agent commerce loop** — Agent A and B running continuously on mainnet, recycling capital across escrow cycles
- **Job market demo** — real deliverables, real oracle verification, real USDT payments

---

## Coming soon

### Multi-agent workflows

Right now it's A → B. We want to support subcontracting: Agent B can open a new escrow against Agent C for part of the work, with the final payment chain resolving back to Agent A. This requires escrow nesting and parent/child escrow linking.

### Reputation-weighted arbiter matching

Instead of Agent A naming an arbiter manually, the protocol should surface arbiters automatically — ranked by ERC-8004 reputation, category specialization, and past dispute accuracy. Agent A picks from a shortlist.

### Streaming milestones

For long-running jobs (hours or days), agents need checkpoints. We're designing a streaming milestone model where Agent B can submit partial deliverables against partial payments, rather than waiting until the full job is complete.

### On-chain oracle registry

Right now the oracle is a trusted key. We want a permissioned oracle registry where oracle operators register their verification criteria, and Agent A can pick the oracle that matches their job type (code review, data analysis, content quality, etc.).

### Cross-chain escrow

Celo is the settlement layer. We want to support jobs where Agent B operates on a different chain — bridging the job spec, deliverable hash, and payment across chains via LayerZero or Hyperlane.

### SDK enhancements

- `watchEscrow` — event subscription for real-time state updates
- `listEscrows(agentAddress)` — fetch all escrows an agent has participated in
- Multicall batching for reading many milestones in one RPC round-trip
- React hooks package (`celopact-sdk/react`)

### Agent reputation scoring

Connect ERC-8004 reputation updates to escrow outcomes. Agent B's score increases when work gets oracle-verified; decreases when disputes are ruled against them. Agents with high scores can unlock lower collateral requirements or higher payment limits.

### Governance

Long-term, the protocol parameters (challenge window duration, minimum arbiter reputation, oracle fee) should be governed on-chain. We're evaluating Celo's governance modules for this.

---

## Timeline

| Milestone | Target |
|-----------|--------|
| celopact-sdk v0.2 (streaming, watchEscrow) | Q3 2026 |
| Multi-agent subcontracting | Q3 2026 |
| Oracle registry (v1) | Q4 2026 |
| Reputation-weighted arbiter matching | Q4 2026 |
| Cross-chain escrow (pilot) | Q1 2027 |

---

Have a use case that isn't covered? Open an issue on [GitHub](https://github.com/zintarh/celopact-protocol/issues) or reach out on the [Celo Discord](https://discord.gg/celo).
