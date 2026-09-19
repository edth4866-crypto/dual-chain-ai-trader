export type PaperPosition = {
  token: string;
  symbol: string;
  chain: "solana" | "bsc" | "robinhood";
  entryPrice: number;
  quantity: number;
  investedUsd: number;
  buyFeeUsd: number;
  openedAt: string;
};

export type PaperTradeResult = {
  token: string;
  symbol: string;
  chain: "solana" | "bsc" | "robinhood";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  investedUsd: number;
  exitValueUsd: number;
  pnlUsd: number;
  pnlPct: number;
  buyFeeUsd: number;
  sellFeeUsd: number;
  totalFeeUsd: number;
  reason?: "TAKE_PROFIT" | "STOP_LOSS";
  openedAt: string;
  closedAt: string;
};

const PAPER_SLIPPAGE_PCT = 3.0;
const PAPER_TRADING_FEE_PCT = 0.3;

export function openPaperPosition(
  token: string,
  symbol: string,
  chain: "solana" | "bsc" | "robinhood",
  priceUsd: number,
  positionUsd: number
): PaperPosition {
  if (priceUsd <= 0) {
    throw new Error("Invalid entry price");
  }

  if (positionUsd <= 0) {
    throw new Error("Invalid position size");
  }

  /*
   * positionUsd is the TOTAL cash committed.
   * BUY fee is deducted first, then the remaining
   * cash buys tokens at the slippage-adjusted price.
   */
  const buyFeeUsd =
    positionUsd *
    (PAPER_TRADING_FEE_PCT / 100);

  const buyValueUsd =
    positionUsd - buyFeeUsd;

  const executedEntryPrice =
    priceUsd *
    (1 + PAPER_SLIPPAGE_PCT / 100);

  return {
    token,
    symbol,
    chain,
    entryPrice: executedEntryPrice,
    quantity:
      buyValueUsd / executedEntryPrice,
    investedUsd: positionUsd,
    buyFeeUsd,
    openedAt: new Date().toISOString(),
  };
}

export function closePaperPosition(
  position: PaperPosition,
  exitPrice: number,
  reason?: "TAKE_PROFIT" | "STOP_LOSS"
): PaperTradeResult {
  if (exitPrice <= 0) {
    throw new Error("Invalid exit price");
  }

  /*
   * SELL slippage is applied first.
   * SELL fee is then deducted from gross proceeds.
   */
  const executedExitPrice =
    exitPrice *
    (1 - PAPER_SLIPPAGE_PCT / 100);

  const grossExitValueUsd =
    position.quantity *
    executedExitPrice;

  const sellFeeUsd =
    grossExitValueUsd *
    (PAPER_TRADING_FEE_PCT / 100);

  const exitValueUsd =
    grossExitValueUsd - sellFeeUsd;

  const totalFeeUsd =
    position.buyFeeUsd + sellFeeUsd;

  const pnlUsd =
    exitValueUsd - position.investedUsd;

  const pnlPct =
    (pnlUsd / position.investedUsd) * 100;

  return {
    token: position.token,
    symbol: position.symbol,
    chain: position.chain,
    entryPrice: position.entryPrice,
    exitPrice: executedExitPrice,
    quantity: position.quantity,
    investedUsd: position.investedUsd,
    exitValueUsd,
    pnlUsd,
    pnlPct,
    buyFeeUsd: position.buyFeeUsd,
    sellFeeUsd,
    totalFeeUsd,
    reason,
    openedAt: position.openedAt,
    closedAt: new Date().toISOString(),
  };
}

export type PaperExitReason =
  | "TAKE_PROFIT"
  | "STOP_LOSS";

export function checkPaperExit(
  position: PaperPosition,
  currentPrice: number,
  stopLossPct: number,
  takeProfitPct: number
): PaperExitReason | null {
  if (currentPrice <= 0) {
    return null;
  }

  /*
   * Evaluate TP / SL using the expected SELL fill price,
   * not the raw market price.
   *
   * This keeps the exit target aligned with the actual
   * paper-trade P&L after SELL slippage.
   */
  const expectedExitPrice =
    currentPrice *
    (1 - PAPER_SLIPPAGE_PCT / 100);

  const expectedGrossExitValueUsd =
    position.quantity *
    expectedExitPrice;

  const expectedSellFeeUsd =
    expectedGrossExitValueUsd *
    (PAPER_TRADING_FEE_PCT / 100);

  const expectedExitValueUsd =
    expectedGrossExitValueUsd -
    expectedSellFeeUsd;

  const expectedPnlPct =
    position.investedUsd > 0
      ? (
          (
            expectedExitValueUsd -
            position.investedUsd
          ) /
          position.investedUsd
        ) * 100
      : 0;

  const epsilon = 1e-10;

  if (
    expectedPnlPct >=
    takeProfitPct - epsilon
  ) {
    return "TAKE_PROFIT";
  }

  if (
    expectedPnlPct <=
    -stopLossPct + epsilon
  ) {
    return "STOP_LOSS";
  }

  return null;
}