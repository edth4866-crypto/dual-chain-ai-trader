import { supabase } from "../supabase";

type AgentDecisionRow = {
  id: number;
  agent_name: string;
  agent_status: string | null;
  agent_score: number | null;
  predicted_action: string | null;
  paper_position_id: number | null;
  paper_trade_id: number | null;
  entry_price: number | null;
  exit_price: number | null;
  pnl_usd: number | null;
  pnl_pct: number | null;
  prediction_correct: boolean | null;
  closed_at: string | null;
};

function evaluatePrediction(
  row: AgentDecisionRow,
  pnlPct: number
): boolean | null {
  let action = row.predicted_action?.toUpperCase() ?? null;

  if (row.agent_name === "Risk Veto") {
    action = row.agent_status?.toUpperCase() === "VETO"
      ? "VETO"
      : "HOLD";
  }

  if (
    row.agent_name === "Rug Detector" &&
    row.agent_status?.toUpperCase() === "VETO"
  ) {
    action = "VETO";
  }

  if (!action) {
    return null;
  }

  if (action === "BUY") {
    return pnlPct > 0;
  }

  if (
    action === "AVOID" ||
    action === "VETO" ||
    action === "SELL"
  ) {
    return pnlPct <= 0;
  }

  if (action === "HOLD") {
    return Math.abs(pnlPct) < 5;
  }

  return null;
}

export async function evaluatePaperTradeForAgents(
  paperPositionId: number,
  paperTradeId: number | null,
  entryPrice: number,
  exitPrice: number,
  pnlUsd: number,
  pnlPct: number,
  closedAt: string
) {
  const { data: rows, error: fetchError } =
    await supabase
      .from("ai_agent_decisions")
      .select("*")
      .eq(
        "paper_position_id",
        paperPositionId
      );

  if (fetchError) {
    throw new Error(
      `Failed to load agent decisions: ${fetchError.message}`
    );
  }

  if (!rows || rows.length === 0) {
    return {
      evaluated: 0,
      correct: 0,
      wrong: 0,
    };
  }

  let correct = 0;
  let wrong = 0;
  let evaluated = 0;

  for (const rawRow of rows) {
    const row =
      rawRow as AgentDecisionRow;

    const predictionCorrect =
      evaluatePrediction(
        row,
        pnlPct
      );

    if (predictionCorrect === null) {
      continue;
    }

    evaluated++;

    if (predictionCorrect) {
      correct++;
    } else {
      wrong++;
    }

    const { error: updateError } =
      await supabase
        .from("ai_agent_decisions")
        .update({
          paper_trade_id:
            paperTradeId,
          entry_price:
            entryPrice,
          exit_price:
            exitPrice,
          pnl_usd:
            pnlUsd,
          pnl_pct:
            pnlPct,
          prediction_correct:
            predictionCorrect,
          closed_at:
            closedAt,
        })
        .eq("id", row.id);

    if (updateError) {
      throw new Error(
        `Failed to update agent decision ${row.id}: ${updateError.message}`
      );
    }

    const reward = calculateAgentReward(
      predictionCorrect,
      pnlPct,
      row.agent_score
    );

    await saveAgentReward(
      row.agent_name,
      paperTradeId,
      paperPositionId,
      reward
    );
  }

  return {
    evaluated,
    correct,
    wrong,
  };
}

