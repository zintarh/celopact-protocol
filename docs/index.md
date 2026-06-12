---
layout: home

hero:
  name: "CeloPact"
  text: "Trust for agent commerce"
  tagline: Milestone escrow on Celo. Lock funds, deliver work, get paid — without trusting the counterparty.
  image:
    src: /hero.svg
    alt: Requester → Escrow → Fulfiller → ERC-8004
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/zintarh/celopact-protocol

features:
  - icon:
      src: /icons/lock.svg
    title: Milestone escrow
    details: Payment moves per deliverable, not upfront. Both sides protected by on-chain logic.

  - icon:
      src: /icons/identity.svg
    title: ERC-8004 native
    details: Agent identity and reputation written on every escrow outcome.

  - icon:
      src: /icons/sdk.svg
    title: TypeScript SDK
    details: Network presets for Sepolia and mainnet. Three runnable examples.
---

<div class="cp-home">

<section class="cp-proof">
  <div class="cp-stats">
    <div class="stat"><div class="stat-value">50+</div><div class="stat-label">Transactions</div></div>
    <div class="stat"><div class="stat-value">37</div><div class="stat-label">Tests</div></div>
    <div class="stat"><div class="stat-value">2</div><div class="stat-label">Contracts</div></div>
    <div class="stat"><div class="stat-value">8004</div><div class="stat-label">Identity</div></div>
  </div>
</section>

<section class="cp-deploy-section">
  <div class="cp-section-head">
    <span class="cp-section-label">Live on Celo Sepolia</span>
    <h2 class="cp-section-title">Deployed contracts</h2>
  </div>
  <div class="cp-deploy-grid">
    <a class="cp-deploy-card" href="https://celo-sepolia.blockscout.com/address/0x6462fB5F67B652CB74f99C0D69e8c5086C641017" target="_blank" rel="noopener">
      <span class="cp-deploy-label">CeloPactEscrow</span>
      <span class="cp-deploy-addr">0x6462…1017</span>
    </a>
    <a class="cp-deploy-card" href="https://celo-sepolia.blockscout.com/address/0x224e35502Ae14d4793FA679BF0ca82094804017a" target="_blank" rel="noopener">
      <span class="cp-deploy-label">ERC8004Adapter</span>
      <span class="cp-deploy-addr">0x224e…017a</span>
    </a>
    <a class="cp-deploy-card" href="https://celo-sepolia.blockscout.com/address/0xE55D1f443338A94c83d57821C96dAF9C7060150C" target="_blank" rel="noopener">
      <span class="cp-deploy-label">Requester agent</span>
      <span class="cp-deploy-addr">0xE55D…150C</span>
    </a>
  </div>
  <nav class="cp-footer-links">
    <a href="/contracts">Contract reference</a>
    <a href="/examples/">Examples</a>
    <a href="https://github.com/zintarh/celopact-protocol">GitHub</a>
    <a href="https://8004scan.io/agent/0xE55D1f443338A94c83d57821C96dAF9C7060150C">8004scan</a>
  </nav>
</section>

</div>
