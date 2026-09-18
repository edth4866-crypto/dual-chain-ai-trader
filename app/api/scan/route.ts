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
import { supabase } from "../../../lib/supabase";

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

            /*
             * AI DECISION LOG
             *
             * Every scanned candidate is recorded.
             *
             * The returned database ID is kept so
             * a later Paper Position can be linked
             * back to this exact AI decision.
             */

            let decisionLog:
              { id: number } | null =
              null;

            try {
              const debateAgent =
                agents.find(
                  (agent) =>
                    agent.name ===
                    "Agent Debate"
                );

              const debateData =
                debateAgent?.data ??
                {};

              const debateDecision =
                typeof debateData.decision ===
                "string"
                  ? debateData.decision
                  : null;

              const debateScore =
                Number(
                  debateAgent?.score ??
                    0
                );

              const debateConfidence =
                Number(
                  debateData.confidence ??
                    0
                );

              const buyVotes =
                Number(
                  debateData.buyVotes ??
                    0
                );

              const holdVotes =
                Number(
                  debateData.holdVotes ??
                    0
                );

              const avoidVotes =
                Number(
                  debateData.avoidVotes ??
                    0
                );

              const {
                data:
                  insertedDecisionLog,
                error:
                  decisionLogError,
              } =
                await supabase
                  .from(
                    "ai_decision_logs"
                  )
                  .insert({
                    token:
                      token.address,

                    symbol:
                      token.symbol,

                    chain:
                      token.chain,

                    decision:
                      decision.action,

                    final_score:
                      decision.score,

                    final_confidence:
                      decision.confidence,

                    debate_decision:
                      debateDecision,

                    debate_score:
                      debateScore,

                    debate_confidence:
                      debateConfidence,

                    buy_votes:
                      buyVotes,

                    hold_votes:
                      holdVotes,

                    avoid_votes:
                      avoidVotes,

                    entry_price:
                      token.priceUsd,

                    position_usd:
                      decision.positionUsd,

                    stop_loss_pct:
                      decision.stopLossPct,

                    take_profit_pct:
                      decision.takeProfitPct,
                  })
                  .select("id")
                  .single();

              if (
                decisionLogError
              ) {
                console.error(
                  "AI decision log save failed:",
                  decisionLogError
                );
              } else if (
                insertedDecisionLog
              ) {
                decisionLog = {
                  id: Number(
                    insertedDecisionLog.id
                  ),
                };
              }
            } catch (error) {
              /*
               * Logging failure must NOT stop
               * the existing AI scan or
               * Paper Trading engine.
               */

              console.error(
                "AI decision logging error:",
                error
              );
            }

            let paperTrade = null;

            /*
             * PAPER TRADING
             *
             * Safety rules:
             * 1. BUY decision required
             * 2. Token must have a valid price
             * 3. Never open a second position
             * 4. Paper position size is fixed at $10
             * 5. Never spend more cash than available
             * 6. No real funds are used
             */

            if (
              decision.action === "BUY" &&
              token.priceUsd > 0
            ) {
              const existingPosition =
                await getOpenPosition(
                  token.address
                );

              const account =
                await getPaperAccount();

              const paperPositionUsd = 10;

              const scorePass =
                decision.score >= 70;

              const liquidityPass =
                (token.liquidityUsd ?? 0) >=
                10000;

              const holderPass =
                (token.top10HolderPct ?? 100) <=
                60;

              const whalePass =
                (token.topHolders?.[0]
                  ?.percentageOfSupply ?? 100) <=
                30;

              const contractRiskPass =
                token.mintAuthority !== true &&
                token.freezeAuthority !== true;

              const riskGatePass =
                scorePass &&
                liquidityPass &&
                holderPass &&
                whalePass &&
                contractRiskPass;

              if (existingPosition) {
                paperTrade = {
                  action: "SKIP",
                  reason:
                    "Existing open position",
                  existingPosition,
                };
              } else if (
                !riskGatePass
              ) {
                const failedChecks: string[] =
                  [];

                if (!scorePass) {
                  failedChecks.push(
                    "AI score below 70"
                  );
                }

                if (!liquidityPass) {
                  failedChecks.push(
                    "Liquidity below $10,000"
                  );
                }

                if (!holderPass) {
                  failedChecks.push(
                    "Top 10 holder concentration too high"
                  );
                }

                if (!whalePass) {
                  failedChecks.push(
                    "Top whale concentration too high"
                  );
                }

                if (!contractRiskPass) {
                  failedChecks.push(
                    "Contract risk detected"
                  );
                }

                paperTrade = {
                  action: "SKIP",
                  reason:
                    "Risk Gate rejected",
                  failedChecks,
                };
              } else if (
                paperPositionUsd >
                account.balanceUsd
              ) {
                paperTrade = {
                  action: "SKIP",
                  reason:
                    "Insufficient paper cash",
                };
              } else {
                const position =
                  openPaperPosition(
                    token.address,
                    token.symbol,
                    token.chain === "bsc"
                      ? "bsc"
                      : "solana",
                    token.priceUsd,
                    paperPositionUsd
                  );

                /*
                 * addPosition now returns the
                 * Supabase paper_positions.id.
                 */

                const paperPositionId =
                  await addPosition(
                    position
                  );

                /*
                 * Connect the exact AI decision
                 * to the newly created paper position.
                 */

                if (
                  decisionLog &&
                  decisionLog.id
                ) {
                  const {
                    error:
                      linkError,
                  } =
                    await supabase
                      .from(
                        "ai_decision_logs"
                      )
                      .update({
                        paper_position_id:
                          paperPositionId,
                      })
                      .eq(
                        "id",
                        decisionLog.id
                      );

                  if (
                    linkError
                  ) {
                    console.error(
                      "AI decision to paper position link failed:",
                      linkError
                    );
                  }
                }

                paperTrade = {
                  action: "BUY",

                  position,

                  paperPositionId,

                  aiDecisionLogId:
                    decisionLog?.id ??
                    null,

                  riskGate: {
                    scorePass,
                    liquidityPass,
                    holderPass,
                    whalePass,
                    contractRiskPass,
                  },
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