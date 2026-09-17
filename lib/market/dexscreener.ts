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

  info?: {
    imageUrl?: string;
    header?: string;

    websites?: {
      label?: string;
      url?: string;
    }[];

    socials?: {
      type?: string;
      url?: string;
    }[];
  };

  boosts?: {
    active?: number;
  };
};

export type TokenProfile = {
  url?: string;

  chainId?: string;

  tokenAddress?: string;

  icon?: string;

  header?: string;

  openGraph?: string;

  description?: string;

  links?: {
    label?: string;
    type?: string;
    url?: string;
  }[];

  cto?: boolean;
};

export type TokenBoost = {
  url?: string;

  chainId?: string;

  tokenAddress?: string;

  description?: string;

  icon?: string;

  header?: string;

  openGraph?: string;

  links?: {
    url?: string;
    type?: string;
  }[];

  totalAmount?: number;

  amount?: number;
};

const DEXSCREENER_API =
  "https://api.dexscreener.com";

export async function searchToken(
  query: string
): Promise<MarketPair[]> {
  const response = await fetch(
    `${DEXSCREENER_API}/latest/dex/search?q=${encodeURIComponent(
      query
    )}`,
    {
      headers: {
        Accept: "application/json",
      },

      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `DexScreener request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  return Array.isArray(data.pairs)
    ? data.pairs
    : [];
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
    throw new Error(
      `DexScreener request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  return Array.isArray(data)
    ? data
    : [];
}

export async function getLatestTokenProfiles(): Promise<
  TokenProfile[]
> {
  const response = await fetch(
    `${DEXSCREENER_API}/token-profiles/latest/v1`,
    {
      headers: {
        Accept: "application/json",
      },

      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `DexScreener profiles request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  return Array.isArray(data)
    ? data
    : [];
}

export async function getLatestTokenBoosts(): Promise<
  TokenBoost[]
> {
  const response = await fetch(
    `${DEXSCREENER_API}/token-boosts/latest/v1`,
    {
      headers: {
        Accept: "application/json",
      },

      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `DexScreener boosts request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  return Array.isArray(data)
    ? data
    : [];
}