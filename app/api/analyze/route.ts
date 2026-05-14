import { NextResponse } from "next/server";
import { runBirdeyeAnalysis } from "@/lib/birdeye";
import type { AnalysisRequest, RiskProfile } from "@/lib/types";

function isRiskProfile(value: unknown): value is RiskProfile {
  return value === "conservative" || value === "balanced" || value === "aggressive";
}

export async function POST(request: Request) {
  const apiKey = process.env.BIRDEYE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing BIRDEYE_API_KEY in .env.local." }, { status: 500 });
  }

  const body = await request.json();
  const tokenAddress = String(body.tokenAddress ?? "").trim();
  const entryPrice = Number(body.entryPrice);
  const positionSize = Number(body.positionSize || 0);
  const riskProfile = body.riskProfile;

  if (!tokenAddress || !Number.isFinite(entryPrice) || entryPrice <= 0 || !isRiskProfile(riskProfile)) {
    return NextResponse.json({ error: "Enter a token address, valid entry price, and risk profile." }, { status: 400 });
  }

  const input: AnalysisRequest = {
    tokenAddress,
    entryPrice,
    positionSize: Number.isFinite(positionSize) && positionSize > 0 ? positionSize : entryPrice,
    riskProfile,
  };

  try {
    const result = await runBirdeyeAnalysis(input, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    if (message.includes("Birdeye API rate limit exceeded")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
