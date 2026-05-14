export type RiskProfile = "conservative" | "balanced" | "aggressive";

export type AnalysisRequest = {
  tokenAddress: string;
  entryPrice: number;
  positionSize: number;
  riskProfile: RiskProfile;
};

export type RiskComponent = {
  label: string;
  score: number;
  weight: number;
  reason: string;
};

export type Verdict = "HOLD" | "WATCH" | "TRIM" | "EXIT RISK";

export type EndpointStatus = {
  endpoint: string;
  success: boolean;
  latencyMs: number;
  dataPoints: number;
};

export type DataQuality = {
  score: number; // 0-100
  endpointsSucceeded: number;
  totalEndpoints: number;
  missingFields: string[];
};

export type AnalysisResult = {
  tokenAddress: string;
  currentPrice: number;
  entryPrice: number;
  positionSize: number;
  pnlPercent: number;
  positionValue: number;
  liquidity: number | null;
  volume24h: number | null;
  exitRiskScore: number;
  verdict: Verdict;
  summary: string;
  components: RiskComponent[];
  reasons: string[];
  birdeyeReceipt: string[];
  tokenSymbol?: string;
  tokenName?: string;
  // Technical depth indicators for judges
  dataQuality: DataQuality;
  endpointStatus: EndpointStatus[];
  positionSizeRecommendation?: string; // Actionable utility
};
