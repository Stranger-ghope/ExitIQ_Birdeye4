"use client";

import { useState, useEffect } from "react";
import type { AnalysisResult, RiskProfile } from "@/lib/types";

const verdictClass = {
  HOLD: "hold",
  WATCH: "watch",
  TRIM: "trim",
  "EXIT RISK": "exit",
};

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 6 : 2 }).format(value);
}

function percent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function Analyzer() {
  const [tokenAddress, setTokenAddress] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [positionSize, setPositionSize] = useState("");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);

  async function analyze() {
    setError("");
    setLoading(true);
    setResult(null);

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenAddress, entryPrice, positionSize, riskProfile }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Analysis failed.");
      return;
    }

    setResult(data);
    
    // Track score history for trend visualization (keep last 5)
    setScoreHistory(prev => {
      const newHistory = [...prev, data.exitRiskScore].slice(-5);
      return newHistory;
    });
  }

  // Auto-refresh every 30 seconds when enabled and token is loaded
  useEffect(() => {
    if (!autoRefresh || !tokenAddress.trim() || !entryPrice || !positionSize) return;

    const interval = setInterval(analyze, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, tokenAddress, entryPrice, positionSize, riskProfile]);

  const birdeyeUrl = tokenAddress.trim()
    ? `https://birdeye.so/token/${tokenAddress.trim()}?chain=solana`
    : "https://birdeye.so";

  // Calculate risk trend
  const riskTrend = scoreHistory.length >= 2
    ? scoreHistory[scoreHistory.length - 1] - scoreHistory[scoreHistory.length - 2]
    : 0;
  const trendIndicator = riskTrend > 0 ? "↑" : riskTrend < 0 ? "↓" : "→";
  const trendColor = riskTrend > 5 ? "var(--red)" : riskTrend < -5 ? "var(--green)" : "var(--muted)";

  // Demo mode pre-fill
  function loadDemo() {
    setTokenAddress("So11111111111111111111111111111111111111112"); // Wrapped SOL
    setEntryPrice("150");
    setPositionSize("1000");
    setRiskProfile("balanced");
  }

  return (
    <section id="analyzer" className="terminal">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo-mark">E</span>
          <div>
            <strong>ExitIQ</strong>
            <span>Birdeye-powered risk copilot</span>
          </div>
        </div>

        <div>
          <p className="eyebrow">Position check</p>
          <h1>Know when to hold, trim, or exit.</h1>
          <p>Paste a Solana token you already hold. ExitIQ turns Birdeye data into one post-entry risk verdict.</p>
        </div>

        <div className="form">
          <label>
            Token address
            <input value={tokenAddress} onChange={(event) => setTokenAddress(event.target.value)} placeholder="Solana token mint address" />
          </label>
          <label>
            Entry price in USD
            <input value={entryPrice} onChange={(event) => setEntryPrice(event.target.value)} placeholder="0.00042" inputMode="decimal" />
          </label>
          <label>
            Position size in USD
            <input value={positionSize} onChange={(event) => setPositionSize(event.target.value)} placeholder="500" inputMode="decimal" />
          </label>
          <label>
            Risk profile
            <select value={riskProfile} onChange={(event) => setRiskProfile(event.target.value as RiskProfile)}>
              <option value="conservative">Conservative — alerts earlier</option>
              <option value="balanced">Balanced — default thresholds</option>
              <option value="aggressive">Aggressive — tolerates more risk</option>
            </select>
            <small className="field-help">This changes verdict sensitivity only. The raw risk bars stay the same.</small>
          </label>
          <button className="button" onClick={analyze} disabled={loading}>{loading ? "Analyzing with Birdeye..." : "Run ExitIQ Analysis"}</button>
          <button className="button demo-button" onClick={loadDemo} type="button">Demo Mode</button>
          {error ? <p className="error">{error}</p> : null}
          
          {tokenAddress && entryPrice && positionSize && (
            <label className="auto-refresh-toggle">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              <span>Auto-refresh (30s)</span>
              {autoRefresh && <span className="refresh-indicator">● Live</span>}
            </label>
          )}
        </div>

        <div className="sidebar-footer">
          <span>Price</span>
          <span>Liquidity</span>
          <span>Security</span>
          <span>Trade flow</span>
        </div>
      </aside>

      <main className="workspace">
        <div className="topbar">
          <div>
            <p className="eyebrow">Live workspace</p>
            <h2>{result?.tokenSymbol ? `${result.tokenSymbol} risk workspace` : "Position risk workspace"}</h2>
          </div>
          <a className="button secondary" href={birdeyeUrl} target="_blank">Open full chart in Birdeye</a>
        </div>

        <div className="risk-workspace">
          <div className="risk-hero">
            <p className="eyebrow">ExitIQ decision layer</p>
            <div className={`risk-orb ${result ? verdictClass[result.verdict] : ""}`}>
              <span>{result ? result.exitRiskScore : "--"}</span>
              <small>ExitRisk</small>
            </div>
            {result && scoreHistory.length >= 2 && (
              <div className="risk-trend" style={{ color: trendColor }}>
                {trendIndicator} {riskTrend > 0 ? "+" : ""}{riskTrend.toFixed(0)}
              </div>
            )}
            <h2>{result ? result.verdict : "Waiting for analysis"}</h2>
            <p>{result ? result.summary : "Paste a token and run analysis to generate a Birdeye-powered risk verdict."}</p>
          </div>

          <div className="risk-map">
            <div className="risk-band">
              <span>HOLD</span>
              <span>WATCH</span>
              <span>TRIM</span>
              <span>EXIT</span>
              <i style={{ left: `${result ? result.exitRiskScore : 0}%` }} />
            </div>

            <div className="component-stack">
              {(result?.components ?? [
                { label: "Liquidity Stress", score: 0, weight: 25, reason: "Waiting for Birdeye market data." },
                { label: "Momentum Decay", score: 0, weight: 25, reason: "Waiting for price context." },
                { label: "Security Risk", score: 0, weight: 20, reason: "Waiting for token security data." },
                { label: "Market Flow", score: 0, weight: 15, reason: "Waiting for trade flow." },
                { label: "PnL Context", score: 0, weight: 15, reason: "Waiting for entry-aware PnL." },
              ]).map((component) => (
                <div className="component-row" key={component.label}>
                  <div>
                    <strong>{component.label}</strong>
                    <small>{component.reason}</small>
                  </div>
                  <div className="bar">
                    <span style={{ width: `${component.score}%` }} />
                  </div>
                  <div className="score-display">
                    <b>{component.score}</b>
                    <small className="weighted">+{component.weightedContribution?.toFixed(1) || "0.0"}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="market-strip">
            <div>
              <span>Current</span>
              <strong>{result ? money(result.currentPrice) : "--"}</strong>
            </div>
            <div>
              <span>PnL</span>
              <strong>{result ? percent(result.pnlPercent) : "--"}</strong>
            </div>
            <div>
              <span>Liquidity</span>
              <strong>{result ? money(result.liquidity) : "--"}</strong>
            </div>
            <div>
              <span>24h Volume</span>
              <strong>{result ? money(result.volume24h) : "--"}</strong>
            </div>
          </div>

          {result && (
            <div className="technical-panel">
              <div>
                <h3>Data Quality</h3>
                <p>Birdeye endpoints: {result.dataQuality.endpointsSucceeded}/{result.dataQuality.totalEndpoints} succeeded</p>
                <p>Quality score: {result.dataQuality.score}/100</p>
                {result.dataQuality.missingFields.length > 0 && (
                  <p className="text-muted">Missing: {result.dataQuality.missingFields.join(", ")}</p>
                )}
              </div>
              <div>
                <h3>Position Sizing</h3>
                <p>{result.positionSizeRecommendation ?? "No recommendation"}</p>
              </div>
              <div>
                <h3>Endpoint Status</h3>
                <p>{result.endpointStatus.map(e => `${e.endpoint}: ${e.success ? '✓' : '✗'} (${e.latencyMs.toFixed(0)}ms)`).join(", ")}</p>
              </div>
            </div>
          )}

          <div className="guide-panel">
            <div>
              <h3>{result ? "Top drivers" : "How to read bars"}</h3>
              {result ? (
                <ul className="list">{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              ) : (
                <p>Each bar scores one risk layer from 0 to 100. Low bars are safer. High bars mean that layer is pushing the position toward TRIM or EXIT.</p>
              )}
            </div>
            <div>
              <h3>Verdict logic</h3>
              <p>ExitIQ combines the weighted bars into one ExitRisk score. Your risk profile shifts when the verdict changes, not the underlying data.</p>
            </div>
            <div>
              <h3>Birdeye inputs</h3>
              <p>Price powers PnL, overview powers liquidity and volume, security powers contract risk, and trade data powers buy/sell pressure.</p>
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}
