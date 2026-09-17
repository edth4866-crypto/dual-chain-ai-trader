import { AgentResult, FinalDecision, TokenCandidate } from "./types";

export const AGENT_NAMES = [
  "Scanner",
  "Liquidity",
  "Volume",
  "Holder",
  "Whale",
  "Momentum",
  "Contract Risk",
  "Social",
  "Risk Veto",
  "Final AI",
];

function scanner(t: TokenCandidate): AgentResult {
  const score = t.marketCapUsd > 0 ? 60 : 30;

  return {
    name: "Scanner",
    status: score >= 60 ? "PASS" : "WARN",
    score,
    note:
      score >= 60
        ? "Market candidate has usable market data."
        : "Market data is incomplete.",
    data: {
      priceUsd: t.priceUsd,
      marketCapUsd: t.marketCapUsd,
    },
  };
}

function liquidity(t: TokenCandidate): AgentResult {
  const score = Math.max(
    0,
    Math.min(100, (t.liquidityUsd / 100000) * 100)
  );

  return {
    name: "Liquidity",
    status: score >= 60 ? "PASS" : "WARN",
    score,
    note:
      score >= 60
        ? "Liquidity is sufficient for the current paper-trading filter."
        : "Liquidity is relatively low.",
    data: {
      liquidityUsd: t.liquidityUsd,
    },
  };
}

function volume(t: TokenCandidate): AgentResult {
  const volume1h = Math.max(t.volume1hUsd, 0);
  const volume5m = Math.max(t.volume5mUsd, 0);

  const buyCount = Math.max(t.buyCount5m ?? 0, 0);
  const sellCount = Math.max(t.sellCount5m ?? 0, 0);

  const totalTrades = buyCount + sellCount;

  const buyRatio =
    totalTrades > 0
      ? buyCount / totalTrades
      : 0.5;

  const volumeScore = Math.min(
    100,
    (volume1h / 100000) * 100
  );

  const acceleration =
    volume1h > 0
      ? volume5m / (volume1h / 12)
      : 0;

  const accelerationScore = Math.max(
    0,
    Math.min(
      100,
      50 + (acceleration - 1) * 25
    )
  );

  const pressureScore = buyRatio * 100;

  const score = Math.round(
    volumeScore * 0.4 +
    accelerationScore * 0.3 +
    pressureScore * 0.3
  );

  return {
    name: "Volume",
    status: score >= 60 ? "PASS" : "WARN",
    score,
    note:
      `1h volume $${volume1h.toLocaleString()}, ` +
      `buy pressure ${(buyRatio * 100).toFixed(1)}%.`,
    data: {
      volume5mUsd: volume5m,
      volume1hUsd: volume1h,
      buyCount5m: buyCount,
      sellCount5m: sellCount,
      buyRatio,
      volumeScore,
      acceleration,
      accelerationScore,
      pressureScore,
    },
  };
}

function holder(t: TokenCandidate): AgentResult {
  const concentration = t.top10HolderPct;

  if (concentration === undefined) {
    return {
      name: "Holder",
      status: "WARN",
      score: 40,
      note: "Holder concentration data is unavailable.",
      data: {},
    };
  }

  let score = 100 - concentration * 1.5;
  score = Math.max(0, Math.min(100, score));

  let status: AgentResult["status"] = "PASS";

  if (concentration >= 50) {
    status = "VETO";
  } else if (concentration >= 30) {
    status = "WARN";
  }

  return {
    name: "Holder",
    status,
    score,
    note: `Actual top-10 holder concentration: ${concentration.toFixed(1)}%.`,
    data: {
      top10HolderPct: concentration,
      topHolders: t.topHolders || [],
    },
  };
}

type WhaleFlowInput = {
  percentageOfSupply: number;
  action: "BUY" | "SELL" | "NEUTRAL";
  netAmount: number;
  transactionCount: number;
};

function whale(
  t: TokenCandidate,
  whaleFlows: WhaleFlowInput[] = []
): AgentResult {
  const holders = t.topHolders || [];

  if (holders.length === 0) {
    return {
      name: "Whale",
      status: "WARN",
      score: 40,
      note: "Wallet-level holder data is unavailable.",
      data: {},
    };
  }

  const largest = holders[0];
  const largestPct = largest?.percentageOfSupply || 0;

  let concentrationScore = 100 - largestPct * 2;
  concentrationScore = Math.max(
    0,
    Math.min(100, concentrationScore)
  );

  let flowScore = 50;

  if (whaleFlows.length > 0) {
    let buy = 0;
    let sell = 0;

    for (const flow of whaleFlows) {
      if (flow.action === "BUY") {
        buy += Math.abs(flow.netAmount);
      } else if (flow.action === "SELL") {
        sell += Math.abs(flow.netAmount);
      }
    }

    const total = buy + sell;

    if (total > 0) {
      flowScore = (buy / total) * 100;
    }
  }

  const score = Math.round(
    concentrationScore * 0.5 +
    flowScore * 0.5
  );

  let status: AgentResult["status"] = "PASS";

  if (largestPct >= 30) {
    status = "VETO";
  } else if (score < 40 || largestPct >= 15) {
    status = "WARN";
  }

  return {
    name: "Whale",
    status,
    score,
    note: `Whale concentration: ${largestPct.toFixed(
      2
    )}%. Top-whale flow score: ${flowScore.toFixed(0)}/100.`,
    data: {
      largestHolder: largest,
      topHolders: holders,
      whaleFlowScore: flowScore,
    },
  };
}

