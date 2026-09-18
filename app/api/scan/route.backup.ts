import { NextResponse } from "next/server";
import { getCandidatesForChain } from "../../../lib/market";
import {
  runAgents,
} from "../../../lib/agents";
import {
  analyzeTopWhales,
} from "../../../lib/chain/solana";
import {
  getOpenPosition,
  getPaperAccount,
  addPosition,
} from "../../../lib/paper/store";
import {
  openPaperPosition,
} from "../../../lib/paper/engine";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request
        .json()
        .catch(() => ({}));

    const selectedChain =
      body.chain === "bsc"
        ? "bsc"
        : "solana";

    const candidates =
      await getCandidatesForChain(
        selectedChain
      );

    if (
      candidates.length === 0
    ) {
      return NextResponse.json({
        chain: selectedChain,
        totalCandidates: 0,
        candidates: [],
      });
    }

    const rankedCandidates =
      [...candidates]
        .sort(
          (a, b) =>
            (b.candidateRank ?? 0) -
            (a.candidateRank ?? 0)
        )
        .slice(0, 10);

    const analyzed =
      await Promise.all(
        rankedCandidates.map(
          async (token) => {
            let topWhales:
              Awaited<
                ReturnType<
                  typeof analyzeTopWhales
                >
              > = [];

            if (
              token.chain ===
                "solana" &&
              token.topHolders &&
              token.topHolders.length >
                0
            ) {
              try {
                topWhales =
                  await analyzeTopWhales(
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

            const {
              agents,
              decision,
            } =
              runAgents(
                token,
                topWhales
              );

            let paperTrade = null;

            if (
              decision.action === "BUY" &&
              decision.positionUsd > 0 &&
              token.priceUsd > 0
            ) {
              const existingPosition =
                getOpenPosition(
                  token.address
                );

              const account = await getPaperAccount();

              if (
                !existingPosition &&
                decision.positionUsd <=
                  account.balanceUsd
              ) {
                const position =
                  openPaperPosition(
                    token.address,
                    token.symbol,
                    "solana",
                    token.priceUsd,
                    decision.positionUsd
                  );

                addPosition(position);

                paperTrade = {
                  action: "BUY",
                  position,
                };
              }
            }

            const largestWhale =
              token.topHolders?.[0] ??
              null;

            const whaleFlow =
              topWhales.length > 0
                ? topWhales[0]
                : null;

            return {
              token:
                `${token.name} (${token.symbol})`,

              symbol:
                token.symbol,

              name:
                token.name,

              address:
                token.address,

              chain:
                token.chain,

              paperTrade,

              candidateRank:
                token.candidateRank ??
                0,

              score:
                decision.score,

              action:
                decision.action,

              confidence:
                decision.confidence,

              positionUsd:
                decision.positionUsd,

              stopLossPct:
                decision.stopLossPct,

              takeProfitPct:
                decision.takeProfitPct,

              reasons:
                decision.reasons,

              market: {
                priceUsd:
                  token.priceUsd,

                liquidityUsd:
                  token.liquidityUsd,

                volume5mUsd:
                  token.volume5mUsd,

                volume1hUsd:
                  token.volume1hUsd,

                marketCapUsd:
                  token.marketCapUsd,

                priceChange5mPct:
                  token.priceChange5mPct,

                priceChange1hPct:
                  token.priceChange1hPct,

                priceChange24hPct:
                  token.priceChange24hPct,

                buyCount5m:
                  token.buyCount5m,

                sellCount5m:
                  token.sellCount5m,
              },

              security: {
                mintAuthority:
                  token.mintAuthority,

                freezeAuthority:
                  token.freezeAuthority,

                top10HolderPct:
                  token.top10HolderPct,
              },

              social: {
                socialLinks:
                  token.socialLinks,

                websiteLinks:
                  token.websiteLinks,

                description:
                  token.description,
              },

              boost: {
                active:
                  token.boostActive,

                amount:
                  token.boostAmount,
              },

              whale:
                largestWhale
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

              agents:
                agents.map(
                  (agent) => ({
                    name:
                      agent.name,

                    status:
                      agent.status,

                    score:
                      Math.round(
                        agent.score
                      ),

                    note:
                      agent.note,
                  })
                ),
            };
          }
        )
      );

    /*
     * 최종 AI 점수 기준으로 다시 정렬
     */
    analyzed.sort(
      (a, b) =>
        b.score -
        a.score
    );

    /*
     * 최종 순위 부여
     */
    const finalCandidates =
      analyzed.map(
        (candidate, index) => ({
          ...candidate,

          finalRank:
            index + 1,
        })
      );

    return NextResponse.json({
      chain:
        selectedChain,

      totalCandidates:
        finalCandidates.length,

      candidates:
        finalCandidates,

      generatedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "SCAN ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Market scan failed",

        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}