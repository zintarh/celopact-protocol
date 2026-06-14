import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Terminal, type TerminalLine } from "./Terminal";
import "./index.css";

interface ApiInfo {
  network: string;
  chainId: number;
  contractAddress: string;
  agentA: string;
  agentB: string;
  llmMode: boolean;
  job: {
    id: string;
    title: string;
    description: string;
    paymentUsdt: string;
  };
  explorer: string;
  error?: string;
}

interface StepEvent {
  kind: "step";
  step: string;
  status: "start" | "done" | "error";
  message: string;
  txHash?: string;
  data?: Record<string, unknown>;
}

interface LogEvent {
  kind: "log";
  level: string;
  message: string;
  txHash?: string;
}

type StreamEvent = StepEvent | LogEvent;

const STEPS = [
  { id: "create", title: "Fund escrow", subtitle: "Agent A posts job", role: "A", icon: "◈" },
  { id: "work", title: "Run analysis", subtitle: "Agent B delivers report", role: "B", icon: "◎" },
  { id: "submit", title: "Commit hash", subtitle: "On-chain deliverable", role: "B", icon: "⬡" },
  { id: "verify", title: "Quality gate", subtitle: "Oracle attestation", role: "O", icon: "✦" },
  { id: "release", title: "Release USDT", subtitle: "Payment to Agent B", role: "A", icon: "→" },
] as const;

const FLOW = [
  { label: "Hire", sub: "Lock USDT", cls: "node-a" },
  { label: "Work", sub: "Deliverable", cls: "node-b" },
  { label: "Verify", sub: "Oracle", cls: "node-o" },
  { label: "Pay", sub: "Release", cls: "node-p" },
] as const;

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function stepStatus(stepId: string, events: StepEvent[]): "pending" | "active" | "done" | "error" {
  const latest = events.filter((e) => e.step === stepId).pop();
  if (!latest) return "pending";
  if (latest.status === "error") return "error";
  if (latest.status === "done") return "done";
  return "active";
}

