import type {
  PaperPosition,
  PaperTradeResult,
} from "./engine";

import { supabase } from "../supabase";
import { getCurrentTokenPrice } from "../market";

export type MarketSnapshot = {
  capturedAt: string;

  chain: string;

  priceUsd: number;

  liquidityUsd: number;
  volume5mUsd: number;
  volume1hUsd: number;
  marketCapUsd: number;

  priceChange5mPct: number;
  priceChange1hPct: number;
  priceChange24hPct: number;

  buyCount5m: number;
  sellCount5m: number;

  top10HolderPct: number;

  mintAuthority: boolean;
  freezeAuthority: boolean;

  boostActive: boolean;
  boostAmount: number;

  whalePercentageOfSupply: number;
  largestWhaleAmount: number;
  topHolderCount: number;

  aiScore: number;
  aiConfidence: number;
  aiDecision: string;

  positionUsd: number;
  stopLossPct: number;
  takeProfitPct: number;

  reasons: string[];
};

export type StoredPaperPosition =
  PaperPosition & {
    marketSnapshot?: MarketSnapshot | null;
  };

export type PaperAccount = {
  balanceUsd: number;
  positions: StoredPaperPosition[];
  trades: PaperTradeResult[];
};

function toNumber(value: unknown): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

/*
 * ============================================================
 * AI FEATURE ENGINEERING
 * ============================================================
 *
 * Converts raw entry-time market data into numerical
 * features that can later be used by XGBoost / ML.
 *
 * IMPORTANT:
 * These features must only use information available
 * at the moment the paper position was opened.
 *
 * Exit price / P&L / result are NOT used as input features.
 */
function buildTrainingFeatures(
  snapshot: MarketSnapshot
) {
  const buyCount =
    toNumber(snapshot.buyCount5m);

  const sellCount =
    toNumber(snapshot.sellCount5m);

  const totalTrades =
    buyCount + sellCount;

  /*
   * Buy pressure:
   * 0 = all sells
   * 1 = all buys
   */
  const buyPressure =
    totalTrades > 0
      ? buyCount / totalTrades
      : 0;

  /*
   * Sell pressure:
   * 0 = all buys
   * 1 = all sells
   */
  const sellPressure =
    totalTrades > 0
      ? sellCount / totalTrades
      : 0;

  /*
   * Compare 5-minute volume with the
   * average 5-minute volume implied by
   * the previous 1-hour volume.
   */
  const volumeAcceleration =
    snapshot.volume1hUsd > 0
      ? snapshot.volume5mUsd /
        (snapshot.volume1hUsd / 12)
      : 0;

  /*
   * Liquidity relative to market cap.
   */
  const liquidityToMarketCap =
    snapshot.marketCapUsd > 0
      ? snapshot.liquidityUsd /
        snapshot.marketCapUsd
      : 0;

  /*
   * Whale concentration risk.
   *
   * 0 = low
   * 1 = very high
   */
  const whaleRisk =
    Math.min(
      Math.max(
        snapshot.whalePercentageOfSupply / 100,
        0
      ),
      1
    );

  /*
   * Top-10 holder concentration risk.
   */
  const holderConcentrationRisk =
    Math.min(
      Math.max(
        snapshot.top10HolderPct / 100,
        0
      ),
      1
    );

  /*
   * Weighted momentum indicator.
   *
   * Short-term movement gets lower weight
   * than 1-hour movement.
   */
  const momentumScore =
    snapshot.priceChange5mPct * 0.25 +
    snapshot.priceChange1hPct * 0.5 +
    snapshot.priceChange24hPct * 0.25;

  /*
   * AI confidence adjusted by AI score.
   */
  const aiConfidenceScore =
    snapshot.aiScore *
    snapshot.aiConfidence;

  return {
    /*
     * Feature version allows us to change
     * the feature formula later without
     * losing track of which version was used.
     */
    featureVersion: 1,

    priceUsd:
      snapshot.priceUsd,

    liquidityUsd:
      snapshot.liquidityUsd,

    volume5mUsd:
      snapshot.volume5mUsd,

    volume1hUsd:
      snapshot.volume1hUsd,

    marketCapUsd:
      snapshot.marketCapUsd,

    priceChange5mPct:
      snapshot.priceChange5mPct,

    priceChange1hPct:
      snapshot.priceChange1hPct,

    priceChange24hPct:
      snapshot.priceChange24hPct,

    buyCount5m:
      buyCount,

    sellCount5m:
      sellCount,

    buyPressure,

    sellPressure,

    volumeAcceleration,

    liquidityToMarketCap,

    top10HolderPct:
      snapshot.top10HolderPct,

    whalePercentageOfSupply:
      snapshot.whalePercentageOfSupply,

    whaleRisk,

    holderConcentrationRisk,

    largestWhaleAmount:
      snapshot.largestWhaleAmount,

    topHolderCount:
      snapshot.topHolderCount,

    /*
     * Boolean values are converted to
     * numerical values for ML.
     */
    mintAuthority:
      snapshot.mintAuthority
        ? 1
        : 0,

    freezeAuthority:
      snapshot.freezeAuthority
        ? 1
        : 0,

    boostActive:
      snapshot.boostActive
        ? 1
        : 0,

    boostAmount:
      snapshot.boostAmount,

    aiScore:
      snapshot.aiScore,

    aiConfidence:
      snapshot.aiConfidence,

    aiConfidenceScore,

    momentumScore,
  };
}