function momentum(t: TokenCandidate): AgentResult {
  const baseline = Math.max(t.volume1hUsd / 12, 1);
  const volumeRatio = t.volume5mUsd / baseline;

  const volumeScore = Math.max(
    0,
    Math.min(100, 50 + (volumeRatio - 1) * 20)
  );

  const price5m = t.priceChange5mPct ?? 0;
  const price1h = t.priceChange1hPct ?? 0;
  const price24h = t.priceChange24hPct ?? 0;

  const priceScore = Math.max(
    0,
    Math.min(
      100,
      50 +
        price5m * 2 +
        price1h * 1.5 +
        price24h * 0.5
    )
  );

  const score = Math.round(
    volumeScore * 0.4 +
    priceScore * 0.6
  );

  return {
    name: "Momentum",
    status: score >= 60 ? "PASS" : "WARN",
    score,
    note:
      `Price momentum: 5m ${price5m.toFixed(2)}%, ` +
      `1h ${price1h.toFixed(2)}%, ` +
      `24h ${price24h.toFixed(2)}%.`,
    data: {
      volumeAcceleration: volumeRatio,
      priceChange5mPct: price5m,
      priceChange1hPct: price1h,
      priceChange24hPct: price24h,
      volumeScore,
      priceScore,
    },
  };
}

function contractRisk(t: TokenCandidate): AgentResult {
  const mint = !!t.mintAuthority;
  const freeze = !!t.freezeAuthority;
  const bad = mint || freeze;

  return {
    name: "Contract Risk",
    status: bad ? "VETO" : "PASS",
    score: bad ? 20 : 90,
    note: bad
      ? "Mint/freeze authority is enabled in the supplied data."
      : "Mint and freeze authorities are disabled.",
    data: {
      mintAuthority: mint,
      freezeAuthority: freeze,
    },
  };
}

function social(): AgentResult {
  return {
    name: "Social",
    status: "WARN",
    score: 50,
    note:
      "Social provider is not connected yet; no positive social signal is assumed.",
    data: {},
  };
}

function riskVeto(
  agents: AgentResult[]
): AgentResult {
  const vetoes = agents.filter(
    (agent) => agent.status === "VETO"
  );

  if (vetoes.length > 0) {
    return {
      name: "Risk Veto",
      status: "VETO",
      score: 0,
      note: `Risk veto triggered by ${vetoes
        .map((agent) => agent.name)
        .join(", ")}.`,
      data: {
        vetoAgents: vetoes.map((agent) => agent.name),
      },
    };
  }

  const average =
    agents.reduce((sum, agent) => sum + agent.score, 0) /
    Math.max(agents.length, 1);

  return {
    name: "Risk Veto",
    status: "WARN",
    score: Math.round(average),
    note: "No hard risk veto was triggered.",
    data: {},
  };
}

export function runAgents(
  t: TokenCandidate,
  whaleFlows: WhaleFlowInput[] = []
): {
  agents: AgentResult[];
  decision: FinalDecision;
} {
  const agents: AgentResult[] = [];

  const add = (result: AgentResult) => {
    agents.push(result);
  };

  add(scanner(t));
  add(liquidity(t));
  add(volume(t));
  add(holder(t));
  add(whale(t, whaleFlows));
  add(momentum(t));
  add(contractRisk(t));
  add(social());

  const vetoAgent = riskVeto(agents);
  add(vetoAgent);

  const hasVeto = agents.some(
    (agent) => agent.status === "VETO"
  );

  const baseAgents = agents.filter(
    (agent) => agent.name !== "Risk Veto"
  );

  const averageScore =
    baseAgents.reduce(
      (sum, agent) => sum + agent.score,
      0
    ) / Math.max(baseAgents.length, 1);

  const finalScore = Math.round(
    Math.max(0, Math.min(100, averageScore))
  );

  const action: FinalDecision["action"] = hasVeto
    ? "VETO"
    : finalScore >= 75
    ? "BUY"
    : finalScore <= 35
    ? "SELL"
    : "HOLD";

  const finalAI: AgentResult = {
    name: "Final AI",
    status: hasVeto
      ? "VETO"
      : finalScore >= 75
      ? "PASS"
      : "WARN",
    score: finalScore,
    note: hasVeto
      ? "Final decision blocked by risk veto."
      : `Final multi-agent score: ${finalScore}/100.`,
    data: {
      action,
    },
  };

  add(finalAI);

  const reasons = agents
    .filter(
      (agent) =>
        agent.name !== "Final AI" &&
        agent.name !== "Risk Veto"
    )
    .filter(
      (agent) =>
        agent.status === "VETO" ||
        agent.status === "PASS"
    )
    .map(
      (agent) => `${agent.name}: ${agent.note}`
    );

  return {
    agents,
    decision: {
      action,
      score: finalScore,
      confidence: finalScore / 100,
      positionUsd: action === "BUY" ? 100 : 0,
      stopLossPct: 10,
      takeProfitPct: 20,
      reasons,
    },
  };
}
