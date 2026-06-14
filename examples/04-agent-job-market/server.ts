import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { serializeJob, SAMPLE_DATA_ANALYSIS_JOB } from "./lib/job.js";
import { loadConfig, runJobMarket, type StreamEvent } from "./lib/pipeline.js";

const PORT = Number(process.env["PORT"] ?? 8787);
const __dirname = dirname(fileURLToPath(import.meta.url));
const uiDist = join(__dirname, "ui", "dist");

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/info", (_req, res) => {
  try {
    const cfg = loadConfig();
    res.json({
      network: "celo-mainnet",
      chainId: 42220,
      contractAddress: cfg.contractAddress,
      tokenAddress: cfg.tokenAddress,
      agentA: cfg.agentA,
      agentB: cfg.agentB,
      llmMode: cfg.llmMode,
      job: serializeJob(SAMPLE_DATA_ANALYSIS_JOB),
      explorer: "https://celoscan.io",
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to load config — check .env",
    });
  }
});

app.post("/api/run", async (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: StreamEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await runJobMarket(send);
  } catch (err) {
    send({
      kind: "log",
      level: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    res.end();
  }
});

app.use(express.static(uiDist));

app.get("*", (_req, res) => {
  res.sendFile(join(uiDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n  CeloPact SDK Demo UI`);
  console.log(`  ─────────────────────────`);
  console.log(`  Open  http://localhost:${PORT}`);
  console.log(`  Keys  loaded from .env (server-side only)\n`);
});
