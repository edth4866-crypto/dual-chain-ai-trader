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
import { evaluatePaperTradeForAgents, refreshAgentPerformance } from "../../../../lib/agents/performance";
import { supabase } from "../../../../lib/supabase";

const CRON_SECRET = process.env.CRON_SECRET;

async function runPaperMonitor() {
  const account = await getPaperAccount();

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

    const {
      data: positionRow,
      error: positionLookupError,
    } = await supabase
      .from("paper_positions")
      .select("id")
      .eq("token", trade.token)
      .eq("opened_at", trade.openedAt)
      .single();

    if (positionLookupError || !positionRow) {
      throw new Error(
        positionLookupError?.message ??
          "Paper position ID not found."
      );
    }

    const paperPositionId = Number(
      positionRow.id
    );

    const paperTradeId =
      await closePosition(trade);

    let agentPerformance = null;

    try {
      agentPerformance =
        await evaluatePaperTradeForAgents(
          paperPositionId,
          paperTradeId,
          trade.entryPrice,
          trade.exitPrice,
          trade.pnlUsd,
          trade.pnlPct,
          trade.closedAt
        );
    } catch (error) {
      console.error(
        "Agent performance evaluation failed:",
        error
      );
    }

    try {
      await refreshAgentPerformance();
    } catch (error) {
      console.error(
        "Agent performance refresh failed:",
        error
      );
    }

    closedTrades.push({
      ...trade,
      reason,
      agentPerformance,
    });
  }

  return {
    success: true,
    checkedPositions,
    closedTrades,
    account: await getPaperAccount(),
  };
}

function isAuthorized(request: Request): boolean {
  if (!CRON_SECRET) {
    return false;
  }

  const authorization = request.headers.get(
    "authorization"
  );

  return authorization === `Bearer ${CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    return NextResponse.json(
      await runPaperMonitor()
    );
  } catch (error) {
    console.error(
      "PAPER MONITOR GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Paper monitor failed.",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    return NextResponse.json(
      await runPaperMonitor()
    );
  } catch (error) {
    console.error(
      "PAPER MONITOR POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Paper monitor failed.",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}