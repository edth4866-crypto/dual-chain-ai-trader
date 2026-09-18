import {
  AgentResult,
  FinalDecision,
  TokenCandidate,
} from "./types";

import {
  detectRugRisk,
} from "./agents/rug-detector";

import {
  detectSmartMoney,
  SmartMoneyWallet,
} from "./agents/smart-money";

import {
  detectEarlyPump,
  EarlyPumpInput,
} from "./agents/early-pump";

import {
  runAgentDebate,
} from "./agents/debate";

export const AGENT_NAMES = [
  "Scanner",
  "Liquidity",
  "Volume",
  "Holder",
  "Whale",
  "Smart Money",
  "Early Pump",
  "Momentum",
  "Contract Risk",
  "Rug Detector",
  "Social",
  "Boost",
  "Agent Debate",
  "Risk Veto",
  "Final AI",
];

function scanner(
  t: TokenCandidate
): AgentResult {
  const liquidity =
    t.liquidityUsd ?? 0;

  const volume =
    t.volume1hUsd ?? 0;

  const top10 =
    t.top10HolderPct ?? 100;

  const largestHolder =
    t.topHolders?.[0]
      ?.percentageOfSupply ?? 0;

  let score = 50;

  if (liquidity >= 10000) {
    score += 15;
  }

  if (
    liquidity > 0 &&
    volume / liquidity >= 5
  ) {
    score += 15;
  }

  if (top10 <= 40) {
    score += 10;
  }

  if (largestHolder <= 20) {
    score += 10;
  }

  score = Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );

  return {
    name: "Scanner",
    status:
      score >= 70
        ? "PASS"
        : "WARN",
    score,
    note:
      `Initial scan score: ${score}/100.`,
    data: {
      liquidityUsd:
        liquidity,
      volume1hUsd:
        volume,
      top10HolderPct:
        top10,
      largestHolderPct:
        largestHolder,
    },
  };
}

function liquidity(
  t: TokenCandidate
): AgentResult {
  const liquidity =
    t.liquidityUsd ?? 0;

  let score = 0;

  if (liquidity >= 100000) {
    score = 100;
  } else if (liquidity >= 50000) {
    score = 85;
  } else if (liquidity >= 25000) {
    score = 70;
  } else if (liquidity >= 10000) {
    score = 55;
  } else {
    score = 25;
  }

  return {
    name: "Liquidity",
    status:
      score >= 70
        ? "PASS"
        : "WARN",
    score,
    note:
      `Liquidity: $${liquidity.toLocaleString()}.`,
    data: {
      liquidityUsd:
        liquidity,
    },
  };
}

function volume(
  t: TokenCandidate
): AgentResult {
  const volume5m =
    t.volume5mUsd ?? 0;

  const volume1h =
    t.volume1hUsd ?? 0;

  const liquidity =
    t.liquidityUsd ?? 0;

  const ratio =
    liquidity > 0
      ? volume1h / liquidity
      : 0;

  let score = 50;

  if (ratio >= 20) {
    score = 90;
  } else if (ratio >= 10) {
    score = 80;
  } else if (ratio >= 5) {
    score = 70;
  } else if (ratio >= 2) {
    score = 60;
  } else if (ratio >= 1) {
    score = 50;
  } else {
    score = 35;
  }

  return {
    name: "Volume",
    status:
      score >= 65
        ? "PASS"
        : "WARN",
    score,
    note:
      `5m volume $${volume5m.toLocaleString()}, 1h volume $${volume1h.toLocaleString()}, volume/liquidity ratio ${ratio.toFixed(
        2
      )}x.`,
    data: {
      volume5mUsd:
        volume5m,
      volume1hUsd:
        volume1h,
      volumeLiquidityRatio:
        ratio,
    },
  };
}

function holder(
  t: TokenCandidate
): AgentResult {
  const top10 =
    t.top10HolderPct ?? 100;

  let score = 100;

  if (top10 > 70) {
    score = 25;
  } else if (top10 > 60) {
    score = 40;
  } else if (top10 > 50) {
    score = 55;
  } else if (top10 > 40) {
    score = 70;
  } else if (top10 > 30) {
    score = 82;
  }

  return {
    name: "Holder",
    status:
      score >= 70
        ? "PASS"
        : "WARN",
    score,
    note:
      `Top 10 holders control ${top10.toFixed(
        1
      )}% of supply.`,
    data: {
      top10HolderPct:
        top10,
    },
  };
}

type WhaleFlowInput = {
  percentageOfSupply: number;
  action:
    | "BUY"
    | "SELL"
    | "NEUTRAL";
  netAmount: number;
  transactionCount: number;
  walletAddress?: string;
};

