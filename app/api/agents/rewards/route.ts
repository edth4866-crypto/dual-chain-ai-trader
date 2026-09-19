import { NextResponse } from "next/server";
import { AGENT_NAMES } from "../../../../lib/agents";
import { getAgentRewardState } from "../../../../lib/agents/performance";

export async function GET() {
  try {
    const agents = await Promise.all(
      AGENT_NAMES.map(async (agentName) => ({
        agentName,
        ...(await getAgentRewardState(agentName)),
      }))
    );

    return NextResponse.json({
      ok: true,
      agents,
      count: agents.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
