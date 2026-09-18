import { NextResponse } from "next/server";
import {
  checkPaperExit,
  closePaperPosition,
} from "../../../../lib/paper/engine";
import {
  closePosition,
  getPaperAccount,
} from "../../../../lib/paper/store";
import { getCurrentTokenPrice } from "../../../../lib/market";
import { supabase } from "../../../../lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const key = url.searchParams.get("key");

  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const account = await getPaperAccount();

    const checkedPositions = [];
    const closedTrades = [];

    for (const position of account.positions) {
      const currentPrice =
        await getCurrentTokenPrice(
          position.chain,
          position.token
        );

      if (
        !Number.isFinite(currentPrice) ||
        currentPrice <= 0
      ) {
        continue;
      }

      checkedPositions.push({
        token: position.token,
        symbol: position.symbol,
        chain: position.chain,
        currentPrice,
      });

      const reason = checkPaperExit(
        position,
        currentPrice,
        10,
        20
      );

      if (!reason) {
        continue;
      }

      /*
       * Find the exact paper position ID BEFORE
       * closePosition() deletes the position.
       */
      const {
        data: paperPositionRow,
        error: paperPositionLookupError,
      } = await supabase
        .from("paper_positions")
        .select("id")
        .eq("token", position.token)
        .eq("opened_at", position.openedAt)
        .limit(1)
        .maybeSingle();

      if (paperPositionLookupError) {
        console.error(
          "Paper position lookup failed:",
          paperPositionLookupError
        );
      }

      const paperPositionId =
        paperPositionRow?.id
          ? Number(paperPositionRow.id)
          : null;

      /*
       * IMPORTANT:
       * Pass the actual TP/SL reason into the trade.
       */
      const trade = closePaperPosition(
        position,
        currentPrice,
        reason
      );

      /*
       * Wait until the paper trade and AI
       * training data have actually been saved.
       *
       * closePosition() now returns paper_trades.id.
       */
      const paperTradeId =
        await closePosition(trade);

      /*
       * Connect the closed paper trade back
       * to the exact AI decision that opened it.
       */
      if (paperPositionId) {
        const outcome =
          trade.pnlPct > 0
            ? "WIN"
            : trade.pnlPct < 0
              ? "LOSS"
              : "NEUTRAL";

        const {
          error: decisionUpdateError,
        } = await supabase
          .from("ai_decision_logs")
          .update({
            paper_trade_id:
              paperTradeId,

            outcome,

            outcome_pnl_usd:
              trade.pnlUsd,

            outcome_pnl_pct:
              trade.pnlPct,

            outcome_at:
              trade.closedAt,
          })
          .eq(
            "paper_position_id",
            paperPositionId
          );

        if (decisionUpdateError) {
          console.error(
            "AI decision outcome update failed:",
            decisionUpdateError
          );
        }
      } else {
        console.error(
          "AI decision outcome link skipped: paper position ID not found.",
          {
            token: position.token,
            openedAt: position.openedAt,
          }
        );
      }

      closedTrades.push({
        ...trade,

        reason,

        paperPositionId,

        paperTradeId,
      });
    }

    const updatedAccount =
      await getPaperAccount();

    return NextResponse.json({
      success: true,

      checkedPositions,

      closedTrades,

      account:
        updatedAccount,
    });
  } catch (error) {
    console.error(
      "PAPER CRON ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Paper cron failed.",

        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}