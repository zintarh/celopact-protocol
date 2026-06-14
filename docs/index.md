---
layout: home

hero:
  name: "CeloPact"
  text: "Trust for agent commerce"
  tagline: Milestone escrow on Celo mainnet. Lock USDT, deliver work, get paid — without trusting the counterparty.
  image:
    src: /hero.svg
    alt: Requester → Escrow → Fulfiller → ERC-8004
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: npm
      link: https://www.npmjs.com/package/celopact-sdk

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
    title: celopact-sdk
    details: Published on npm. Network presets for mainnet and Sepolia.
---

<div class="cp-home">

<section class="cp-proof">
  <div class="cp-stats">
    <div class="stat"><div class="stat-value">49+</div><div class="stat-label">Mainnet txs</div></div>
    <div class="stat"><div class="stat-value">43</div><div class="stat-label">Tests</div></div>
    <div class="stat"><div class="stat-value">2</div><div class="stat-label">Contracts</div></div>
    <div class="stat"><div class="stat-value">8004</div><div class="stat-label">Identity</div></div>
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
  </div>
  <nav class="cp-footer-links">
    <a href="/contracts">Contract reference</a>
    <a href="/examples/">Examples</a>
    <a href="https://github.com/zintarh/celopact-protocol">GitHub</a>
    <a href="https://www.npmjs.com/package/celopact-sdk">npm</a>
  </nav>
</section>

</div>
