export type PaperPosition = {
  token: string;
  symbol: string;
  chain: "solana" | "bsc" | "robinhood";
  entryPrice: number;
  quantity: number;
  investedUsd: number;
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
  reason?: "TAKE_PROFIT" | "STOP_LOSS";
  openedAt: string;
  closedAt: string;
};

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

  return {
    token,
    symbol,
    chain,
    entryPrice: priceUsd,
    quantity: positionUsd / priceUsd,
    investedUsd: positionUsd,
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

  const exitValueUsd =
    position.quantity * exitPrice;

  const pnlUsd =
    exitValueUsd - position.investedUsd;

  const pnlPct =
    (pnlUsd / position.investedUsd) * 100;

  return {
    token: position.token,
    symbol: position.symbol,
    chain: position.chain,
    entryPrice: position.entryPrice,
    exitPrice,
    quantity: position.quantity,
    investedUsd: position.investedUsd,
    exitValueUsd,
    pnlUsd,
    pnlPct,
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

  const takeProfitPrice =
    position.entryPrice *
    (1 + takeProfitPct / 100);

  const stopLossPrice =
    position.entryPrice *
    (1 - stopLossPct / 100);

  const epsilon = 1e-10;

  if (
    currentPrice >=
    takeProfitPrice - epsilon
  ) {
    return "TAKE_PROFIT";
  }

  if (
    currentPrice <=
    stopLossPrice + epsilon
  ) {
    return "STOP_LOSS";
  }

  return null;
}