function mapPosition(
  row: any
): StoredPaperPosition {
  return {
    token: row.token,
    symbol: row.symbol,
    chain: row.chain,

    entryPrice: toNumber(
      row.entry_price
    ),

    quantity: toNumber(
      row.quantity
    ),

    investedUsd: toNumber(
      row.invested_usd
    ),

    openedAt: row.opened_at,

    marketSnapshot:
      row.market_snapshot ??
      null,
  };
}

function mapTrade(
  row: any
): PaperTradeResult {
  return {
    token: row.token,
    symbol: row.symbol,
    chain: row.chain,

    entryPrice: toNumber(
      row.entry_price
    ),

    exitPrice: toNumber(
      row.exit_price
    ),

    quantity: toNumber(
      row.quantity
    ),

    investedUsd: toNumber(
      row.invested_usd
    ),

    exitValueUsd: toNumber(
      row.exit_value_usd
    ),

    pnlUsd: toNumber(
      row.pnl_usd
    ),

    pnlPct: toNumber(
      row.pnl_pct
    ),

    reason: row.reason,

    openedAt: row.opened_at,

    closedAt: row.closed_at,
  };
}

export async function getPaperAccount(): Promise<PaperAccount> {
  const {
    data: account,
    error: accountError,
  } = await supabase
    .from("paper_account")
    .select("*")
    .order("id", {
      ascending: true,
    })
    .limit(1)
    .single();

  if (accountError) {
    throw new Error(
      accountError.message
    );
  }

  const {
    data: positions,
    error: positionsError,
  } = await supabase
    .from("paper_positions")
    .select("*")
    .order("opened_at", {
      ascending: true,
    });

  if (positionsError) {
    throw new Error(
      positionsError.message
    );
  }

  const {
    data: trades,
    error: tradesError,
  } = await supabase
    .from("paper_trades")
    .select("*")
    .order("closed_at", {
      ascending: true,
    });

  if (tradesError) {
    throw new Error(
      tradesError.message
    );
  }

  return {
    balanceUsd: toNumber(
      account.balance_usd
    ),

    positions:
      (positions ?? []).map(
        mapPosition
      ),

    trades:
      (trades ?? []).map(
        mapTrade
      ),
  };
}

