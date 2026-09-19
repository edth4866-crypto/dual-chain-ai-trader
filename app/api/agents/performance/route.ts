import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("ai_agent_performance")
      .select("*")
      .order("accuracy_pct", {
        ascending: false,
        nullsFirst: false,
      });

    if (error) {
      console.error("Agent performance fetch failed:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      agents: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (error) {
    console.error("Agent performance API failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
