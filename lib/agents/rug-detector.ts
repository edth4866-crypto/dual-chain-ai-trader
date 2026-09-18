export type RugDetectorInput = {
  liquidityUsd: number;
  liquidityChangePct?: number;

  top10HolderPct: number;
  largestHolderPct: number;

  mintAuthority: boolean;
  freezeAuthority: boolean;

  devWalletPct?: number;
  devWalletSellPct?: number;

  volume1hUsd: number;
  priceChange5mPct: number;
  priceChange1hPct: number;
};

export type RugDetectorResult = {
  score: number;
  status: "PASS" | "WARN" | "VETO";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  reasons: string[];
};

export function detectRugRisk(
  input: RugDetectorInput
): RugDetectorResult {
  let score = 100;
  const reasons: string[] = [];

  /*
   * 1. Contract authority
   */

  if (input.mintAuthority) {
    score -= 35;
    reasons.push(
      "Mint authority is active."
    );
  }

  if (input.freezeAuthority) {
    score -= 35;
    reasons.push(
      "Freeze authority is active."
    );
  }

  /*
   * 2. Liquidity
   */

  if (input.liquidityUsd < 5_000) {
    score -= 30;
    reasons.push(
      "Liquidity is critically low."
    );
  } else if (input.liquidityUsd < 10_000) {
    score -= 15;
    reasons.push(
      "Liquidity is relatively low."
    );
  }

  if (
    input.liquidityChangePct !== undefined &&
    input.liquidityChangePct < -30
  ) {
    score -= 35;
    reasons.push(
      "Liquidity dropped sharply."
    );
  }

  /*
   * 3. Holder concentration
   */

  if (input.top10HolderPct > 70) {
    score -= 30;
    reasons.push(
      "Top 10 holders control a very large share."
    );
  } else if (input.top10HolderPct > 60) {
    score -= 20;
    reasons.push(
      "Top 10 holder concentration is high."
    );
  }

  if (input.largestHolderPct > 30) {
    score -= 25;
    reasons.push(
      "Largest holder concentration is high."
    );
  }

  /*
   * 4. Developer wallet
   */

  if (
    input.devWalletPct !== undefined &&
    input.devWalletPct > 15
  ) {
    score -= 20;
    reasons.push(
      "Developer wallet holds a significant share."
    );
  }

  if (
    input.devWalletSellPct !== undefined &&
    input.devWalletSellPct > 50
  ) {
    score -= 30;
    reasons.push(
      "Developer wallet has sold a significant amount."
    );
  }

  /*
   * 5. Suspicious volume / momentum
   */

  if (
    input.volume1hUsd > 0 &&
    input.liquidityUsd > 0 &&
    input.volume1hUsd /
      input.liquidityUsd >
      20
  ) {
    score -= 10;
    reasons.push(
      "Trading volume is extremely high relative to liquidity."
    );
  }

  if (
    input.priceChange5mPct < -25 &&
    input.priceChange1hPct < -40
  ) {
    score -= 20;
    reasons.push(
      "Sharp price deterioration detected."
    );
  }

  /*
   * Clamp score
   */

  score = Math.max(
    0,
    Math.min(100, score)
  );

  /*
   * Final classification
   */

  let status:
    | "PASS"
    | "WARN"
    | "VETO";

  let riskLevel:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "EXTREME";

  if (score < 30) {
    status = "VETO";
    riskLevel = "EXTREME";
  } else if (score < 50) {
    status = "VETO";
    riskLevel = "HIGH";
  } else if (score < 70) {
    status = "WARN";
    riskLevel = "MEDIUM";
  } else {
    status = "PASS";
    riskLevel = "LOW";
  }

  if (reasons.length === 0) {
    reasons.push(
      "No major rug-risk signals detected."
    );
  }

  return {
    score,
    status,
    riskLevel,
    reasons,
  };
}