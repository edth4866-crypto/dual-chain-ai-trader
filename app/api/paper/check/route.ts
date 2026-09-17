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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const manualPrices = body.prices ?? {};

    const account = getPaperAccount();
    const closedTrades = [];
    const checkedPositions = [];

    for (const position of account.positions) {
      let currentPrice = Number(
        manualPrices[position.token]
      );

      if (
        !Number.isFinite(currentPrice) ||
        currentPrice <= 0
      ) {
        currentPrice =
          await getCurrentTokenPrice(
            position.chain,
            position.token
          );
      }

      if (
        !Number.isFinite(currentPrice) ||
        currentPrice <= 0
      ) {
        continue;
      }

      checkedPositions.push({
        token: position.token,
        symbol: position.symbol,
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

      const trade = closePaperPosition(
        position,
        currentPrice
      );

      closePosition(trade);

      closedTrades.push({
        ...trade,
        reason,
      });
    }

    return NextResponse.json({
      success: true,
      checkedPositions,
      closedTrades,
      account: getPaperAccount(),
    });
  } catch (error) {
    console.error("PAPER CHECK ERROR:", error);

    return NextResponse.json(
      {
        error: "Paper exit check failed.",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
