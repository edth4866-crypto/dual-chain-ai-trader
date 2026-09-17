import { NextResponse } from "next/server";
import { demoCandidates } from "../../../lib/market";
import { runAgents } from "../../../lib/agents";

export async function POST() {
  const candidates = demoCandidates();
  const analyzed = candidates.map(t => {
    const {agents,decision} = runAgents(t);
    return {token:`${t.name} (${t.symbol})`,chain:t.chain,score:decision.score,
      action:decision.action,confidence:decision.confidence,reasons:decision.reasons,
      agents:agents.map(a=>({name:a.name,status:a.status,score:Math.round(a.score),note:a.note}))};
  });
  analyzed.sort((a,b)=>b.score-a.score);
  return NextResponse.json(analyzed[0]);
}