export function App() {
  const [info, setInfo] = useState<ApiInfo | null>(null);
  const [stepEvents, setStepEvents] = useState<StepEvent[]>([]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliverable, setDeliverable] = useState<string | null>(null);
  const lineId = useRef(0);

  useEffect(() => {
    fetch("/api/info")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setError("Cannot reach API — run npm run demo"));
  }, []);

  const progress = useMemo(() => {
    const done = STEPS.filter((s) => stepStatus(s.id, stepEvents) === "done").length;
    return Math.round((done / STEPS.length) * 100);
  }, [stepEvents]);

  const isComplete = progress === 100 && !running;

  const appendTerminal = useCallback((event: LogEvent, explorer: string) => {
    lineId.current += 1;
    setTerminalLines((prev) => [
      ...prev,
      {
        id: lineId.current,
        at: Date.now(),
        level: event.level,
        message: event.message,
        txHash: event.txHash,
        explorer,
      },
    ]);
  }, []);

  const handleStreamEvent = useCallback(
    (event: StreamEvent, explorer: string) => {
      if (event.kind === "log") {
        appendTerminal(event, explorer);
        if (event.level === "error") setError(event.message);
        return;
      }

      setStepEvents((prev) => [...prev, event]);

      if (event.status === "error") setError(event.message);

      if (event.step === "complete" && event.data?.["result"]) {
        const r = event.data["result"] as { deliverable?: string };
        if (r.deliverable) setDeliverable(r.deliverable);
      }
    },
    [appendTerminal]
  );

  const runJob = useCallback(async () => {
    setRunning(true);
    setStepEvents([]);
    setTerminalLines([]);
    setError(null);
    setDeliverable(null);
    lineId.current = 0;

    try {
      const res = await fetch("/api/run", { method: "POST" });
      if (!res.ok || !res.body) throw new Error("Failed to start job run");

      const explorer = info?.explorer ?? "https://celoscan.io";
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6)) as StreamEvent;
          handleStreamEvent(event, explorer);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Run failed";
      setError(msg);
      appendTerminal({ kind: "log", level: "error", message: msg }, info?.explorer ?? "https://celoscan.io");
    } finally {
      setRunning(false);
    }
  }, [info, handleStreamEvent, appendTerminal]);

  const getTx = (stepId: string): string | undefined =>
    stepEvents.find((e) => e.step === stepId && e.txHash)?.txHash;

  const reportPreview = useMemo(() => {
    if (!deliverable) return null;
    try {
      return JSON.parse(deliverable) as {
        topProduct?: string;
        totalRevenueUsd?: number;
        recommendation?: string;
        generatedBy?: string;
      };
    } catch {
      return null;
    }
  }, [deliverable]);

  return (
    <div className="shell">
      <div className="bg-mesh" aria-hidden />
      <div className="bg-grid" aria-hidden />
      <div className="bg-grain" aria-hidden />

      <div className="app">
        {/* L1 — Identity */}
        <nav className="nav">
          <div className="brand">
            <span className="brand-mark">CP</span>
            <div>
              <strong>CeloPact</strong>
              <span>celopact-sdk demo</span>
            </div>
          </div>
          <div className="nav-badges">
            <span className="pill pill-demo">SDK demo</span>
            <span className="pill pill-live"><span className="dot" /> Mainnet</span>
            <span className="pill">{info?.llmMode ? "OpenAI worker" : "Deterministic AI"}</span>
          </div>
        </nav>

        {/* L2 — Value proposition */}
        <header className="hero hero-compact">
          <div className="hero-copy">
            <p className="eyebrow">Interactive demo · npm install celopact-sdk</p>
            <h1>
              Milestone escrow for agents,<br />
              <span className="gradient-text">live on Celo mainnet.</span>
            </h1>
            <p className="hero-desc">
              Watch a real hire → work → verify → pay flow powered by{" "}
              <code>celopact-sdk</code>. Three on-chain transactions, one verified deliverable.
            </p>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-value">{info?.job.paymentUsdt ?? "0.5"}</span>
              <span className="stat-label">USDT per job</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">3</span>
              <span className="stat-label">On-chain txs</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{progress}%</span>
              <span className="stat-label">Complete</span>
            </div>
          </div>
        </header>

        {/* L3–L5 — Demo stage (context → action → live output) */}
        <section className="glass demo-stage">
          <div className="demo-stage-intro">
            <div className="demo-stage-copy">
              <div className="card-head">
                <span className="chip chip-live">Live demo</span>
                {running && <span className="chip chip-running">Running…</span>}
                {isComplete && <span className="chip chip-done">Complete</span>}
              </div>
              <h2>Hire → Work → Verify → Pay</h2>
              <p className="demo-stage-desc">
                Agent A locks USDT · Agent B delivers · Oracle attests · Payment releases.
              </p>
            </div>

            <div className="demo-stage-track">
              <div className="flow-strip flow-strip-compact">
                {FLOW.map((node, i, arr) => (
                  <div key={node.label} className="flow-node-wrap">
                    <div className={`flow-node ${node.cls} ${progress >= (i + 1) * 25 ? "lit" : ""}`}>
                      <span>{node.label}</span>
                      <small>{node.sub}</small>
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`flow-connector ${progress > (i + 1) * 25 ? "lit" : ""}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="progress-bar-wrap progress-bar-compact">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {/* L3 — Primary action */}
          <div className="demo-stage-cta">
            <button
              className={`btn-run ${running ? "running" : ""}`}
              disabled={running || !info}
              onClick={runJob}
            >
              <span className="btn-shine" />
              {running ? "Executing on Celo mainnet…" : "Run full job on mainnet"}
            </button>
            <p className="run-hint">Keys stay server-side in .env · output streams below</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {/* L4 — Live output */}
          <div className="demo-stage-live">
            <Terminal lines={terminalLines} running={running} embedded />

            <aside className="pipeline-panel">
              <div className="pipeline-panel-head">
                <h3>Pipeline</h3>
                <span className="pipeline-pct">{progress}%</span>
              </div>
              <div className="timeline timeline-compact">
                {STEPS.map((step, i) => {
                  const state = stepStatus(step.id, stepEvents);
                  const msg = stepEvents.filter((e) => e.step === step.id).pop()?.message;
                  const tx = getTx(step.id);
                  return (
                    <div key={step.id} className={`step step-compact ${state}`} style={{ animationDelay: `${i * 0.04}s` }}>
                      <div className="step-rail">
                        <div className="step-icon">{step.icon}</div>
                        {i < STEPS.length - 1 && <div className="step-line" />}
                      </div>
                      <div className="step-body">
                        <div className="step-top">
                          <h4>{step.title}</h4>
                          <span className={`role-tag role-${step.role.toLowerCase()}`}>{step.role}</span>
                        </div>
                        <p className="step-msg">
                          {msg ?? (state === "pending" ? "Waiting…" : "In progress…")}
                        </p>
                        {tx && (
                          <a
                            className="tx-link tx-link-compact"
                            href={`${info?.explorer ?? "https://celoscan.io"}/tx/${tx}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Tx ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>

          {/* L5 — Outcome */}
          {isComplete && (
            <div className="success-banner success-in-stage">
              <span className="success-icon">✓</span>
              <div>
                <strong>Job completed on Celo mainnet</strong>
                <p>Deliverable verified · payment released to Agent B</p>
              </div>
            </div>
          )}

          {deliverable && reportPreview && (
            <div className="deliverable-in-stage">
              <div className="card-head">
                <span className="chip chip-done">Deliverable</span>
                <span className="chip">{reportPreview.generatedBy ?? "report"}</span>
              </div>
              <div className="report-highlights report-highlights-compact">
                <div className="highlight">
                  <span>Top product</span>
                  <strong>{reportPreview.topProduct}</strong>
                </div>
                <div className="highlight">
                  <span>Revenue</span>
                  <strong>${reportPreview.totalRevenueUsd?.toLocaleString()}</strong>
                </div>
              </div>
              <pre className="report-json">{deliverable}</pre>
            </div>
          )}
        </section>

        {/* L6 — Supporting context */}
        <section className="context-section">
          <h2 className="section-title">Sample job</h2>
          <p className="section-desc">
            The demo runs this Q1 sales analysis task — same pipeline you wire into your own app.
          </p>

          <div className="glass card-job">
            <div className="card-head">
              <span className="chip chip-open">Open job</span>
              <span className="chip chip-pay">{info?.job.paymentUsdt ?? "0.5"} USDT</span>
            </div>
            <h3>{info?.job.title ?? "Q1 Sales Data Analysis"}</h3>
            <p className="desc">{info?.job.description ?? "Loading job spec…"}</p>

            <div className="job-details-grid">
              <div className="dataset-preview">
                <div className="dataset-head">Dataset · q1_sales.csv</div>
                <div className="dataset-rows">
                  <span>Widget E</span><span>310 units</span><span>$9,300</span>
                  <span>Widget C</span><span>200 units</span><span>$6,000</span>
                  <span>Widget A</span><span>120 units</span><span>$4,800</span>
                </div>
              </div>

              <div className="job-meta-stack">
                <div className="meta-grid">
                  <div className="meta-item">
                    <span>Contract</span>
                    <code>{info ? short(info.contractAddress) : "…"}</code>
                  </div>
                  <div className="meta-item">
                    <span>Milestones</span>
                    <strong>1 deliverable</strong>
                  </div>
                </div>

                <div className="agents">
                  {[
                    { key: "a", name: "Requester", addr: info?.agentA, cls: "agent-a" },
                    { key: "b", name: "Specialist", addr: info?.agentB, cls: "agent-b" },
                    { key: "o", name: "Oracle", addr: "Quality attestation", cls: "agent-o" },
                  ].map((a) => (
                    <div key={a.key} className={`agent ${a.cls}`}>
                      <div className="agent-avatar">{a.key.toUpperCase()}</div>
                      <div>
                        <strong>{a.name}</strong>
                        <span>
                          {typeof a.addr === "string" && a.addr.startsWith("0x") ? short(a.addr) : a.addr ?? "…"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="footer">
          Reference demo for <code>celopact-sdk</code> — same pipeline in your app, your UI, your agents.
        </footer>
      </div>
    </div>
  );
}