function whale(
  t: TokenCandidate,
  whaleFlows: WhaleFlowInput[] = []
): AgentResult {
  const largestHolder =
    t.topHolders?.[0]
      ?.percentageOfSupply ?? 0;

  let score = 100;

  if (largestHolder > 30) {
    score = 25;
  } else if (largestHolder > 20) {
    score = 45;
  } else if (largestHolder > 15) {
    score = 65;
  } else if (largestHolder > 10) {
    score = 80;
  }

  const activeFlows =
    whaleFlows.filter(
      (flow) =>
        flow.transactionCount > 0
    );

  const buyFlows =
    activeFlows.filter(
      (flow) =>
        flow.action === "BUY"
    );

  const sellFlows =
    activeFlows.filter(
      (flow) =>
        flow.action === "SELL"
    );

  const buyPressure =
    activeFlows.length > 0
      ? buyFlows.length /
        activeFlows.length
      : 0.5;

  if (
    buyFlows.length >
    sellFlows.length
  ) {
    score += 5;
  }

  if (
    sellFlows.length >
    buyFlows.length
  ) {
    score -= 10;
  }

  score = Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );

  return {
    name: "Whale",
    status:
      score >= 70
        ? "PASS"
        : "WARN",
    score,
    note:
      `Largest holder concentration ${largestHolder.toFixed(
        2
      )}%, buy pressure ${(
        buyPressure * 100
      ).toFixed(1)}%.`,
    data: {
      largestHolderPct:
        largestHolder,
      activeWallets:
        activeFlows.length,
      buyWallets:
        buyFlows.length,
      sellWallets:
        sellFlows.length,
      buyPressure,
    },
  };
}

function smartMoney(
  whaleFlows: WhaleFlowInput[] = []
): AgentResult {
  const wallets: SmartMoneyWallet[] =
    whaleFlows.map(
      (flow, index) => ({
        walletAddress:
          flow.walletAddress ??
          `unknown-${index}`,
        percentageOfSupply:
          flow.percentageOfSupply,
        action:
          flow.action,
        netAmount:
          flow.netAmount,
        transactionCount:
          flow.transactionCount,
      })
    );

  const result =
    detectSmartMoney(
      wallets
    );

  return {
    name: "Smart Money",
    status:
      result.status,
    score:
      result.score,
    note:
      result.reasons.join(" "),
    data: {
      signal:
        result.signal,
      reasons:
        result.reasons,
      activeWallets:
        result.smartWallets.length,
      smartWallets:
        result.smartWallets,
    },
  };
}

function earlyPump(
  t: TokenCandidate
): AgentResult {
  const input: EarlyPumpInput =
    {
      priceChange5mPct:
        t.priceChange5mPct ?? 0,

      priceChange1hPct:
        t.priceChange1hPct ?? 0,

      volume5mUsd:
        t.volume5mUsd ?? 0,

      volume1hUsd:
        t.volume1hUsd ?? 0,

      liquidityUsd:
        t.liquidityUsd ?? 0,

      buyCount5m:
        t.buyCount5m ?? 0,

      sellCount5m:
        t.sellCount5m ?? 0,
    };

  const result =
    detectEarlyPump(
      input
    );

  return {
    name: "Early Pump",
    status:
      result.status,
    score:
      result.score,
    note:
      result.reasons.join(" "),
    data: {
      signal:
        result.signal,
      reasons:
        result.reasons,
      priceChange5mPct:
        input.priceChange5mPct,
      priceChange1hPct:
        input.priceChange1hPct,
      volume5mUsd:
        input.volume5mUsd,
      volume1hUsd:
        input.volume1hUsd,
      buyCount5m:
        input.buyCount5m,
      sellCount5m:
        input.sellCount5m,
    },
  };
}

function momentum(
  t: TokenCandidate
): AgentResult {
  const change5m =
    t.priceChange5mPct ?? 0;

  const change1h =
    t.priceChange1hPct ?? 0;

  let score = 50;

  if (change5m > 10) {
    score += 20;
  } else if (change5m > 3) {
    score += 10;
  } else if (change5m < -10) {
    score -= 20;
  }

  if (change1h > 100) {
    score += 25;
  } else if (change1h > 50) {
    score += 18;
  } else if (change1h > 20) {
    score += 10;
  } else if (change1h < -30) {
    score -= 20;
  }

  score = Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );

  return {
    name: "Momentum",
    status:
      score >= 70
        ? "PASS"
        : "WARN",
    score,
    note:
      `5m ${change5m.toFixed(
        2
      )}%, 1h ${change1h.toFixed(
        2
      )}%.`,
    data: {
      priceChange5mPct:
        change5m,
      priceChange1hPct:
        change1h,
    },
  };
}

