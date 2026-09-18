export type SmartMoneyWallet = {
  walletAddress: string;
  percentageOfSupply: number;
  action:
    | "BUY"
    | "SELL"
    | "NEUTRAL";
  netAmount: number;
  transactionCount: number;
};

export type SmartMoneyResult = {
  score: number;
  status:
    | "PASS"
    | "WARN"
    | "VETO";
  signal:
    | "ACCUMULATING"
    | "DISTRIBUTING"
    | "MIXED"
    | "NEUTRAL";
  reasons: string[];
  smartWallets: SmartMoneyWallet[];
};

export function detectSmartMoney(
  wallets: SmartMoneyWallet[]
): SmartMoneyResult {
  if (
    !wallets ||
    wallets.length === 0
  ) {
    return {
      score: 50,
      status: "WARN",
      signal: "NEUTRAL",
      reasons: [
        "Smart-money wallet data is unavailable.",
      ],
      smartWallets: [],
    };
  }

  const activeWallets =
    wallets.filter(
      (wallet) =>
        wallet.transactionCount > 0
    );

  if (
    activeWallets.length === 0
  ) {
    return {
      score: 50,
      status: "WARN",
      signal: "NEUTRAL",
      reasons: [
        "No active wallet behavior detected.",
      ],
      smartWallets: [],
    };
  }

  let buyFlow = 0;
  let sellFlow = 0;

  for (
    const wallet of activeWallets
  ) {
    const amount =
      Math.abs(
        wallet.netAmount
      );

    if (
      wallet.action ===
      "BUY"
    ) {
      buyFlow += amount;
    }

    if (
      wallet.action ===
      "SELL"
    ) {
      sellFlow += amount;
    }
  }

  const totalFlow =
    buyFlow + sellFlow;

  const buyRatio =
    totalFlow > 0
      ? buyFlow /
        totalFlow
      : 0.5;

  const activeRatio =
    Math.min(
      activeWallets.length /
        Math.max(
          wallets.length,
          1
        ),
      1
    );

  const largestWallet =
    [...activeWallets].sort(
      (
        a,
        b
      ) =>
        b.percentageOfSupply -
        a.percentageOfSupply
    )[0];

  const concentration =
    largestWallet
      ?.percentageOfSupply ?? 0;

  let score =
    50;

  score +=
    (buyRatio - 0.5) *
    70;

  score +=
    activeRatio *
    15;

  if (
    concentration >= 5 &&
    largestWallet?.action ===
      "BUY"
  ) {
    score += 10;
  }

  if (
    concentration >= 20
  ) {
    score -= 20;
  }

  score =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );

  let signal:
    | "ACCUMULATING"
    | "DISTRIBUTING"
    | "MIXED"
    | "NEUTRAL";

  if (
    buyRatio >= 0.65
  ) {
    signal =
      "ACCUMULATING";
  } else if (
    buyRatio <= 0.35
  ) {
    signal =
      "DISTRIBUTING";
  } else if (
    buyRatio >= 0.45 &&
    buyRatio <= 0.55
  ) {
    signal =
      "NEUTRAL";
  } else {
    signal =
      "MIXED";
  }

  const reasons: string[] =
    [];

  reasons.push(
    `Active wallets: ${activeWallets.length}/${wallets.length}.`
  );

  reasons.push(
    `Smart-money buy flow: ${(buyRatio * 100).toFixed(1)}%.`
  );

  if (
    signal ===
    "ACCUMULATING"
  ) {
    reasons.push(
      "Smart-money wallets show net accumulation."
    );
  }

  if (
    signal ===
    "DISTRIBUTING"
  ) {
    reasons.push(
      "Smart-money wallets show net distribution."
    );
  }

  if (
    largestWallet
  ) {
    reasons.push(
      `Largest active wallet: ${largestWallet.percentageOfSupply.toFixed(
        2
      )}% with ${largestWallet.action} activity.`
    );
  }

  let status:
    | "PASS"
    | "WARN"
    | "VETO";

  if (
    signal ===
      "DISTRIBUTING" &&
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

  return {
    score,
    status,
    signal,
    reasons,
    smartWallets:
      activeWallets,
  };
}