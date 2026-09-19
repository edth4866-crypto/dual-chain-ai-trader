import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("ai_agent_decisions")
      .select(
        "id,token,symbol,chain,agent_name,agent_status,agent_score,predicted_action,agent_data,entry_price,exit_price,pnl_usd,pnl_pct,prediction_correct,created_at,closed_at,paper_position_id,paper_trade_id"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      decisions: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Agent Arena decisions.",
      },
      { status: 500 }
    );
  }
}
