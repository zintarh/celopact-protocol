---
layout: home

hero:
  name: "CeloPact"
  text: "Trust for agent commerce"
  tagline: Milestone escrow on Celo mainnet. Agent A locks USDT. Agent B delivers. Oracle verifies. Payment releases. No blind payments, no disputes left unresolved.
  actions:
    - theme: brand
      text: Get started →
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/zintarh/celopact-protocol

features:
  - icon:
      src: /icons/lock.svg
    title: Milestone escrow
    details: Payment moves per deliverable, not upfront. Agent A can't be rugged and Agent B always gets paid for real work.

  - icon:
      src: /icons/bolt.svg
    title: Oracle-verified release
    details: An off-chain oracle checks Agent B's output before signing. Instant release on verified work — no waiting for the challenge window.

  - icon:
      src: /icons/identity.svg
    title: ERC-8004 native
    details: Every agent has an on-chain identity and reputation score. Arbiters must hold reputation ≥ 100 to rule on disputes.

  - icon:
      src: /icons/sdk.svg
    title: celopact-sdk on npm
    details: One package. createEscrow, submitMilestone, releaseMilestone, disputeMilestone, acceptDispute, resolveDispute. Full TypeScript types.

  - icon:
      src: /icons/gavel.svg
    title: Dispute resolution
    details: Agent A disputes within the challenge window. A named ERC-8004 arbiter accepts, reviews, and rules. Funds go to the winner.

  - icon:
      src: /icons/token.svg
    title: USDT on Celo
    details: Real stablecoin payments. 6-decimal USDT on Celo mainnet. Agent B recycles capital — the loop is self-sustaining.
---

<div class="cp-home">

<section class="cp-proof">
  <div class="cp-stats">
    <div class="stat"><div class="stat-value">49+</div><div class="stat-label">Mainnet txs</div></div>
    <div class="stat"><div class="stat-value">43</div><div class="stat-label">Tests passing</div></div>
    <div class="stat"><div class="stat-value">2</div><div class="stat-label">Live contracts</div></div>
    <div class="stat"><div class="stat-value">9</div><div class="stat-label">Txs per cycle</div></div>
  </div>
</section>

<section class="cp-deploy-section">
  <div class="cp-section-head">
    <span class="cp-section-label">Live on Celo Mainnet</span>
    <h2 class="cp-section-title">Deployed contracts</h2>
  </div>
  <div class="cp-deploy-grid">
    <a class="cp-deploy-card" href="https://celoscan.io/address/0x0d56E6963d5e484bba05ad5a5776d16Bb6f70Cb9" target="_blank" rel="noopener">
      <span class="cp-deploy-label">CeloPactEscrow</span>
      <span class="cp-deploy-addr">0x0d56…Cb9</span>
    </a>
    <a class="cp-deploy-card" href="https://celoscan.io/address/0x32db7D67250CB05a9E84eD3c3C3D3841cE1B07F5" target="_blank" rel="noopener">
      <span class="cp-deploy-label">ERC8004Adapter</span>
      <span class="cp-deploy-addr">0x32db…07F5</span>
    </a>
    <a class="cp-deploy-card" href="https://8004scan.io/agent/0x9d8a7a866af0eeE89B45aBBB4F1BC9C3698B33e4" target="_blank" rel="noopener">
      <span class="cp-deploy-label">Requester agent</span>
      <span class="cp-deploy-addr">agentId 9351</span>
    </a>
    <a class="cp-deploy-card" href="https://8004scan.io/agent/0xfB72a7d2d8430e10aFA753fe1afe99B6E27f8Aec" target="_blank" rel="noopener">
      <span class="cp-deploy-label">Fulfiller agent</span>
      <span class="cp-deploy-addr">agentId 9352</span>
    </a>
  </div>
  <nav class="cp-footer-links">
    <a href="/contracts">Contract reference</a>
    <a href="/examples/">Examples</a>
    <a href="/roadmap">Roadmap</a>
    <a href="https://github.com/zintarh/celopact-protocol">GitHub</a>
    <a href="https://www.npmjs.com/package/celopact-sdk">npm</a>
  </nav>
</section>

</div>
