export type MarketPair = {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    symbol: string;
    name: string;
  };
  priceUsd?: string;
  priceChange?: {
    m5?: number;
    h1?: number;
    h24?: number;
  };
  liquidity?: {
    usd?: number;
  };
  volume?: {
    m5?: number;
    h1?: number;
  };
  marketCap?: number;
  fdv?: number;
  txns?: {
    m5?: {
      buys?: number;
      sells?: number;
    };
  };
};

const DEXSCREENER_API = "https://api.dexscreener.com";

export async function searchToken(query: string): Promise<MarketPair[]> {
  const response = await fetch(
    `${DEXSCREENER_API}/latest/dex/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`DexScreener request failed: ${response.status}`);
  }

  const data = await response.json();

  return Array.isArray(data.pairs) ? data.pairs : [];
}

export async function getTokenPairs(
  chainId: string,
  tokenAddress: string
): Promise<MarketPair[]> {
  const response = await fetch(
    `${DEXSCREENER_API}/token-pairs/v1/${chainId}/${tokenAddress}`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`DexScreener request failed: ${response.status}`);
  }

  const data = await response.json();

  return Array.isArray(data) ? data : [];
}