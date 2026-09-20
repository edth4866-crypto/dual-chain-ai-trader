import type {
  AgentResult,
} from "../types";

export type DebateDecision =
  | "BUY"
  | "HOLD"
  | "AVOID";

export type DebateResult = {
  decision: DebateDecision;

  score: number;

  confidence: number;

  buyVotes: number;

  holdVotes: number;

  avoidVotes: number;

  strongestBullish: string[];

  strongestBearish: string[];

  summary: string;
};

export function runAgentDebate(
  agents: AgentResult[],
  performanceWeights: Record<string, number> = {}
): DebateResult {
  const specialists =
    agents.filter(
      (agent) =>
        agent.name !== "Final AI" &&
        agent.name !== "Risk Veto"
    );

  let buyVotes = 0;
  let holdVotes = 0;
  let avoidVotes = 0;

  let weightedBuyVotes = 0;
  let weightedHoldVotes = 0;
  let weightedAvoidVotes = 0;

  const bullish: {
    name: string;
    score: number;
  }[] = [];

  const bearish: {
    name: string;
    score: number;
  }[] = [];

  for (const agent of specialists) {
    const weight =
      performanceWeights[agent.name] ?? 1;

    if (
      agent.status === "VETO" ||
      agent.score < 35
    ) {
      avoidVotes++;
      weightedAvoidVotes += weight;

      bearish.push({
        name: agent.name,
        score: agent.score,
      });

      continue;
    }

    if (agent.score >= 70) {
      buyVotes++;
      weightedBuyVotes += weight;

      bullish.push({
        name: agent.name,
        score: agent.score,
      });

      continue;
    }

    holdVotes++;
    weightedHoldVotes += weight;
  }

  bullish.sort(
    (a, b) =>
      b.score - a.score
  );

  bearish.sort(
    (a, b) =>
      a.score - b.score
  );

  const totalVotes =
    buyVotes +
    holdVotes +
    avoidVotes;

  const weightedTotalVotes =
    weightedBuyVotes +
    weightedHoldVotes +
    weightedAvoidVotes;

  let decision:
    DebateDecision;

  /*
   * Safety rule stays unweighted:
   * two independent avoidance signals
   * can still block the trade.
   */
  if (avoidVotes >= 2) {
    decision = "AVOID";
  } else if (
    weightedBuyVotes > weightedHoldVotes &&
    weightedBuyVotes > weightedAvoidVotes &&
    buyVotes >= 5
  ) {
    decision = "BUY";
  } else {
    decision = "HOLD";
  }

  const score =
    weightedTotalVotes > 0
      ? Math.round(
          (
            weightedBuyVotes * 100 +
            weightedHoldVotes * 50
          ) /
            weightedTotalVotes
        )
      : 50;

  const confidence =
    weightedTotalVotes > 0
      ? Math.abs(
          weightedBuyVotes -
            weightedAvoidVotes
        ) /
        weightedTotalVotes
      : 0;

  const strongestBullish =
    bullish
      .slice(0, 3)
      .map(
        (agent) =>
          `${agent.name} ${agent.score}/100`
      );

  const strongestBearish =
    bearish
      .slice(0, 3)
      .map(
        (agent) =>
          `${agent.name} ${agent.score}/100`
      );

  let summary =
    `Debate result: ${decision}. ` +
    `BUY ${buyVotes}, ` +
    `HOLD ${holdVotes}, ` +
    `AVOID ${avoidVotes}.`;

  if (
    strongestBullish.length > 0
  ) {
    summary +=
      ` Strongest bullish signals: ${strongestBullish.join(
        ", "
      )}.`;
  }

  if (
    strongestBearish.length > 0
  ) {
    summary +=
      ` Strongest bearish signals: ${strongestBearish.join(
        ", "
      )}.`;
  }

  return {
    decision,
    score,
    confidence,
    buyVotes,
    holdVotes,
    avoidVotes,
    strongestBullish,
    strongestBearish,
    summary,
  };
}