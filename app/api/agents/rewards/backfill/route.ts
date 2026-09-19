import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";
import {
  calculateAgentReward,
} from "../../../../../lib/agents/performance";

export async function POST() {
  try {
    const { data: decisions, error: decisionsError } =
      await supabase
        .from("ai_agent_decisions")
        .select(
          "id, agent_name, agent_score, paper_position_id, paper_trade_id, pnl_pct, prediction_correct"
        )
        .not("prediction_correct", "is", null)
        .not("paper_position_id", "is", null)
        .not("paper_trade_id", "is", null)
        .not("pnl_pct", "is", null);

    if (decisionsError) {
      throw new Error(
        `Failed to load evaluated decisions: ${decisionsError.message}`
      );
    }

    let created = 0;
    let skipped = 0;

    for (const row of decisions ?? []) {
      const { data: existing, error: existingError } =
        await supabase
          .from("ai_agent_rewards")
          .select("id")
          .eq("agent_name", row.agent_name)
          .eq("paper_position_id", row.paper_position_id)
          .eq("paper_trade_id", row.paper_trade_id)
          .limit(1);

      if (existingError) {
        throw new Error(
          `Failed to check existing reward: ${existingError.message}`
        );
      }

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const reward = calculateAgentReward(
        row.prediction_correct,
        row.pnl_pct,
        row.agent_score
      );

      const { error: insertError } =
        await supabase
          .from("ai_agent_rewards")
          .insert({
            agent_name: row.agent_name,
            paper_trade_id: row.paper_trade_id,
            paper_position_id: row.paper_position_id,
            reward_xp: reward.xp,
            reputation_change: reward.reputationChange,
            virtual_capital_change: reward.virtualCapitalChange,
            reward_reason: reward.reason,
          });

      if (insertError) {
        throw new Error(
          `Failed to create reward for ${row.agent_name}: ${insertError.message}`
        );
      }

      created++;
    }

    return NextResponse.json({
      ok: true,
      created,
      skipped,
      totalEvaluatedDecisions: decisions?.length ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