function contractRisk(
  t: TokenCandidate
): AgentResult {
  const mint =
    !!t.mintAuthority;

  const freeze =
    !!t.freezeAuthority;

  const dangerous =
    mint || freeze;

  return {
    name: "Contract Risk",
    status:
      dangerous
        ? "VETO"
        : "PASS",
    score:
      dangerous
        ? 20
        : 90,
    note:
      dangerous
        ? "Mint or freeze authority is active."
        : "Mint/freeze authorities are disabled.",
    data: {
      mintAuthority:
        mint,
      freezeAuthority:
        freeze,
    },
  };
}

function rugDetector(
  t: TokenCandidate
): AgentResult {
  const largestHolderPct =
    t.topHolders?.[0]
      ?.percentageOfSupply ?? 0;

  const result =
    detectRugRisk({
      liquidityUsd:
        t.liquidityUsd,

      top10HolderPct:
        t.top10HolderPct ?? 0,

      largestHolderPct,

      mintAuthority:
        !!t.mintAuthority,

      freezeAuthority:
        !!t.freezeAuthority,

      volume1hUsd:
        t.volume1hUsd,

      priceChange5mPct:
        t.priceChange5mPct ?? 0,

      priceChange1hPct:
        t.priceChange1hPct ?? 0,
    });

  return {
    name: "Rug Detector",
    status:
      result.status,
    score:
      result.score,
    note:
      result.reasons.join(" "),
    data: {
      riskLevel:
        result.riskLevel,
      reasons:
        result.reasons,
      liquidityUsd:
        t.liquidityUsd,
      top10HolderPct:
        t.top10HolderPct ?? 0,
      largestHolderPct,
      mintAuthority:
        !!t.mintAuthority,
      freezeAuthority:
        !!t.freezeAuthority,
    },
  };
}

function social(
  t: TokenCandidate
): AgentResult {
  const socialCount =
    t.socialLinks?.length ?? 0;

  const websiteCount =
    t.websiteLinks?.length ?? 0;

  let score = 40;

  if (socialCount >= 1) {
    score += 20;
  }

  if (socialCount >= 2) {
    score += 10;
  }

  if (websiteCount >= 1) {
    score += 15;
  }

  if (
    t.description &&
    t.description.trim().length > 20
  ) {
    score += 5;
  }

  score = Math.max(
    0,
    Math.min(
      100,
      score
    )
  );

  return {
    name: "Social",
    status:
      score >= 65
        ? "PASS"
        : "WARN",
    score,
    note:
      `Social links: ${socialCount}, website links: ${websiteCount}.`,
    data: {
      socialLinks:
        socialCount,
      websiteLinks:
        websiteCount,
      hasDescription:
        !!t.description,
    },
  };
}

function boost(
  t: TokenCandidate
): AgentResult {
  const active =
    !!t.boostActive;

  const amount =
    t.boostAmount ?? 0;

  let score =
    active
      ? 75
      : 50;

  if (
    active &&
    amount > 0
  ) {
    score = Math.min(
      100,
      75 +
        Math.min(
          amount,
          25
        )
    );
  }

  return {
    name: "Boost",
    status:
      score >= 70
        ? "PASS"
        : "WARN",
    score,
    note:
      active
        ? `DexScreener Boost active: ${amount}.`
        : "No active DexScreener Boost.",
    data: {
      boostActive:
        active,
      boostAmount:
        amount,
    },
  };
}

function riskVeto(
  agents: AgentResult[]
): AgentResult {
  const hardRisks =
    agents.filter(
      (agent) =>
        agent.status ===
        "VETO"
    );

  const riskScores =
    agents.map(
      (agent) =>
        agent.score
    );

  const averageRisk =
    riskScores.length > 0
      ? riskScores.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        riskScores.length
      : 0;

  if (
    hardRisks.length > 0
  ) {
    return {
      name: "Risk Veto",
      status: "VETO",
      score:
        Math.round(
          averageRisk
        ),
      note:
        `Hard risk veto triggered by: ${hardRisks
          .map(
            (agent) =>
              agent.name
          )
          .join(", ")}.`,
      data: {
        vetoAgents:
          hardRisks.map(
            (agent) =>
              agent.name
          ),
      },
    };
  }

  return {
    name: "Risk Veto",
    status: "WARN",
    score:
      Math.round(
        averageRisk
      ),
    note:
      "No hard risk veto.",
    data: {
      vetoAgents: [],
    },
  };
}

