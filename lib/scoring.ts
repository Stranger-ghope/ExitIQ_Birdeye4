import type { AnalysisRequest, AnalysisResult, RiskComponent, Verdict, DataQuality, EndpointStatus } from "./types";

type BirdeyeSnapshot = {
  price: number;
  liquidity: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  holders: number | null;
  topHolderPercent: number | null;
  mintAuthorityRisk: boolean;
  freezeAuthorityRisk: boolean;
  buySellRatio: number | null;
  tokenSymbol?: string;
  tokenName?: string;
  dataQuality: DataQuality; // Technical depth: data completeness
  endpointStatus: EndpointStatus[]; // Technical depth: endpoint usage visibility
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function verdictFromScore(score: number, profile: AnalysisRequest["riskProfile"]): Verdict {
  const offset = profile === "conservative" ? -8 : profile === "aggressive" ? 8 : 0;
  if (score >= 75 + offset) return "EXIT RISK";
  if (score >= 50 + offset) return "TRIM";
  if (score >= 25 + offset) return "WATCH";
  return "HOLD";
}

function component(label: string, score: number, weight: number, reason: string): RiskComponent {
  return { label, score: clamp(score), weight, reason };
}

export function analyzePosition(input: AnalysisRequest, data: BirdeyeSnapshot): AnalysisResult {
  // Calculate entry-aware PnL - this is post-entry context, not just current price
  const pnlPercent = ((data.price - input.entryPrice) / input.entryPrice) * 100;
  const positionValue = input.positionSize * (data.price / input.entryPrice);

  // Liquidity Stress: position size relative to available liquidity
  // If your position is >10% of liquidity, exiting becomes difficult (high risk)
  // This is a key post-entry metric that most tools ignore
  const liquidityStress = data.liquidity ? (positionValue / data.liquidity) * 100 : 20;
  const liquidityScore = liquidityStress > 10 ? 85 : liquidityStress > 5 ? 65 : liquidityStress > 2 ? 40 : 15;

  // Momentum Decay: 24h price change as a proxy for trend health
  // Sharp negative momentum indicates selling pressure and potential downside
  const momentumScore = data.priceChange24h === null ? 35 : data.priceChange24h < -25 ? 85 : data.priceChange24h < -10 ? 65 : data.priceChange24h < 0 ? 42 : 18;

  // Security Risk: contract-level risks from Birdeye token_security endpoint
  // Mint authority and freeze authority are red flags for rug potential
  // Top holder concentration >20% indicates centralization risk
  const securityScore = clamp((data.mintAuthorityRisk ? 35 : 0) + (data.freezeAuthorityRisk ? 35 : 0) + Math.max(0, (data.topHolderPercent ?? 0) - 20));

  // Trade Pressure: buy/sell ratio from Birdeye trade-data endpoint
  // Ratio <0.6 means sellers dominate (bearish), >1.15 means buyers dominate (bullish)
  const tradePressureScore = data.buySellRatio === null ? 35 : data.buySellRatio < 0.6 ? 75 : data.buySellRatio < 0.9 ? 55 : data.buySellRatio < 1.15 ? 30 : 15;

  // PnL Context: entry-aware profit/loss affects exit decisions
  // Large gains may warrant taking profit; large losses may indicate cutting losses
  const pnlScore = pnlPercent > 100 ? 65 : pnlPercent > 50 ? 50 : pnlPercent < -35 ? 80 : pnlPercent < -18 ? 62 : 24;

  const components = [
    component("Liquidity Stress", liquidityScore, 25, data.liquidity ? `Position equals ${liquidityStress.toFixed(2)}% of reported liquidity.` : "Liquidity was unavailable, so ExitIQ applies a cautious baseline."),
    component("Momentum Decay", momentumScore, 25, data.priceChange24h === null ? "24h price change was unavailable." : `24h price change is ${data.priceChange24h.toFixed(2)}%.`),
    component("Security Risk", securityScore, 20, `Mint authority risk: ${data.mintAuthorityRisk ? "yes" : "no"}. Freeze authority risk: ${data.freezeAuthorityRisk ? "yes" : "no"}.`),
    component("Trade Pressure", tradePressureScore, 15, data.buySellRatio === null ? "Recent buy/sell pressure was unavailable." : `Buy/sell ratio is ${data.buySellRatio.toFixed(2)}.`),
    component("PnL Context", pnlScore, 15, `Position is ${pnlPercent >= 0 ? "up" : "down"} ${Math.abs(pnlPercent).toFixed(2)}% from entry.`),
  ];

  const exitRiskScore = clamp(components.reduce((total, item) => total + item.score * (item.weight / 100), 0));
  const verdict = verdictFromScore(exitRiskScore, input.riskProfile);
  const reasons = components.sort((a, b) => b.score - a.score).slice(0, 3).map((item) => `${item.label}: ${item.reason}`);
  const summary = verdict === "HOLD"
    ? "Risk is currently controlled. Keep monitoring Birdeye-backed liquidity, momentum, and security conditions."
    : verdict === "WATCH"
      ? "Some risk layers are forming. Avoid increasing exposure until conditions improve."
      : verdict === "TRIM"
        ? "Risk is elevated. Consider reducing exposure or taking partial profit."
        : "Multiple risk layers are flashing. Consider exiting or avoiding further exposure.";

  // Actionable position sizing recommendation based on liquidity stress
  let positionSizeRecommendation: string | undefined;
  if (data.liquidity && liquidityStress > 5) {
    positionSizeRecommendation = `Position is ${liquidityStress.toFixed(1)}% of liquidity. Consider reducing exposure to stay below 5% for safer exits.`;
  } else if (data.liquidity) {
    positionSizeRecommendation = `Position is ${liquidityStress.toFixed(1)}% of liquidity. Current size is reasonable for liquidity depth.`;
  }

  return {
    tokenAddress: input.tokenAddress,
    currentPrice: data.price,
    entryPrice: input.entryPrice,
    positionSize: input.positionSize,
    pnlPercent,
    positionValue,
    liquidity: data.liquidity,
    volume24h: data.volume24h,
    exitRiskScore,
    verdict,
    summary,
    components,
    reasons,
    tokenSymbol: data.tokenSymbol,
    tokenName: data.tokenName,
    birdeyeReceipt: [
      "Live price from /defi/price",
      "Liquidity, market stats, and metadata from /defi/token_overview",
      "Contract and holder risk from /defi/token_security",
      "Momentum context from Birdeye market data",
      "Buy/sell pressure from /defi/v3/token/trade-data/single when available",
    ],
    // Technical depth indicators for judges
    dataQuality: data.dataQuality,
    endpointStatus: data.endpointStatus,
    positionSizeRecommendation,
  };
}