export async function addPosition(
  position: StoredPaperPosition
): Promise<number> {
  const account =
    await getPaperAccount();

  if (
    position.investedUsd >
    account.balanceUsd
  ) {
    throw new Error(
      "Insufficient paper balance."
    );
  }

  const {
    data: insertedPosition,
    error: positionError,
  } = await supabase
    .from("paper_positions")
    .insert({
      token: position.token,

      symbol: position.symbol,

      chain: position.chain,

      entry_price:
        position.entryPrice,

      quantity:
        position.quantity,

      invested_usd:
        position.investedUsd,

      opened_at:
        position.openedAt,

      market_snapshot:
        position.marketSnapshot ??
        null,
    })
    .select("id")
    .single();

  if (positionError) {
    throw new Error(
      positionError.message
    );
  }

  const newBalance =
    account.balanceUsd -
    position.investedUsd;

  const {
    error: balanceError,
  } = await supabase
    .from("paper_account")
    .update({
      balance_usd:
        newBalance,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", 1);

  if (balanceError) {
    throw new Error(
      balanceError.message
    );
  }

  return Number(
    insertedPosition.id
  );
}

export async function closePosition(
  trade: PaperTradeResult
): Promise<number> {
  const {
    data: positions,
    error,
  } = await supabase
    .from("paper_positions")
    .select("*")
    .eq("token", trade.token);

  if (error) {
    throw new Error(
      error.message
    );
  }

  const position =
    (positions ?? []).find(
      (item) =>
        item.opened_at ===
        trade.openedAt
    );

  if (!position) {
    throw new Error(
      "Paper position not found."
    );
  }

  /*
   * Preserve original entry-time
   * market conditions.
   */
  const marketSnapshot =
    position.market_snapshot ??
    null;

  /*
   * Remove the open position.
   */
  const {
    error: deleteError,
  } = await supabase
    .from("paper_positions")
    .delete()
    .eq("id", position.id);

  if (deleteError) {
    throw new Error(
      deleteError.message
    );
  }

  /*
   * Save completed paper trade.
   */
  const {
    data: insertedTrade,
    error: tradeError,
  } = await supabase
    .from("paper_trades")
    .insert({
      token: trade.token,

      symbol: trade.symbol,

      chain: trade.chain,

      entry_price:
        trade.entryPrice,

      exit_price:
        trade.exitPrice,

      quantity:
        trade.quantity,

      invested_usd:
        trade.investedUsd,

      exit_value_usd:
        trade.exitValueUsd,

      pnl_usd:
        trade.pnlUsd,

      pnl_pct:
        trade.pnlPct,

      reason:
        trade.reason ??
        null,

      opened_at:
        trade.openedAt,

      closed_at:
        trade.closedAt,
    })
    .select("id")
    .single();

  if (tradeError) {
    throw new Error(
      tradeError.message
    );
  }

  /*
   * Determine training label.
   */
  const resultLabel =
    trade.pnlPct > 0
      ? "WIN"
      : trade.pnlPct < 0
        ? "LOSS"
        : "NEUTRAL";

  const entryTime =
    new Date(
      trade.openedAt
    ).getTime();

  const exitTime =
    new Date(
      trade.closedAt
    ).getTime();

  const holdingTimeMinutes =
    Number.isFinite(entryTime) &&
    Number.isFinite(exitTime) &&
    exitTime >= entryTime
      ? (
          exitTime -
          entryTime
        ) / 60000
      : 0;

  /*
   * ============================================================
   * AI TRAINING SNAPSHOT
   * ============================================================
   *
   * Raw entry conditions +
   * actual outcome.
   */
  const trainingSnapshot =
    marketSnapshot
      ? {
          ...marketSnapshot,

          positionUsd:
            trade.investedUsd,

          aiSuggestedPositionUsd:
            marketSnapshot.positionUsd ??
            null,

          exitPrice:
            trade.exitPrice,

          exitValueUsd:
            trade.exitValueUsd,

          pnlUsd:
            trade.pnlUsd,

          pnlPct:
            trade.pnlPct,

          resultLabel,

          holdingTimeMinutes,

          entryToExitChangePct:
            trade.entryPrice > 0
              ? (
                  (
                    trade.exitPrice -
                    trade.entryPrice
                  ) /
                  trade.entryPrice
                ) *
                100
              : 0,

          outcomeCapturedAt:
            trade.closedAt,
        }
      : null;

  /*
   * ============================================================
   * AI FEATURES
   * ============================================================
   *
   * IMPORTANT:
   * Only entry-time information is used.
   *
   * No exit price.
   * No P&L.
   * No result label.
   *
   * This prevents data leakage.
   */
  const trainingFeatures =
    marketSnapshot
      ? buildTrainingFeatures(
          marketSnapshot
        )
      : null;

  /*
   * Save AI training sample.
   */
  const {
    error: trainingError,
  } = await supabase
    .from("ai_training_data")
    .insert({
      token: trade.token,

      symbol: trade.symbol,

      chain: trade.chain,

      entry_price:
        trade.entryPrice,

      exit_price:
        trade.exitPrice,

      quantity:
        trade.quantity,

      invested_usd:
        trade.investedUsd,

      exit_value_usd:
        trade.exitValueUsd,

      pnl_usd:
        trade.pnlUsd,

      pnl_pct:
        trade.pnlPct,

      result_label:
        resultLabel,

      opened_at:
        trade.openedAt,

      closed_at:
        trade.closedAt,

      /*
       * Original entry conditions
       * + actual outcome.
       */
      market_snapshot:
        trainingSnapshot,

      /*
       * Machine-learning features.
       */
      features:
        trainingFeatures,
    });

  if (trainingError) {
    throw new Error(
      `AI training data save failed: ${trainingError.message}`
    );
  }

  /*
   * Return trade value to
   * paper account.
   */
  const {
    data: account,
    error: accountError,
  } = await supabase
    .from("paper_account")
    .select("balance_usd")
    .eq("id", 1)
    .single();

  if (accountError) {
    throw new Error(
      accountError.message
    );
  }

  const {
    error: balanceError,
  } = await supabase
    .from("paper_account")
    .update({
      balance_usd:
        toNumber(
          account.balance_usd
        ) +
        trade.exitValueUsd,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", 1);

  if (balanceError) {
    throw new Error(
      balanceError.message
    );
  }

  return Number(
    insertedTrade.id
  );
}

export async function getOpenPosition(
  token: string
): Promise<
  StoredPaperPosition | undefined
> {
  const {
    data,
    error,
  } = await supabase
    .from("paper_positions")
    .select("*")
    .eq("token", token)
    .order("opened_at", {
      ascending: true,
    })
    .limit(1);

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (
    !data ||
    data.length === 0
  ) {
    return undefined;
  }

  return mapPosition(
    data[0]
  );
}

export type LivePaperPosition =
  StoredPaperPosition & {
    currentPrice: number;
    currentValueUsd: number;
    unrealizedPnlUsd: number;
    unrealizedPnlPct: number;
  };

export async function getLivePaperPositions(): Promise<
  LivePaperPosition[]
> {
  const account =
    await getPaperAccount();

  const livePositions =
    await Promise.all(
      account.positions.map(
        async (position) => {
          const currentPrice =
            await getCurrentTokenPrice(
              position.chain,
              position.token
            );

          if (
            !Number.isFinite(
              currentPrice
            ) ||
            currentPrice <= 0
          ) {
            return {
              ...position,

              currentPrice:
                position.entryPrice,

              currentValueUsd:
                position.investedUsd,

              unrealizedPnlUsd: 0,

              unrealizedPnlPct: 0,
            };
          }

          const currentValueUsd =
            position.quantity *
            currentPrice;

          const unrealizedPnlUsd =
            currentValueUsd -
            position.investedUsd;

          const unrealizedPnlPct =
            position.investedUsd >
            0
              ? (
                  unrealizedPnlUsd /
                  position.investedUsd
                ) *
                100
              : 0;

          return {
            ...position,

            currentPrice,

            currentValueUsd,

            unrealizedPnlUsd,

            unrealizedPnlPct,
          };
        }
      )
    );

  return livePositions;
}