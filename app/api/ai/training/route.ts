import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("ai_training_data")
      .select(`
        id,
        token,
        symbol,
        chain,
        entry_price,
        exit_price,
        invested_usd,
        exit_value_usd,
        pnl_usd,
        pnl_pct,
        result_label,
        opened_at,
        closed_at
      `)
      .order("closed_at", { ascending: false });

    if (error) {
      console.error("AI training data error:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const rows = data ?? [];

    const total = rows.length;

    const wins = rows.filter(
      (row) => row.result_label === "WIN"
    ).length;

    const losses = rows.filter(
      (row) => row.result_label === "LOSS"
    ).length;

    const neutral = rows.filter(
      (row) => row.result_label === "NEUTRAL"
    ).length;

    const totalPnl = rows.reduce(
      (sum, row) => sum + Number(row.pnl_usd || 0),
      0
    );

    const averagePnlPct =
      total > 0
        ? rows.reduce(
            (sum, row) => sum + Number(row.pnl_pct || 0),
            0
          ) / total
        : 0;

    const winRate =
      total > 0
        ? (wins / total) * 100
        : 0;

    const { count: linkedDecisions, error: linkedError } =
      await supabase
        .from("ai_decision_logs")
        .select("id", {
          count: "exact",
          head: true,
        })
        .or(
          "paper_position_id.not.is.null,paper_trade_id.not.is.null"
        );

    if (linkedError) {
      console.error(
        "Linked AI decisions error:",
        linkedError
      );
    }

    const { data: trainingLinks, error: trainingLinksError } =
      await supabase
        .from("ai_decision_logs")
        .select("paper_trade_id")
        .not("paper_trade_id", "is", null);

    if (trainingLinksError) {
      console.error(
        "Training link lookup error:",
        trainingLinksError
      );
    }

    const linkedTradeIds = new Set(
      (trainingLinks ?? [])
        .map((row) => row.paper_trade_id)
        .filter(
          (id): id is number =>
            id !== null && id !== undefined
        )
    );

    const { data: trainingTradeRows, error: tradeRowsError } =
      await supabase
        .from("paper_trades")
        .select("id");

    if (tradeRowsError) {
      console.error(
        "Paper trade lookup error:",
        tradeRowsError
      );
    }

    const unlinkedTrades = (trainingTradeRows ?? []).filter(
      (trade) => !linkedTradeIds.has(trade.id)
    ).length;

    return NextResponse.json({
      success: true,

      stats: {
        total,
        wins,
        losses,
        neutral,
        winRate,
        totalPnl,
        averagePnlPct,
        linkedDecisions: linkedDecisions ?? 0,
        unlinkedTrades,
      },

      rows,
    });
  } catch (error) {
    console.error("AI TRAINING API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}