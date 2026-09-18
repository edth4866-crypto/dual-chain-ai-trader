import { NextResponse } from "next/server";
import {
  getPaperAccount,
  getLivePaperPositions,
} from "../../../../lib/paper/store";

export async function GET() {
  try {
    const account = await getPaperAccount();

    const livePositions =
      await getLivePaperPositions();

    const livePositionValue =
      livePositions.reduce(
        (sum, position) =>
          sum + position.currentValueUsd,
        0
      );

    const unrealizedPnl =
      livePositions.reduce(
        (sum, position) =>
          sum + position.unrealizedPnlUsd,
        0
      );

    const realizedPnl =
      account.trades.reduce(
        (sum, trade) =>
          sum + Number(trade.pnlUsd || 0),
        0
      );

    const portfolioValue =
      account.balanceUsd +
      livePositionValue;

    const totalPnl =
      realizedPnl +
      unrealizedPnl;

    return NextResponse.json({
      success: true,

      account: {
        ...account,

        positions: livePositions,

        portfolioValue,

        livePositionValue,

        realizedPnl,

        unrealizedPnl,

        totalPnl,
      },
    });
  } catch (error) {
    console.error(
      "PAPER ACCOUNT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load paper account.",

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