import { NextResponse } from "next/server";
import { getCandidatesForChain } from "../../../lib/market";
import { runAgents } from "../../../lib/agents";
import {
  analyzeTopWhales,
} from "../../../lib/chain/solana";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const selectedChain =
      body.chain === "bsc" ? "bsc" : "solana";

    const candidates =
      await getCandidatesForChain(selectedChain);

    if (candidates.length === 0) {
      return NextResponse.json({
        token: "No candidate",
        chain: selectedChain,
        score: 0,
        action: "HOLD",
        confidence: 0,
        reasons: ["No market candidates found."],
        agents: [],
        whale: null,
        whaleFlow: null,
        topWhales: [],
      });
    }

    const analyzed = await Promise.all(
      candidates.map(async (token) => {
        let topWhales: Awaited<ReturnType<typeof analyzeTopWhales>> = [];

        if (
          token.chain === "solana" &&
          token.topHolders &&
          token.topHolders.length > 0
        ) {
          try {
            topWhales = await analyzeTopWhales(
              token.topHolders,
              token.address
            );
          } catch (error) {
            console.error(
              "Top whale analysis failed:",
              error
            );
          }
        }

        const { agents, decision } =
          runAgents(token, topWhales);

        const largestWhale =
          token.topHolders?.[0] || null;

        const whaleFlow =
          topWhales.length > 0
            ? topWhales[0]
            : null;

        return {
          token: `${token.name} (${token.symbol})`,
          chain: token.chain,
          score: decision.score,
          action: decision.action,
          confidence: decision.confidence,
          reasons: decision.reasons,

          whale: largestWhale
            ? {
                walletOwner:
                  largestWhale.walletOwner,
                amount:
                  largestWhale.amount,
                percentageOfSupply:
                  largestWhale.percentageOfSupply,
              }
            : null,

          whaleFlow,

          topWhales,

          agents: agents.map((agent) => ({
            name: agent.name,
            status: agent.status,
            score: Math.round(agent.score),
            note: agent.note,
          })),
        };
      })
    );

    analyzed.sort(
      (a, b) => b.score - a.score
    );

    return NextResponse.json(analyzed[0]);
  } catch (error) {
    console.error("SCAN ERROR:", error);

    return NextResponse.json(
      {
        error: "Market scan failed",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
