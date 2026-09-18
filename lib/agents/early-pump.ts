export type EarlyPumpInput = {
  priceChange5mPct: number;
  priceChange1hPct: number;

  volume5mUsd: number;
  volume1hUsd: number;

  liquidityUsd: number;

  buyCount5m: number;
  sellCount5m: number;
};

export type EarlyPumpResult = {
  score: number;

  status:
    | "PASS"
    | "WARN"
    | "VETO";

  signal:
    | "EARLY_ACCELERATION"
    | "MOMENTUM"
    | "NEUTRAL"
    | "REVERSAL_RISK";

  reasons: string[];
};

export function detectEarlyPump(
  input: EarlyPumpInput
): EarlyPumpResult {
  let score = 50;

  const reasons: string[] = [];

  const totalTrades =
    input.buyCount5m +
    input.sellCount5m;

  const buyRatio =
    totalTrades > 0
      ? input.buyCount5m /
        totalTrades
      : 0.5;

  const volumeAcceleration =
    input.volume1hUsd > 0
      ? input.volume5mUsd /
        (input.volume1hUsd / 12)
      : 0;

  const liquidityActivity =
    input.liquidityUsd > 0
      ? input.volume5mUsd /
        input.liquidityUsd
      : 0;

  /*
   * Price acceleration
   */

  if (
    input.priceChange5mPct >= 10
  ) {
    score += 20;

    reasons.push(
      "Strong 5-minute price acceleration detected."
    );
  } else if (
    input.priceChange5mPct >= 5
  ) {
    score += 12;

    reasons.push(
      "Positive short-term price acceleration detected."
    );
  } else if (
    input.priceChange5mPct >= 2
  ) {
    score += 6;
  }

  /*
   * 1-hour momentum
   */

  if (
    input.priceChange1hPct >= 100
  ) {
    score += 10;

    reasons.push(
      "Strong 1-hour momentum detected."
    );
  } else if (
    input.priceChange1hPct >= 50
  ) {
    score += 7;
  } else if (
    input.priceChange1hPct < -30
  ) {
    score -= 15;

    reasons.push(
      "Negative 1-hour momentum detected."
    );
  }

  /*
   * Volume acceleration
   *
   * Compare the latest 5-minute
   * volume against the average
   * 5-minute volume implied by
   * the 1-hour volume.
   */

  if (
    volumeAcceleration >= 3
  ) {
    score += 20;

    reasons.push(
      "Very strong volume acceleration detected."
    );
  } else if (
    volumeAcceleration >= 2
  ) {
    score += 14;

    reasons.push(
      "Strong volume acceleration detected."
    );
  } else if (
    volumeAcceleration >= 1.5
  ) {
    score += 8;
  }

  /*
   * Buy pressure
   */

  if (
    buyRatio >= 0.7
  ) {
    score += 15;

    reasons.push(
      "Strong 5-minute buy pressure detected."
    );
  } else if (
    buyRatio >= 0.6
  ) {
    score += 8;
  } else if (
    buyRatio <= 0.3
  ) {
    score -= 15;

    reasons.push(
      "Strong 5-minute sell pressure detected."
    );
  }

  /*
   * Liquidity activity
   */

  if (
    liquidityActivity >= 0.5
  ) {
    score += 10;

    reasons.push(
      "Trading activity is high relative to liquidity."
    );
  } else if (
    liquidityActivity >= 0.2
  ) {
    score += 5;
  }

  /*
   * Reversal risk
   */

  if (
    input.priceChange5mPct < -10 &&
    input.priceChange1hPct > 50
  ) {
    score -= 20;

    reasons.push(
      "Short-term reversal risk detected."
    );
  }

  /*
   * Clamp score
   */

  score = Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );

  let signal:
    | "EARLY_ACCELERATION"
    | "MOMENTUM"
    | "NEUTRAL"
    | "REVERSAL_RISK";

  if (
    input.priceChange5mPct >= 5 &&
    volumeAcceleration >= 1.5 &&
    buyRatio >= 0.6
  ) {
    signal =
      "EARLY_ACCELERATION";
  } else if (
    input.priceChange1hPct >= 50 &&
    buyRatio >= 0.55
  ) {
    signal =
      "MOMENTUM";
  } else if (
    input.priceChange5mPct < -10
  ) {
    signal =
      "REVERSAL_RISK";
  } else {
    signal =
      "NEUTRAL";
  }

  let status:
    | "PASS"
    | "WARN"
    | "VETO";

  if (
    signal ===
      "REVERSAL_RISK" &&
    score < 35
  ) {
    status = "VETO";
  } else if (
    score >= 65
  ) {
    status = "PASS";
  } else {
    status = "WARN";
  }

  if (
    reasons.length === 0
  ) {
    reasons.push(
      "No strong early-pump signal detected."
    );
  }

  return {
    score,
    status,
    signal,
    reasons,
  };
}