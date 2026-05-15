import type { AnalysisRequest, EndpointStatus, DataQuality } from "./types";
import { analyzePosition } from "./scoring";

const BASE_URL = "https://public-api.birdeye.so";

// Track endpoint status for technical depth visibility
interface EndpointResult {
  endpoint: string;
  success: boolean;
  latencyMs: number;
  dataPoints: number;
  data: unknown;
}

async function getBirdeye(path: string, params: Record<string, string>, apiKey: string, retries = 2): Promise<EndpointResult> {
  const startTime = performance.now();
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": "solana",
          accept: "application/json",
        },
        cache: "no-store",
      });

      const latencyMs = performance.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        // Count data points as a proxy for data richness
        const dataPoints = countDataPoints(data);
        return { endpoint: path, success: true, latencyMs, dataPoints, data };
      }

      if (response.status === 429 && attempt < retries) {
        const delayMs = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (response.status === 429) {
        console.error(`Birdeye API rate limit exceeded for ${path}`);
        throw new Error("Birdeye API rate limit exceeded. Please wait a few seconds and try again.");
      }

      console.error(`Birdeye API error for ${path}: ${response.status} ${response.statusText}`);
      return { endpoint: path, success: false, latencyMs, dataPoints: 0, data: null };
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      console.error(`Birdeye API fetch error for ${path}:`, error);
      return { endpoint: path, success: false, latencyMs, dataPoints: 0, data: null };
    }
  }

  return { endpoint: path, success: false, latencyMs: performance.now() - startTime, dataPoints: 0, data: null };
}

// Count data points recursively to measure data richness
function countDataPoints(obj: unknown): number {
  if (obj === null || typeof obj !== "object") return 0;
  if (Array.isArray(obj)) return obj.length;
  return Object.keys(obj as Record<string, unknown>).length;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = numberOrNull(value);
    if (parsed !== null) return parsed;
  }

  return null;
}

