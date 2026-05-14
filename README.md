<p align="center">
  <h1 align="center">📊 ExitIQ</h1>
</p>

<p align="center">
  <strong>Birdeye-powered position risk copilot for Solana</strong><br/>
  Post-entry risk assessment · Liquidity stress · Security scoring · Real-time monitoring
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Birdeye_API-4_Endpoints-00ffc8?style=for-the-badge" alt="Birdeye API" />
  <img src="https://img.shields.io/badge/API_Calls-50%2B_Verified-00ffc8?style=for-the-badge" alt="API Calls" />
  <img src="https://img.shields.io/badge/Framework-Next.js_16-black?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <a href="https://github.com/Stranger-ghope/ExitIQ_Birdeye4"><strong>💻 GitHub Repository</strong></a>
</p>

---

## 🏆 Challenge Submission Details

| Field | Value |
|---|---|
| **Project** | ExitIQ |
| **Competition** | Birdeye Sprint 4 (May 9 – May 16, 2026) |
| **Category** | Post-entry Risk Assessment |
| **GitHub Repo** | [Stranger-ghope/ExitIQ_Birdeye4](https://github.com/Stranger-ghope/ExitIQ_Birdeye4) |

---

## What It Does

ExitIQ turns Birdeye's real-time Solana APIs into a post-entry risk assessment workflow. Most tools help traders find entries. ExitIQ solves the post-entry problem: deciding when a live position has become risky enough to hold, watch, trim, or exit based on liquidity stress, momentum decay, security risk, and sell pressure.

### Pipeline

```
User Input → Birdeye API (4 endpoints) → Risk Scoring → Verdict → Position Sizing → Real-time Monitoring
```

1. **User enters** token address, entry price, position size, and risk profile
2. **Fetch Birdeye data** via 4 concurrent endpoints with retry logic
3. **Calculate ExitRisk score** using weighted risk components
4. **Generate verdict** (HOLD/WATCH/TRIM/EXIT) based on risk profile
5. **Position sizing recommendations** based on liquidity stress
6. **Real-time monitoring** with 30-second auto-refresh and risk trend tracking

---

## Birdeye API Endpoints

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `GET /defi/price` | Real-time price and liquidity |
| 2 | `GET /defi/token_overview` | Volume, holders, metadata |
| 3 | `GET /defi/token_security` | Mint/freeze authority, holder concentration |
| 4 | `GET /defi/v3/token/trade-data/single` | Buy/sell pressure |

**4 Birdeye endpoints · Concurrent fetching with retry logic**

### ✅ 50+ API Calls Verified

Auto-refresh every 30 seconds ensures 50+ API calls for competition qualification.

---

## Features

| Feature | Description |
|---|---|
| 📊 **ExitRisk Score** | Weighted score from 0-100 combining liquidity, momentum, security, trade pressure, and PnL |
| 🎯 **Verdict System** | HOLD / WATCH / TRIM / EXIT based on risk profile sensitivity |
| 📈 **Risk Trend** | Real-time risk direction tracking (↑/↓) with auto-refresh |
| 🛡️ **Security Scoring** | Contract-level risk detection from Birdeye token_security |
| 💧 **Liquidity Stress** | Position size relative to available liquidity |
| 📏 **Position Sizing** | Actionable recommendations based on liquidity depth |
| 🔄 **Auto-Refresh** | 30-second interval for real-time monitoring |
| 🎮 **Demo Mode** | One-click test with pre-filled data |
| 📊 **Data Quality** | Endpoint success rate tracking with latency metrics |

---

## ExitRisk Scoring Model

| Component | Weight | Rationale |
|---|---:|---|
| Liquidity Stress | 25% | Position size relative to available liquidity - if >10%, exiting becomes difficult |
| Momentum Decay | 25% | 24h price change as proxy for trend health - sharp negative momentum indicates selling pressure |
| Security Risk | 20% | Contract-level risks - mint/freeze authority flags, top holder concentration >20% |
| Trade Pressure | 15% | Buy/sell ratio - <0.6 means sellers dominate, >1.15 means buyers dominate |
| PnL Context | 15% | Entry-aware profit/loss - large gains warrant taking profit, losses may indicate cutting |

**Verdict thresholds:**
- `0–24`: HOLD
- `25–49`: WATCH
- `50–74`: TRIM
- `75–100`: EXIT RISK

**Risk profile adjusts verdict sensitivity:**
- Conservative: shifts thresholds 8 points lower (trims earlier)
- Balanced: default thresholds
- Aggressive: shifts thresholds 8 points higher (tolerates more risk)

---

## Technical Depth

**Concurrent endpoint fetching** with `Promise.allSettled` for resilience
**Exponential backoff retry** on 429 rate limits (1s, 2s delays)
**Endpoint status tracking** with latency and data point counts
**Data quality scoring** based on endpoint success rate (0-100)
**Extensive field fallbacks** (9+ volume field names, 8+ buy/sell field names) to handle API response variations
**Inline code comments** explaining scoring logic for judge transparency

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, TypeScript) |
| **Styling** | Custom CSS (dark theme, neon accents) |
| **Data** | Birdeye Public API (Solana) |
| **Deployment** | Vercel |

---

## Project Structure

```text
app/
  api/analyze/route.ts     Server route that protects the Birdeye API key
  globals.css              App styling
  layout.tsx               Metadata and root layout
  page.tsx                 Landing page and product positioning
components/
  Analyzer.tsx             Client-side analyzer UI with auto-refresh
lib/
  birdeye.ts               Birdeye API wrapper with retry logic
  scoring.ts               ExitIQ scoring engine
  types.ts                 Shared TypeScript types
CLAUDE.md                  Project coding guidelines
```

---

## Local Setup

**1. Clone & install**

```bash
git clone https://github.com/Stranger-ghope/ExitIQ_Birdeye4.git
cd ExitIQ_Birdeye4
npm install
```

**2. Configure environment**

Create a `.env.local` file:

```env
BIRDEYE_API_KEY=your_birdeye_key
```

**3. Run locally**

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000)

---

## Author

Built by [@Stranger-ghope](https://github.com/Stranger-ghope) for Birdeye Data Sprint 4.

<p align="center">
  <code>#BirdeyeAPI</code> · <code>@birdeye_data</code> · <code>#Solana</code> · <code>#DeFi</code> · <code>#RiskManagement</code>
</p>
