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
    const account = getPaperAccount();

    const checkedPositions = [];
    const closedTrades = [];

    for (const position of account.positions) {
      const currentPrice = await getCurrentTokenPrice(
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
    console.error("PAPER CRON ERROR:", error);

    return NextResponse.json(
      {
        error: "Paper cron failed.",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}