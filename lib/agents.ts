import { AgentResult, FinalDecision, TokenCandidate } from "./types";

export const AGENT_NAMES = [
  "Scanner",
  "Liquidity",
  "Volume",
  "Holder",
  "Whale",
  "Momentum",
  "Contract Risk",
  "Social",
  "Risk Veto",
  "Final AI"
];

function scanner(t: TokenCandidate): AgentResult {
  const ok = t.liquidityUsd >= 25_000 && t.volume1hUsd >= 50_000;
  return {name:"Scanner",status:ok?"PASS":"WARN",score:ok?80:45,
    note:ok?"Candidate passes basic market filters.":"Candidate is below one or more basic filters.",
    data:{liquidity:t.liquidityUsd,volume1h:t.volume1hUsd}};
}

function liquidity(t: TokenCandidate): AgentResult {
  const ratio = t.volume1hUsd / Math.max(t.liquidityUsd,1);
  const ok = t.liquidityUsd >= 25_000 && ratio < 15;
  return {name:"Liquidity",status:ok?"PASS":"WARN",score:ok?85:55,
    note:ok?"Liquidity is acceptable for paper-trade simulation.":"Liquidity/slippage risk needs review.",
    data:{volumeLiquidityRatio:ratio}};
}

function volume(t: TokenCandidate): AgentResult {
  const ratio = t.volume5mUsd / Math.max(t.volume1hUsd,1);
  const score = Math.max(0,Math.min(100,50 + ratio*250));
  return {name:"Volume",status:score>=65?"PASS":"WARN",score,
    note:score>=65?"Recent volume is active.":"Recent volume is not especially strong.",
    data:{fiveMinuteShare:ratio}};
}

function holder(t: TokenCandidate): AgentResult {
  const concentration = t.top10HolderPct ?? 20;
  const score = Math.max(0,100 - Math.max(0,concentration-15)*3);
  return {name:"Holder",status:score>=65?"PASS":"WARN",score,
    note:`Estimated top-10 concentration: ${concentration.toFixed(1)}%.`,
    data:{top10HolderPct:concentration}};
}

function whale(t: TokenCandidate): AgentResult {
  const buy = t.buyCount5m ?? 0, sell = t.sellCount5m ?? 0;
  const score = buy+sell === 0 ? 50 : Math.max(0,Math.min(100,50+(buy-sell)*5));
  return {name:"Whale",status:score>=60?"PASS":"WARN",score,
    note:"V1 uses trade-flow proxy; production should use wallet-level flow.",
    data:{buy,sell}};
}

function momentum(t: TokenCandidate): AgentResult {
  const ratio = t.volume5mUsd / Math.max(t.volume1hUsd/12,1);
  const score = Math.max(0,Math.min(100,50 + (ratio-1)*20));
  return {name:"Momentum",status:score>=60?"PASS":"WARN",score,
    note:score>=60?"Momentum proxy is positive.":"Momentum proxy is weak.",
    data:{volumeAcceleration:ratio}};
}

function contractRisk(t: TokenCandidate): AgentResult {
  const mint = !!t.mintAuthority, freeze = !!t.freezeAuthority;
  const bad = mint || freeze;
  return {name:"Contract Risk",status:bad?"VETO":"PASS",score:bad?20:90,
    note:bad?"Mint/freeze authority is enabled in the supplied data.":"Mint and freeze authorities are disabled.",
    data:{mintAuthority:mint,freezeAuthority:freeze}};
}

function social(t: TokenCandidate): AgentResult {
  return {name:"Social",status:"WARN",score:50,
    note:"Social provider is intentionally not connected in V1; do not treat this as a positive signal.",
    data:{}};
}

export function runAgents(t: TokenCandidate): {agents: AgentResult[]; decision: FinalDecision} {
  const agents: AgentResult[] = [];
  const add = (r: AgentResult) => agents.push(r);

  add(scanner(t)); add(liquidity(t)); add(volume(t)); add(holder(t));
  add(whale(t)); add(momentum(t)); add(contractRisk(t)); add(social(t));

  const pre = agents.slice();
  const avg = pre.reduce((s,a)=>s+a.score,0)/pre.length;
  const veto = pre.some(a=>a.status==="VETO");

  const vetoResult: AgentResult = {
    name:"Risk Veto",
    status:veto?"VETO":(avg>=65?"PASS":"WARN"),
    score:veto?0:Math.round(avg),
    note:veto?"At least one hard risk rule failed.":"No hard veto triggered.",
    data:{averageScore:avg}
  };
  add(vetoResult);

  const finalScore = Math.round(veto ? 0 : avg);
  const action = veto ? "VETO" : finalScore >= 75 ? "BUY" : finalScore >= 55 ? "HOLD" : "VETO";

  const decision: FinalDecision = {
    action, score:finalScore,
    confidence: Math.max(0.05, Math.min(0.95, finalScore/100)),
    positionUsd: action==="BUY" ? 25 : 0,
    stopLossPct:15,
    takeProfitPct:35,
    reasons: agents.map(a=>`${a.name}: ${a.note}`).slice(-4)
  };

  add({
    name:"Final AI",
    status:action==="BUY"?"PASS":action==="VETO"?"VETO":"WARN",
    score:finalScore,
    note:`Final action: ${action}. V1 uses deterministic scoring; connect an LLM only after data adapters are verified.`,
    data:decision as unknown as Record<string,unknown>
  });

  return {agents,decision};
}