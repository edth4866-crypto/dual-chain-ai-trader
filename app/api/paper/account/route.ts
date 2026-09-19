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

    /*
     * ============================================================
     * CURRENT PORTFOLIO EQUITY
     * ============================================================
     *
     * Cash balance
     * +
     * Current market value of open positions
     */
    const portfolioValue =
      account.balanceUsd +
      livePositionValue;

    /*
     * Existing trading P&L
     *
     * This remains separate from equity return because the
     * account may contain deposits / adjustments that are not
     * represented by paper trade P&L.
     */
    const totalPnl =
      realizedPnl +
      unrealizedPnl;

    /*
     * ============================================================
     * SEED CAPITAL RETURN
     * ============================================================
     *
     * Seed capital is the fixed starting capital stored in
     * paper_account.seed_capital_usd.
     */
    const seedCapitalUsd =
      account.seedCapitalUsd;

    const equityReturn =
      portfolioValue -
      seedCapitalUsd;

    const equityReturnPct =
      seedCapitalUsd > 0
        ? (equityReturn / seedCapitalUsd) * 100
        : 0;

    return NextResponse.json({
      success: true,

      account: {
        ...account,

        positions: livePositions,

        /*
         * Portfolio
         */
        portfolioValue,

        livePositionValue,

        /*
         * Trading P&L
         */
        realizedPnl,

        unrealizedPnl,

        totalPnl,

        /*
         * Seed / equity performance
         */
        seedCapitalUsd,

        equityReturn,

        equityReturnPct,
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