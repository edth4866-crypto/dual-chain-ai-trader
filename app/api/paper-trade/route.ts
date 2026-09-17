import { NextResponse } from "next/server";
import { approvePaperTrade } from "../../../lib/risk";

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}));
  const cfg = {
    maxTradeUsd: Number(process.env.MAX_TRADE_USD || 25),
    dailyLossLimitUsd: Number(process.env.DAILY_LOSS_LIMIT_USD || 50),
    maxSlippageBps: Number(process.env.MAX_SLIPPAGE_BPS || 300)
  };
  const result = approvePaperTrade(
    Number(body.amountUsd || 0),
    Number(body.expectedSlippageBps || 0),
    Number(body.currentDailyPnlUsd || 0),
    cfg
  );
  return NextResponse.json({mode:"PAPER", ...result});
}