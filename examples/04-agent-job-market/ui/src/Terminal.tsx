import { useEffect, useRef } from "react";

export interface TerminalLine {
  id: number;
  at: number;
  level: string;
  message: string;
  txHash?: string;
  explorer?: string;
}

interface TerminalProps {
  lines: TerminalLine[];
  running: boolean;
  embedded?: boolean;
}

const LEVEL_LABEL: Record<string, string> = {
  system: "celopact",
  "agent-a": "agent-a",
  "agent-b": "agent-b",
  oracle: "oracle",
  sdk: "sdk",
  success: "ok",
  error: "err",
  tx: "tx",
};

export function Terminal({ lines, running, embedded = false }: TerminalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const rootClass = embedded ? "terminal-shell terminal-embedded" : "glass card-terminal full-width";
  const idle = lines.length === 0 && !running;

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, running]);

  return (
    <div className={`${rootClass}${idle ? " terminal-idle" : ""}`}>
      <div className="terminal-chrome">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
        <span className="terminal-title">Live output · celo mainnet</span>
        {running && <span className="terminal-live">streaming</span>}
      </div>
      <div className="terminal-body" ref={bodyRef}>
        {idle ? (
          <div className="terminal-placeholder">
            <span className="prompt">$</span>
            <span>Run the job above to stream SDK logs here…</span>
            <span className="cursor-blink">▊</span>
          </div>
        ) : (
          <>
            {lines.map((line) => (
              <div key={line.id} className={`term-line level-${line.level}`}>
                <span className="term-time">{formatTime(line.at)}</span>
                <span className="term-tag">{LEVEL_LABEL[line.level] ?? line.level}</span>
                <span className="term-msg">{line.message}</span>
                {line.txHash && line.explorer && (
                  <a
                    className="term-tx"
                    href={`${line.explorer}/tx/${line.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortTx(line.txHash)}
                  </a>
                )}
              </div>
            ))}
            {running && (
              <div className="term-line level-system">
                <span className="term-time">···</span>
                <span className="term-tag">wait</span>
                <span className="term-msg">
                  Waiting for next block<span className="cursor-blink">▊</span>
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function shortTx(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)} ↗`;
}

function formatTime(at: number): string {
  const d = new Date(at);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