export async function refreshAgentPerformance() {
  const { data: decisions, error: decisionsError } =
    await supabase
      .from("ai_agent_decisions")
      .select(
        "agent_name, pnl_usd, pnl_pct, prediction_correct"
      )
      .not("prediction_correct", "is", null);

  if (decisionsError) {
    throw new Error(
      `Failed to load evaluated agent decisions: ${decisionsError.message}`
    );
  }

  const grouped = new Map<
    string,
    {
      evaluated: number;
      correct: number;
      wrong: number;
      pnlUsdTotal: number;
      pnlPctTotal: number;
    }
  >();

  for (const row of decisions ?? []) {
    const agentName = row.agent_name;

    if (!agentName) {
      continue;
    }

    const current =
      grouped.get(agentName) ?? {
        evaluated: 0,
        correct: 0,
        wrong: 0,
        pnlUsdTotal: 0,
        pnlPctTotal: 0,
      };

    current.evaluated += 1;

    if (row.prediction_correct === true) {
      current.correct += 1;
    } else {
      current.wrong += 1;
    }

    current.pnlUsdTotal += Number(row.pnl_usd ?? 0);
    current.pnlPctTotal += Number(row.pnl_pct ?? 0);

    grouped.set(agentName, current);
  }

  for (const [
    agentName,
    stats,
  ] of grouped) {
    const evaluated =
      stats.evaluated;

    const accuracyPct =
      evaluated > 0
        ? (stats.correct / evaluated) * 100
        : null;

    const avgPnlUsd =
      evaluated > 0
        ? stats.pnlUsdTotal / evaluated
        : null;

    const avgPnlPct =
      evaluated > 0
        ? stats.pnlPctTotal / evaluated
        : null;

    const { data: existing, error: existingError } =
      await supabase
        .from("ai_agent_performance")
        .select("agent_name")
        .eq("agent_name", agentName)
        .maybeSingle();

    if (existingError) {
      throw new Error(
        `Failed to check agent performance ${agentName}: ${existingError.message}`
      );
    }

    if (existing) {
      const { error: updateError } =
        await supabase
          .from("ai_agent_performance")
          .update({
            evaluated_trades: evaluated,
            correct_predictions:
              stats.correct,
            wrong_predictions:
              stats.wrong,
            accuracy_pct:
              accuracyPct,
            avg_pnl_usd:
              avgPnlUsd,
            avg_pnl_pct:
              avgPnlPct,
          })
          .eq(
            "agent_name",
            agentName
          );

      if (updateError) {
        throw new Error(
          `Failed to update agent performance ${agentName}: ${updateError.message}`
        );
      }
    } else {
      const { error: insertError } =
        await supabase
          .from("ai_agent_performance")
          .insert({
            agent_name: agentName,
            evaluated_trades: evaluated,
            correct_predictions:
              stats.correct,
            wrong_predictions:
              stats.wrong,
            accuracy_pct:
              accuracyPct,
            avg_pnl_usd:
              avgPnlUsd,
            avg_pnl_pct:
              avgPnlPct,
            total_decisions: 0,
          });

      if (insertError) {
        throw new Error(
          `Failed to insert agent performance ${agentName}: ${insertError.message}`
        );
      }
    }
  }

  return {
    evaluatedAgents:
      grouped.size,
  };
}

export function calculateAgentReward(
  predictionCorrect: boolean,
  pnlPct: number,
  agentScore: number | null
) {
  let xp = predictionCorrect ? 10 : -5;
  let reason = predictionCorrect ? "Correct prediction" : "Wrong prediction";

  if (predictionCorrect && pnlPct >= 20) {
    xp += 15;
    reason += " +20% profit bonus";
  } else if (predictionCorrect && pnlPct >= 10) {
    xp += 10;
    reason += " +10% profit bonus";
  }

  if (!predictionCorrect && pnlPct <= -10) {
    xp -= 10;
    reason += " -10% bad prediction penalty";
  }

  if (agentScore !== null && agentScore >= 90 && predictionCorrect) {
    xp += 5;
    reason += " +high-confidence bonus";
  }

  return {
    xp,
    reputationChange: xp * 0.5,
    virtualCapitalChange: xp * 2,
    reason,
  };
}

export async function saveAgentReward(
  agentName: string,
  paperTradeId: number | null,
  paperPositionId: number,
  reward: {
    xp: number;
    reputationChange: number;
    virtualCapitalChange: number;
    reason: string;
  }
) {
  const { error } = await supabase
    .from("ai_agent_rewards")
    .upsert(
      {
        agent_name: agentName,
        paper_trade_id: paperTradeId,
        paper_position_id: paperPositionId,
        reward_xp: reward.xp,
        reputation_change: reward.reputationChange,
        virtual_capital_change: reward.virtualCapitalChange,
        reward_reason: reward.reason,
      },
      {
        onConflict:
          "agent_name,paper_trade_id",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    throw new Error(
      `Failed to save agent reward ${agentName}: ${error.message}`
    );
  }
}

export async function getAgentRewardState(agentName: string) {
  const { data: rewards, error } = await supabase
    .from("ai_agent_rewards")
    .select("reward_xp, reputation_change, virtual_capital_change, streak")
    .eq("agent_name", agentName)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load agent reward state ${agentName}: ${error.message}`
    );
  }

  const rows = rewards ?? [];

  return {
    totalXp: rows.reduce(
      (sum, row) => sum + Number(row.reward_xp ?? 0),
      0
    ),
    reputation: 50 + rows.reduce(
      (sum, row) => sum + Number(row.reputation_change ?? 0),
      0
    ),
    virtualCapital: 1000 + rows.reduce(
      (sum, row) => sum + Number(row.virtual_capital_change ?? 0),
      0
    ),
    streak: rows[0]?.streak ?? 0,
  };
}
