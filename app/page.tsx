use client';

import { useState } from "react";

type Result = {
  token: string;
  chain: string;
  score: number;
  action: string;
  confidence: number;
  reasons: string[];
  agents: {name:string; status:string; score:number; note:string}[];
};

export default function Home() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function runScan() {
    setLoading(true);
    const r = await fetch("/api/scan", {method:"POST"});
    const data = await r.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main style={{maxWidth:1100,margin:"0 auto",padding:"40px 20px"}}>
      <h1 style={{fontSize:36,marginBottom:8}}>Dual-Chain AI Trader</h1>
      <p style={{color:"#a1a1aa"}}>Solana + Robinhood Chain · 10-Agent Handoff · Paper Trading</p>

      <button onClick={runScan} disabled={loading}
        style={{marginTop:25,padding:"13px 20px",borderRadius:10,border:0,cursor:"pointer"}}>
        {loading ? "Analyzing..." : "Run AI Scan"}
      </button>

      {result && (
        <section style={{marginTop:30,display:"grid",gap:16}}>
          <div style={{padding:22,border:"1px solid #27272a",borderRadius:14}}>
            <div style={{color:"#a1a1aa"}}>{result.chain}</div>
            <h2>{result.token}</h2>
            <div style={{fontSize:28}}>Score {result.score}/100</div>
            <div style={{fontSize:22,marginTop:8}}>{result.action} · {(result.confidence*100).toFixed(0)}% confidence</div>
            <ul>{result.reasons.map((x,i)=><li key={i}>{x}</li>)}</ul>
          </div>

          <div style={{padding:22,border:"1px solid #27272a",borderRadius:14}}>
            <h3>Agent Handoff</h3>
            {result.agents.map((a,i)=>(
              <div key={i} style={{padding:"12px 0",borderBottom:"1px solid #1f2024"}}>
                <b>{a.name}</b> — {a.status} — {a.score}/100
                <div style={{color:"#a1a1aa",marginTop:4}}>{a.note}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}