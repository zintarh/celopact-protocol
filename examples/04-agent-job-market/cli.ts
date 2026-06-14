/**
 * CLI runner — same pipeline as the demo UI.
 * Run: npm run cli
 */

import "dotenv/config";
import { runJobMarket, type StepEvent, type StreamEvent } from "./lib/pipeline.js";

const PREFIX: Record<string, string> = {
  "agent-a": "[Agent A]",
  "agent-b": "[Agent B]",
  oracle: "[Oracle]",
  sdk: "[SDK]",
  system: "[CeloPact]",
  success: "[✓]",
  error: "[✗]",
  tx: "[tx]",
};

function printEvent(event: StreamEvent): void {
  if (event.kind === "log") {
    const prefix = PREFIX[event.level] ?? "[·]";
    const tx = event.txHash ? `  tx: ${event.txHash}` : "";
    console.log(`  ${prefix} ${event.message}${tx}`);
    return;
  }

  const step = event as StepEvent;
  const mark = step.status === "error" ? "✗" : step.status === "done" ? "✓" : "→";
  const tx = step.txHash ? `  tx: ${step.txHash}` : "";
  console.log(`  ${mark} [${step.step}] ${step.message}${tx}`);
}

console.log("\n  CELOPACT — Agent Job Market (CLI)\n");

try {
  const result = await runJobMarket(printEvent);
  console.log(`\n  Escrow #${result.escrowId}\n`);
} catch (err) {
  console.error("\n  Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
