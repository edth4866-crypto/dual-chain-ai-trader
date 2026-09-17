export type Chain = "solana" | "robinhood";

export type TokenCandidate = {
  address: string;
  symbol: string;
  name: string;
  chain: Chain;
  priceUsd: number;
  liquidityUsd: number;
  volume5mUsd: number;
  volume1hUsd: number;
  marketCapUsd: number;
  holders?: number;
  buyCount5m?: number;
  sellCount5m?: number;
  top10HolderPct?: number;
  devWalletPct?: number;
  mintAuthority?: boolean;
  freezeAuthority?: boolean;
};

export type AgentResult = {
  name: string;
  status: "PASS" | "WARN" | "VETO";
  score: number;
  note: string;
  data: Record<string, unknown>;
};

export type FinalDecision = {
  action: "BUY" | "SELL" | "HOLD" | "VETO";
  score: number;
  confidence: number;
  positionUsd: number;
  stopLossPct: number;
  takeProfitPct: number;
  reasons: string[];
};