export function runAgents(
  t: TokenCandidate,
  whaleFlows: WhaleFlowInput[] = []
): {
  agents: AgentResult[];
  decision: FinalDecision;
} {
  const agents: AgentResult[] =
    [];

  const add = (
    result: AgentResult
  ) => {
    agents.push(result);
  };

  /*
   * BASE AGENTS
   */

  add(scanner(t));

  add(liquidity(t));

  add(volume(t));

  add(holder(t));

  add(
    whale(
      t,
      whaleFlows
    )
  );

  add(
    smartMoney(
      whaleFlows
    )
  );

  add(
    earlyPump(t)
  );

  add(momentum(t));

  add(contractRisk(t));

  add(rugDetector(t));

  add(social(t));

  add(boost(t));

  /*
   * AGENT DEBATE
   *
   * Debate uses the specialist agents above.
   * Final AI and Risk Veto are intentionally
   * excluded from the debate itself.
   */

  const debate =
    runAgentDebate(
      agents
    );

  const debateStatus:
    | "PASS"
    | "WARN"
    | "VETO" =
    debate.decision ===
    "BUY"
      ? "PASS"
      : debate.decision ===
        "AVOID"
        ? "VETO"
        : "WARN";

  const debateAgent:
    AgentResult =
    {
      name: "Agent Debate",

      status:
        debateStatus,

      score:
        debate.score,

      note:
        debate.summary,

      data: {
        decision:
          debate.decision,

        confidence:
          debate.confidence,

        buyVotes:
          debate.buyVotes,

        holdVotes:
          debate.holdVotes,

        avoidVotes:
          debate.avoidVotes,

        strongestBullish:
          debate.strongestBullish,

        strongestBearish:
          debate.strongestBearish,
      },
    };

  add(debateAgent);

  /*
   * RISK VETO
   *
   * Debate AVOID becomes a hard veto.
   * This prevents Final AI from ignoring
   * a strong multi-agent avoidance signal.
   */

  const vetoAgent =
    riskVeto(
      agents
    );

  add(vetoAgent);

  const hasVeto =
    agents.some(
      (agent) =>
        agent.status ===
        "VETO"
    );

  /*
   * BASE SCORE
   *
   * Exclude synthesized agents from
   * the base average.
   */

  const baseAgents =
    agents.filter(
      (agent) =>
        agent.name !==
          "Risk Veto" &&
        agent.name !==
          "Agent Debate"
    );

  const averageScore =
    baseAgents.reduce(
      (sum, agent) =>
        sum + agent.score,
      0
    ) /
    Math.max(
      baseAgents.length,
      1
    );

  /*
   * FINAL SCORE
   *
   * 80% specialist analysis
   * 20% agent debate
   */

  const combinedScore =
    averageScore * 0.8 +
    debate.score * 0.2;

  const finalScore =
    Math.round(
      Math.max(
        0,
        Math.min(
          100,
          combinedScore
        )
      )
    );

  /*
   * FINAL ACTION
   */

  const action:
    FinalDecision["action"] =
    hasVeto
      ? "VETO"
      : finalScore >= 75
        ? "BUY"
        : finalScore <= 35
          ? "SELL"
          : "HOLD";

  /*
   * FINAL AI
   */

  const finalAI: AgentResult =
    {
      name: "Final AI",

      status:
        hasVeto
          ? "VETO"
          : finalScore >= 75
            ? "PASS"
            : "WARN",

      score:
        finalScore,

      note:
        hasVeto
          ? "Final decision blocked by risk veto."
          : `Final multi-agent score: ${finalScore}/100. Debate: ${debate.decision} (${debate.score}/100).`,

      data: {
        action,

        specialistScore:
          Math.round(
            averageScore
          ),

        debateDecision:
          debate.decision,

        debateScore:
          debate.score,

        debateConfidence:
          debate.confidence,

        buyVotes:
          debate.buyVotes,

        holdVotes:
          debate.holdVotes,

        avoidVotes:
          debate.avoidVotes,
      },
    };

  add(finalAI);

  /*
   * REASONS
   */

  const reasons =
    agents
      .filter(
        (agent) =>
          agent.name !==
            "Final AI" &&
          agent.name !==
            "Risk Veto"
      )
      .filter(
        (agent) =>
          agent.status ===
            "VETO" ||
          agent.status ===
            "PASS"
      )
      .map(
        (agent) =>
          `${agent.name}: ${agent.note}`
      );

  reasons.push(
    `Agent Debate: ${debate.summary}`
  );

  return {
    agents,

    decision: {
      action,

      score:
        finalScore,

      confidence:
        finalScore / 100,

      positionUsd:
        action === "BUY"
          ? 100
          : 0,

      stopLossPct: 10,

      takeProfitPct: 20,

      reasons,
    },
  };
}