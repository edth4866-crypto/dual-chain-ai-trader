import { NextResponse } from "next/server";
import { getCandidatesForChain } from "../../../lib/market";
import { runAgents } from "../../../lib/agents";
import { analyzeTopWhales } from "../../../lib/chain/solana";
import {
  getOpenPosition,
  getPaperAccount,
  addPosition,
} from "../../../lib/paper/store";
import { openPaperPosition } from "../../../lib/paper/engine";
import { supabase } from "../../../lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const selectedChain =
      body.chain === "bsc"
        ? "bsc"
        : "solana";

    const candidates =
      await getCandidatesForChain(selectedChain);

    if (candidates.length === 0) {
      return NextResponse.json({
        chain: selectedChain,
        totalCandidates: 0,
        candidates: [],
      });
    }

    const rankedCandidates = [...candidates]
      .sort(
        (a, b) =>
          (b.candidateRank ?? 0) -
          (a.candidateRank ?? 0)
      )
      .slice(0, 10);

    const analyzed = await Promise.all(
      rankedCandidates.map(async (token) => {
        let topWhales: Awaited<
          ReturnType<typeof analyzeTopWhales>
        > = [];

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

        /*
         * ============================================================
         * MARKET SNAPSHOT
         * ============================================================
         */

        const marketSnapshot = {
          capturedAt:
            new Date().toISOString(),

          chain: token.chain,

          priceUsd:
            Number(token.priceUsd ?? 0),

          liquidityUsd:
            Number(token.liquidityUsd ?? 0),

          volume5mUsd:
            Number(token.volume5mUsd ?? 0),

          volume1hUsd:
            Number(token.volume1hUsd ?? 0),

          marketCapUsd:
            Number(token.marketCapUsd ?? 0),

          priceChange5mPct:
            Number(
              token.priceChange5mPct ?? 0
            ),

          priceChange1hPct:
            Number(
              token.priceChange1hPct ?? 0
            ),

          priceChange24hPct:
            Number(
              token.priceChange24hPct ?? 0
            ),

          buyCount5m:
            Number(token.buyCount5m ?? 0),

          sellCount5m:
            Number(token.sellCount5m ?? 0),

          top10HolderPct:
            Number(
              token.top10HolderPct ?? 0
            ),

          mintAuthority:
            token.mintAuthority === true,

          freezeAuthority:
            token.freezeAuthority === true,

          boostActive:
            token.boostActive === true,

          boostAmount:
            Number(
              token.boostAmount ?? 0
            ),

          whalePercentageOfSupply:
            Number(
              token.topHolders?.[0]
                ?.percentageOfSupply ?? 0
            ),

          largestWhaleAmount:
            Number(
              token.topHolders?.[0]?.amount ?? 0
            ),

          topHolderCount:
            token.topHolders?.length ?? 0,

          aiScore:
            Number(decision.score ?? 0),

          aiConfidence:
            Number(
              decision.confidence ?? 0
            ),

          aiDecision:
            decision.action,

          positionUsd:
            Number(
              decision.positionUsd ?? 0
            ),

          stopLossPct:
            Number(
              decision.stopLossPct ?? 0
            ),

          takeProfitPct:
            Number(
              decision.takeProfitPct ?? 0
            ),

          reasons:
            decision.reasons ?? [],
        };

        /*
         * ============================================================
         * AI DECISION LOG
         * ============================================================
         */

        let decisionLog: {
          id: number;
        } | null = null;

        try {
          const debateAgent =
            agents.find(
              (agent) =>
                agent.name ===
                "Agent Debate"
            );

          const debateData =
            debateAgent?.data ?? {};

          const debateDecision =
            typeof debateData.decision ===
            "string"
              ? debateData.decision
              : null;

          const debateScore =
            Number(
              debateAgent?.score ?? 0
            );

          const debateConfidence =
            Number(
              debateData.confidence ?? 0
            );

          const buyVotes =
            Number(
              debateData.buyVotes ?? 0
            );

          const holdVotes =
            Number(
              debateData.holdVotes ?? 0
            );

          const avoidVotes =
            Number(
              debateData.avoidVotes ?? 0
            );

          const {
            data: insertedDecisionLog,
            error: decisionLogError,
          } = await supabase
            .from("ai_decision_logs")
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

          if (decisionLogError) {
            console.error(
              "AI decision log save failed:",
              JSON.stringify(
                decisionLogError
              )
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
          console.error(
            "AI decision logging error:",
            error
          );
        }

        /*
         * ============================================================
         * AGENT ARENA
         * ============================================================
         */

        let agentDecisionIds: number[] = [];

        let agentArenaError:
          | string
          | null = null;

        try {
          /*
           * Convert Agent data into guaranteed
           * JSON-safe data before sending it
           * to Supabase JSONB.
           */

          const agentRows =
            agents.map((agent) => {
              let agentData: Record<
                string,
                unknown
              > = {};

              try {
                const rawData =
                  agent.data ?? {};

                agentData =
                  JSON.parse(
                    JSON.stringify(
                      rawData
                    )
                  );
              } catch (error) {
                console.error(
                  "Agent data JSON conversion failed:",
                  error
                );

                agentData = {};
              }

              let predictedAction:
                | string
                | null = null;

              /*
               * Agent Debate
               */

              if (
                agent.name ===
                "Agent Debate"
              ) {
                const debateDecision =
                  agentData.decision;

                if (
                  typeof debateDecision ===
                  "string"
                ) {
                  predictedAction =
                    debateDecision;
                }
              }

              /*
               * Final AI
               */

              else if (
                agent.name ===
                "Final AI"
              ) {
                const finalAction =
                  agentData.action;

                if (
                  typeof finalAction ===
                  "string"
                ) {
                  predictedAction =
                    finalAction;
                }
              }

              /*
               * Risk Veto
               */

              else if (
                agent.name ===
                "Risk Veto"
              ) {
                predictedAction =
                  agent.status ===
                  "VETO"
                    ? "VETO"
                    : "HOLD";
              }

              return {
                token:
                  token.address,

                symbol:
                  token.symbol,

                chain:
                  token.chain,

                agent_name:
                  agent.name,

                agent_status:
                  agent.status,

                agent_score:
                  Number(
                    agent.score ?? 0
                  ),

                predicted_action:
                  predictedAction,

                agent_data:
                  agentData,

                entry_price:
                  Number(
                    token.priceUsd ?? 0
                  ),

                paper_position_id:
                  null,

                paper_trade_id:
                  null,

                pnl_usd:
                  null,

                pnl_pct:
                  null,

                prediction_correct:
                  null,

                closed_at:
                  null,
              };
            });

          /*
           * Important:
           * Insert ALL agents generated
           * during this scan.
           */

          const {
            data: insertedAgentRows,
            error: agentInsertError,
          } = await supabase
            .from(
              "ai_agent_decisions"
            )
            .insert(agentRows)
            .select("id");

          if (agentInsertError) {
            const errorMessage =
              JSON.stringify(
                agentInsertError
              );

            agentArenaError =
              errorMessage;

            console.error(
              "Agent Arena decision save failed:",
              errorMessage
            );
          } else {
            agentDecisionIds =
              (
                insertedAgentRows ??
                []
              )
                .map((row) =>
                  Number(row.id)
                )
                .filter((id) =>
                  Number.isFinite(id)
                );

            console.log(
              "Agent Arena saved:",
              {
                token:
                  token.symbol,
                count:
                  agentDecisionIds.length,
                ids:
                  agentDecisionIds,
              }
            );
          }
        } catch (error) {
          agentArenaError =
            error instanceof Error
              ? error.message
              : String(error);

          console.error(
            "Agent Arena logging error:",
            error
          );
        }

        let paperTrade = null;

        /*
         * ============================================================
         * PAPER TRADING
         * ============================================================
         */

        if (
          decision.action ===
            "BUY" &&
          token.priceUsd > 0
        ) {
          const existingPosition =
            await getOpenPosition(
              token.address
            );

          const account =
            await getPaperAccount();

          /*
           * Fixed $10 paper position.
           */

          const paperPositionUsd =
            10;

          const scorePass =
            decision.score >= 70;

          const liquidityPass =
            (token.liquidityUsd ?? 0) >=
            10000;

          const holderPass =
            (token.top10HolderPct ??
              100) <= 60;

          const whalePass =
            (token.topHolders?.[0]
              ?.percentageOfSupply ??
              100) <= 30;

          const contractRiskPass =
            token.mintAuthority !==
              true &&
            token.freezeAuthority !==
              true;

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

              agentArenaCount:
                agentDecisionIds.length,

              agentArenaError,
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

            if (
              !contractRiskPass
            ) {
              failedChecks.push(
                "Contract risk detected"
              );
            }

            paperTrade = {
              action: "SKIP",

              reason:
                "Risk Gate rejected",

              failedChecks,

              agentArenaCount:
                agentDecisionIds.length,

              agentArenaError,
            };
          } else if (
            paperPositionUsd >
            account.balanceUsd
          ) {
            paperTrade = {
              action: "SKIP",

              reason:
                "Insufficient paper cash",

              agentArenaCount:
                agentDecisionIds.length,

              agentArenaError,
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
             * Save exact market conditions
             * at entry.
             */

            const positionWithSnapshot =
              {
                ...position,

                marketSnapshot,
              };

            const paperPositionId =
              await addPosition(
                positionWithSnapshot
              );

            /*
             * ========================================================
             * LINK AI DECISION LOG
             * ========================================================
             */

            if (
              decisionLog &&
              decisionLog.id
            ) {
              const {
                error: linkError,
              } = await supabase
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

              if (linkError) {
                console.error(
                  "AI decision to paper position link failed:",
                  linkError
                );
              }
            }

            /*
             * ========================================================
             * LINK AGENT ARENA
             * ========================================================
             */

            let agentPositionLinkError:
              | string
              | null = null;

            if (
              paperPositionId &&
              agentDecisionIds.length >
                0
            ) {
              const {
                error:
                  arenaLinkError,
              } = await supabase
                .from(
                  "ai_agent_decisions"
                )
                .update({
                  paper_position_id:
                    paperPositionId,

                  entry_price:
                    Number(
                      token.priceUsd ??
                        0
                    ),
                })
                .in(
                  "id",
                  agentDecisionIds
                );

              if (
                arenaLinkError
              ) {
                agentPositionLinkError =
                  JSON.stringify(
                    arenaLinkError
                  );

                console.error(
                  "Agent Arena to paper position link failed:",
                  agentPositionLinkError
                );
              }
            }

            paperTrade = {
              action: "BUY",

              position:
                positionWithSnapshot,

              paperPositionId,

              aiDecisionLogId:
                decisionLog?.id ??
                null,

              marketSnapshot,

              /*
               * Agent Arena debugging/
               * verification information.
               */

              agentArenaCount:
                agentDecisionIds.length,

              agentArenaIds:
                agentDecisionIds,

              agentArenaError,

              agentPositionLinkError,

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

          /*
           * Agent Arena status is also
           * returned even when no paper
           * trade was opened.
           */

          agentArena: {
            savedCount:
              agentDecisionIds.length,

            expectedCount:
              agents.length,

            ids:
              agentDecisionIds,

            error:
              agentArenaError,
          },

          candidateRank:
            token.candidateRank ?? 0,

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
      })
    );

    /*
     * ================================================================
     * FINAL AI SCORE SORTING
     * ================================================================
     */

    analyzed.sort(
      (a, b) =>
        b.score - a.score
    );

    /*
     * ================================================================
     * FINAL RANKING
     * ================================================================
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