export async function runBirdeyeAnalysis(input: AnalysisRequest, apiKey: string) {
  const address = input.tokenAddress;

  // Fetch 4 Birdeye endpoints concurrently for post-entry risk analysis
  const [price, overview, security, tradeData] = await Promise.allSettled([
    getBirdeye("/defi/price", { address, include_liquidity: "true" }, apiKey),
    getBirdeye("/defi/token_overview", { address }, apiKey),
    getBirdeye("/defi/token_security", { address }, apiKey),
    getBirdeye("/defi/v3/token/trade-data/single", { address }, apiKey),
  ]);

  // Extract endpoint results and status for technical depth visibility
  const priceResult = price.status === "fulfilled" ? price.value : null;
  const overviewResult = overview.status === "fulfilled" ? overview.value : null;
  const securityResult = security.status === "fulfilled" ? security.value : null;
  const tradeResult = tradeData.status === "fulfilled" ? tradeData.value : null;

  const endpointStatus: EndpointStatus[] = [
    priceResult ? { endpoint: priceResult.endpoint, success: priceResult.success, latencyMs: priceResult.latencyMs, dataPoints: priceResult.dataPoints } : { endpoint: "/defi/price", success: false, latencyMs: 0, dataPoints: 0 },
    overviewResult ? { endpoint: overviewResult.endpoint, success: overviewResult.success, latencyMs: overviewResult.latencyMs, dataPoints: overviewResult.dataPoints } : { endpoint: "/defi/token_overview", success: false, latencyMs: 0, dataPoints: 0 },
    securityResult ? { endpoint: securityResult.endpoint, success: securityResult.success, latencyMs: securityResult.latencyMs, dataPoints: securityResult.dataPoints } : { endpoint: "/defi/token_security", success: false, latencyMs: 0, dataPoints: 0 },
    tradeResult ? { endpoint: tradeResult.endpoint, success: tradeResult.success, latencyMs: tradeResult.latencyMs, dataPoints: tradeResult.dataPoints } : { endpoint: "/defi/v3/token/trade-data/single", success: false, latencyMs: 0, dataPoints: 0 },
  ];

  // Calculate data quality score based on endpoint success and data richness
  const succeeded = endpointStatus.filter(e => e.success).length;
  const total = endpointStatus.length;
  const totalDataPoints = endpointStatus.reduce((sum, e) => sum + e.dataPoints, 0);
  const dataQuality: DataQuality = {
    score: Math.round((succeeded / total) * 100),
    endpointsSucceeded: succeeded,
    totalEndpoints: total,
    missingFields: endpointStatus.filter(e => !e.success).map(e => e.endpoint),
  };

  if (!priceResult || !priceResult.success) {
    throw new Error("Birdeye price endpoint failed. Cannot analyze without current price.");
  }

  const priceData = (priceResult.data as { data?: Record<string, unknown> })?.data ?? {};
  const overviewData = (overviewResult?.data as { data?: Record<string, unknown> })?.data ?? {};
  const securityData = (securityResult?.data as { data?: Record<string, unknown> })?.data ?? {};
  const trade = (tradeResult?.data as { data?: Record<string, unknown> })?.data ?? {};

  const currentPrice = numberOrNull(priceData.value as number | undefined);

  if (!currentPrice) {
    throw new Error("Birdeye did not return a valid current price for this token.");
  }

  const buy = firstNumber(trade.buy_volume_24h as number | undefined, trade.buyVolume24h as number | undefined, trade.volumeBuy24h as number | undefined, trade.volume_buy_24h as number | undefined, trade.buyVolume as number | undefined, trade.buy_volume as number | undefined, trade.buyVolume24hUsd as number | undefined, trade.buy_volume_24h_usd as number | undefined);
  const sell = firstNumber(trade.sell_volume_24h as number | undefined, trade.sellVolume24h as number | undefined, trade.volumeSell24h as number | undefined, trade.volume_sell_24h as number | undefined, trade.sellVolume as number | undefined, trade.sell_volume as number | undefined, trade.sellVolume24hUsd as number | undefined, trade.sell_volume_24h_usd as number | undefined);
  const buySellRatio = buy !== null && sell !== null && sell > 0 ? buy / sell : null;

  const volumeFromOverview = firstNumber(
    overviewData.v24hUSD as number | undefined,
    overviewData.v24h as number | undefined,
    overviewData.volume24h as number | undefined,
    overviewData.volume24hUSD as number | undefined,
    overviewData.volume_24h as number | undefined,
    overviewData.volume_24h_usd as number | undefined,
    overviewData.v24hChange as number | undefined,
    overviewData.v24hChangePercent as number | undefined,
    overviewData.v24hChangeAmount as number | undefined
  );

  const volumeFromTrade = firstNumber(
    trade.volume_24h as number | undefined,
    trade.volume24h as number | undefined,
    trade.v24hUSD as number | undefined,
    trade.volume_24h_usd as number | undefined,
    trade.volume24hUSD as number | undefined
  );

  const volumeFromPrice = firstNumber(
    priceData.volume_24h as number | undefined,
    priceData.volume24h as number | undefined,
    priceData.v24hUSD as number | undefined
  );

  return analyzePosition(input, {
    price: currentPrice,
    liquidity: firstNumber(priceData.liquidity, overviewData.liquidity, overviewData.liquidityUSD, overviewData.liquidity_usd),
    volume24h: firstNumber(volumeFromOverview, volumeFromTrade, volumeFromPrice),
    priceChange24h: firstNumber(overviewData.priceChange24hPercent, overviewData.priceChange24h, overviewData.priceChange24hPercent, overviewData.priceChange24hUSD, overviewData.priceChange24hAmount),
    holders: numberOrNull(overviewData.holder),
    topHolderPercent: numberOrNull(securityData.top10HolderPercent) ?? numberOrNull(securityData.top10HolderBalancePercent),
    mintAuthorityRisk: Boolean(securityData.mintAuthority || securityData.mutableMetadata),
    freezeAuthorityRisk: Boolean(securityData.freezeAuthority),
    buySellRatio,
    tokenSymbol: overviewData.symbol as string | undefined,
    tokenName: overviewData.name as string | undefined,
    dataQuality,
    endpointStatus,
  });
}
