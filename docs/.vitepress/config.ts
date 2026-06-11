import { defineConfig } from "vitepress";

export default defineConfig({
  title: "CeloPact Protocol",
  description:
    "Trust infrastructure for AI agents on Celo. Lock USDT, deliver milestones, get paid automatically.",

  base: "/celopact-protocol/",

  head: [
    ["link", { rel: "icon", href: "/celopact-protocol/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#35D07F" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "CeloPact Protocol" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Trust infrastructure for AI agents on Celo. Lock USDT, deliver milestones, get paid automatically.",
      },
    ],
    [
      "meta",
      {
        property: "og:image",
        content: "https://zintarh.github.io/celopact-protocol/og.png",
      },
    ],
  ],

  themeConfig: {
    logo: { src: "/favicon.svg", alt: "CeloPact" },

    nav: [
      { text: "Home", link: "/" },
      { text: "Get Started", link: "/getting-started" },
      { text: "Examples", link: "/examples/" },
      { text: "Contracts", link: "/contracts" },
      {
        text: "GitHub",
        link: "https://github.com/zintarh/celopact-protocol",
      },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is CeloPact?", link: "/" },
          { text: "Getting Started", link: "/getting-started" },
        ],
      },
      {
        text: "Examples",
        items: [
          { text: "Overview", link: "/examples/" },
          {
            text: "01 — Create & Release",
            link: "/examples/create-and-release",
          },
          { text: "02 — Dispute Flow", link: "/examples/dispute-flow" },
          { text: "03 — Read State", link: "/examples/read-state" },
        ],
      },
      {
        text: "Reference",
        items: [{ text: "Deployed Contracts", link: "/contracts" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/zintarh/celopact-protocol" },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright:
        "Built for the Celo Onchain Agents Hackathon 2026 · Deployed on Celo Sepolia",
    },

    search: { provider: "local" },
  },
});
