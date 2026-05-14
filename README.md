# ExitIQ — Birdeye-Powered Position Risk Copilot

ExitIQ is a Solana position risk copilot built for Birdeye Data Sprint 4.

Most tools help traders find entries. ExitIQ solves the post-entry problem: deciding when a live position has become risky enough to hold, watch, trim, or exit.

## Live Product Concept

A user enters:

- Token address
- Entry price
- Position size
- Risk profile

ExitIQ returns:

- Current price
- PnL percentage
- Position value
- Liquidity stress
- ExitRisk Score
- HOLD / WATCH / TRIM / EXIT RISK verdict
- Top risk drivers
- Birdeye data receipt
- **Data quality indicator** (endpoint success rate)
- **Position sizing recommendations** (actionable utility)

## Technical Depth: Birdeye API Integration

ExitIQ uses **4 Birdeye endpoints concurrently** with retry logic and data quality tracking:

| ExitIQ Layer | Birdeye API | Purpose |
| --- | --- | --- |
| Live PnL and position value | `/defi/price` | Real-time price and liquidity |
| Liquidity and market context | `/defi/token_overview` | Volume, holders, metadata |
| Contract and holder risk | `/defi/token_security` | Mint/freeze authority, concentration |
| Buy/sell pressure | `/defi/v3/token/trade-data/single` | Trade flow analysis |

**Technical Features:**
- **Concurrent endpoint fetching** with `Promise.allSettled` for resilience
- **Exponential backoff retry** on 429 rate limits (1s, 2s delays)
- **Endpoint status tracking** with latency and data point counts
- **Data quality scoring** based on endpoint success rate (0-100)
- **Extensive field fallbacks** (9+ volume field names, 8+ buy/sell field names) to handle API response variations

## ExitRisk Scoring Model

The score ranges from 0 to 100. Higher means the position has higher exit risk.

| Component | Weight | Rationale |
| --- | ---: | --- |
| Liquidity Stress | 25% | Position size relative to available liquidity - if >10%, exiting becomes difficult |
| Momentum Decay | 25% | 24h price change as proxy for trend health - sharp negative momentum indicates selling pressure |
| Security Risk | 20% | Contract-level risks - mint/freeze authority flags, top holder concentration >20% |
| Trade Pressure | 15% | Buy/sell ratio - <0.6 means sellers dominate, >1.15 means buyers dominate |
| PnL Context | 15% | Entry-aware profit/loss - large gains warrant taking profit, losses may indicate cutting |

Verdict thresholds:

- `0–24`: HOLD
- `25–49`: WATCH
- `50–74`: TRIM
- `75–100`: EXIT RISK

Risk profile adjusts verdict sensitivity:

- Conservative: shifts thresholds 8 points lower (trims earlier)
- Balanced: default thresholds
- Aggressive: shifts thresholds 8 points higher (tolerates more risk)

## Project Structure

```text
app/
  api/analyze/route.ts     Server route that protects the Birdeye API key
  globals.css              App styling
  layout.tsx               Metadata and root layout
  page.tsx                 Landing page and product positioning
components/
  Analyzer.tsx             Client-side analyzer UI
lib/
  birdeye.ts               Birdeye API wrapper
  scoring.ts               ExitIQ scoring engine
  types.ts                 Shared TypeScript types
CLAUDE.md                  Project coding guidelines
```

## Local Setup

```bash
npm install
cp .env.example .env.local
```

Add your Birdeye API key:

```text
BIRDEYE_API_KEY=your_key_here
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Sprint 4 Submission Pitch

ExitIQ turns Birdeye's real-time Solana APIs into an everyday position management workflow. Instead of only helping traders discover new tokens, it helps them decide when an existing position has become dangerous due to liquidity stress, momentum decay, security risk, or sell pressure.
