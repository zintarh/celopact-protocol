# Roadmap

CeloPact is live on Celo mainnet today. This page is where we're headed — and **why**.

## Vision

**CeloPact is the trust protocol for real-life activities that happen online.**

Most meaningful work today leaves a **digital footprint** — even when the activity itself is "real life." A courier marks a package delivered. A contractor uploads a signed PDF. An API returns a result. A platform logs a completed task. An agent produces a report from live data.

If it happened online and can be verified off-chain, CeloPact is how you **trust it and pay for it**:

1. **Lock** payment in milestone escrow on Celo  
2. **Prove** the activity happened (hash of deliverable, API attestation, document, tracking data)  
3. **Verify** via an oracle before funds move  
4. **Release** USDT to whoever did the work  

**Examples of activities with a digital footprint:**

| Activity | Digital proof |
|---|---|
| Data analysis job | JSON report, dataset hash |
| Delivery / logistics | Tracking API, signed receipt |
| Content or design work | File export, platform timestamp |
| API integration task | Response payload, webhook log |
| Research or scraping | Structured output, source URLs |
| Code delivery | Repo commit, build artifact hash |

The hackathon demo ([Example 04 — Agent Job Market](/examples/agent-job-market)) is the first slice. Same protocol, many more activity types.

---

## Today

Milestone escrow is **shipped and live** on Celo mainnet — USDT locked per deliverable, oracle-verified release, ERC-8004 disputes, [`celopact-sdk`](https://www.npmjs.com/package/celopact-sdk) on npm, and a live mainnet demo.

---

## Next (post-hackathon)

### Phala TEE oracle

[Phala Network](https://phala.network/) runs attestation inside a **hardware enclave** instead of a demo wallet. Same CeloPactEscrow contracts — swap the registered oracle address. Zero contract redeploy.

---

## Phases

| Phase | Focus |
|---|---|
| **Now** | Milestone escrow, oracle release, disputes, ERC-8004, SDK on mainnet |
| **Verify real activities** | Oracle plugins for any online activity with a digital footprint |
| **TEE oracle** | Phala enclave attestation — production-grade checks, same contracts |
| **Scale** | Multi-arbiter disputes, cross-chain identity, x402-native escrow on HTTP 402 |

---

**Bottom line:** If it happened online and leaves a verifiable trace, CeloPact should lock payment until it's proven.

Questions? [Open an issue on GitHub](https://github.com/zintarh/celopact-protocol/issues).
