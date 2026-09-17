export type RiskConfig = {
  maxTradeUsd:number;
  dailyLossLimitUsd:number;
  maxSlippageBps:number;
};

export function approvePaperTrade(
  requestedUsd:number,
  expectedSlippageBps:number,
  currentDailyPnlUsd:number,
  cfg:RiskConfig
) {
  if (requestedUsd > cfg.maxTradeUsd) return {ok:false,reason:"Position exceeds MAX_TRADE_USD"};
  if (currentDailyPnlUsd <= -cfg.dailyLossLimitUsd) return {ok:false,reason:"Daily loss limit reached"};
  if (expectedSlippageBps > cfg.maxSlippageBps) return {ok:false,reason:"Expected slippage exceeds limit"};
  return {ok:true,reason:"Risk checks passed"};
}