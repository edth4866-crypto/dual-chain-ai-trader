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
  agents: AgentResult[]
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

  const bullish: {
    name: string;
    score: number;
  }[] = [];

  const bearish: {
    name: string;
    score: number;
  }[] = [];

  for (const agent of specialists) {
    if (
      agent.status === "VETO" ||
      agent.score < 35
    ) {
      avoidVotes++;

      bearish.push({
        name: agent.name,
        score: agent.score,
      });

      continue;
    }

    if (agent.score >= 70) {
      buyVotes++;

      bullish.push({
        name: agent.name,
        score: agent.score,
      });

      continue;
    }

    holdVotes++;
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

  let decision:
    DebateDecision;

  if (avoidVotes >= 2) {
    decision = "AVOID";
  } else if (
    buyVotes > holdVotes &&
    buyVotes > avoidVotes &&
    buyVotes >= 5
  ) {
    decision = "BUY";
  } else {
    decision = "HOLD";
  }

  const score =
    totalVotes > 0
      ? Math.round(
          (
            buyVotes * 100 +
            holdVotes * 50 +
            avoidVotes * 0
          ) /
            totalVotes
        )
      : 50;

  const confidence =
    totalVotes > 0
      ? Math.abs(
          buyVotes -
            avoidVotes
        ) /
        totalVotes
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