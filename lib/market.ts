import { Chain, TokenCandidate } from "./types";

import {
  getTokenPairs,
  getLatestTokenProfiles,
  getLatestTokenBoosts,
  TokenBoost,
} from "./market/dexscreener";

import { getSolanaMintInfo } from "./chain/solana";

type TokenProfile = {
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

/* =========================
   Best Pair
========================= */

function selectBestPair(
  pairs: any[]
): any | null {
  if (
    !Array.isArray(pairs) ||
    pairs.length === 0
  ) {
    return null;
  }

  const validPairs =
    pairs.filter(
      (pair) =>
        pair?.chainId ===
          "solana" &&
        pair?.baseToken?.address
    );

  if (
    validPairs.length === 0
  ) {
    return null;
  }

  return validPairs.sort(
    (a, b) =>
      Number(
        b?.liquidity?.usd ||
          0
      ) -
      Number(
        a?.liquidity?.usd ||
          0
      )
  )[0];
}

/* =========================
   Boost Lookup
========================= */

function findTokenBoost(
  boosts: TokenBoost[],
  tokenAddress: string
): TokenBoost | null {
  const normalized =
    tokenAddress.toLowerCase();

  const match =
    boosts.find(
      (boost) =>
        boost.chainId ===
          "solana" &&
        boost.tokenAddress
          ?.toLowerCase() ===
          normalized
    );

  return match || null;
}

/* =========================
   Convert Pair → Candidate
========================= */

function toCandidate(
  pair: any,
  profile?: TokenProfile,
  boost?: TokenBoost | null
): TokenCandidate | null {
  if (
    !pair?.baseToken?.address
  ) {
    return null;
  }

  if (
    pair.chainId !==
    "solana"
  ) {
    return null;
  }

  const socials =
    pair.info?.socials ||
    [];

  const websites =
    pair.info?.websites ||
    [];

  const boostAmount =
    Number(
      boost?.amount ??
        pair.boosts?.active ??
        0
    );

  return {
    address:
      pair.baseToken.address,

    symbol:
      pair.baseToken.symbol ||
      "UNKNOWN",

    name:
      pair.baseToken.name ||
      "Unknown Token",

    chain:
      "solana",

    priceUsd:
      Number(
        pair.priceUsd || 0
      ),

    priceChange5mPct:
      Number(
        pair.priceChange?.m5 ||
          0
      ),

    priceChange1hPct:
      Number(
        pair.priceChange?.h1 ||
          0
      ),

    priceChange24hPct:
      Number(
        pair.priceChange?.h24 ||
          0
      ),

    liquidityUsd:
      Number(
        pair.liquidity?.usd ||
          0
      ),

    volume5mUsd:
      Number(
        pair.volume?.m5 ||
          0
      ),

    volume1hUsd:
      Number(
        pair.volume?.h1 ||
          0
      ),

    marketCapUsd:
      Number(
        pair.marketCap ||
          pair.fdv ||
          0
      ),

    buyCount5m:
      Number(
        pair.txns?.m5?.buys ||
          0
      ),

    sellCount5m:
      Number(
        pair.txns?.m5?.sells ||
          0
      ),

    socialLinks:
      socials,

    websiteLinks:
      websites,

    description:
      boost?.description ||
      profile?.description ||
      "",

    boostAmount,

    boostActive:
      boostAmount > 0,
  };
}

/* =========================
   Solana Enrichment
========================= */

async function enrichSolanaCandidate(
  token: TokenCandidate
): Promise<TokenCandidate> {
  try {
    const mintInfo =
      await getSolanaMintInfo(
        token.address
      );

    if (!mintInfo) {
      return token;
    }

    return {
      ...token,

      mintAuthority:
        Boolean(
          mintInfo.mintAuthority
        ),

      freezeAuthority:
        Boolean(
          mintInfo.freezeAuthority
        ),

      supply:
        mintInfo.supply,

      top10HolderPct:
        mintInfo.top10HolderPct,

      topHolders:
        mintInfo.topHolders,
    };
  } catch (error) {
    console.error(
      `Solana enrichment failed for ${token.address}:`,
      error
    );

    return token;
  }
}

/* =========================
   Candidate Ranking
========================= */

function clamp(
  value: number,
  min = 0,
  max = 100
): number {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function liquidityScore(
  liquidityUsd: number
): number {
  return clamp(
    (liquidityUsd /
      100000) *
      100
  );
}

function volumeScore(
  volume1hUsd: number
): number {
  return clamp(
    (volume1hUsd /
      100000) *
      100
  );
}

function volumeAccelerationScore(
  token: TokenCandidate
): number {
  const volume1h =
    Math.max(
      token.volume1hUsd,
      1
    );

  const volume5m =
    Math.max(
      token.volume5mUsd,
      0
    );

  const baseline =
    volume1h / 12;

  const ratio =
    volume5m /
    Math.max(
      baseline,
      1
    );

  return clamp(
    50 +
      (ratio - 1) *
        25
  );
}

function buyPressureScore(
  token: TokenCandidate
): number {
  const buys =
    Math.max(
      token.buyCount5m ??
        0,
      0
    );

  const sells =
    Math.max(
      token.sellCount5m ??
        0,
      0
    );

  const total =
    buys + sells;

  if (
    total === 0
  ) {
    return 50;
  }

  return clamp(
    (buys / total) *
      100
  );
}

function momentumScore(
  token: TokenCandidate
): number {
  const price5m =
    token.priceChange5mPct ??
    0;

  const price1h =
    token.priceChange1hPct ??
    0;

  const shortTerm =
    clamp(
      50 +
        price5m * 4
    );

  const hourly =
    clamp(
      50 +
        price1h * 1.5
    );

  return (
    shortTerm * 0.45 +
    hourly * 0.55
  );
}

function holderSafetyScore(
  token: TokenCandidate
): number {
  if (
    token.top10HolderPct ===
    undefined
  ) {
    return 50;
  }

  return clamp(
    100 -
      token.top10HolderPct *
        1.5
  );
}

function contractSafetyScore(
  token: TokenCandidate
): number {
  let score = 100;

  if (
    token.mintAuthority
  ) {
    score -= 50;
  }

  if (
    token.freezeAuthority
  ) {
    score -= 50;
  }

  return clamp(score);
}

function socialScore(
  token: TokenCandidate
): number {
  let score = 0;

  const socials =
    token.socialLinks ||
    [];

  const websites =
    token.websiteLinks ||
    [];

  const hasTwitter =
    socials.some(
      (social) =>
        social.type ===
          "twitter" ||
        social.url?.includes(
          "x.com"
        ) ||
        social.url?.includes(
          "twitter.com"
        )
    );

  const hasTelegram =
    socials.some(
      (social) =>
        social.type ===
          "telegram" ||
        social.url?.includes(
          "t.me"
        )
    );

  const hasDiscord =
    socials.some(
      (social) =>
        social.type ===
          "discord" ||
        social.url?.includes(
          "discord"
        )
    );

  const hasWebsite =
    websites.length > 0;

  const hasDescription =
    Boolean(
      token.description &&
        token.description
          .trim()
          .length > 0
    );

  if (
    hasTwitter
  ) {
    score += 35;
  }

  if (
    hasWebsite
  ) {
    score += 25;
  }

  if (
    hasTelegram
  ) {
    score += 15;
  }

  if (
    hasDiscord
  ) {
    score += 10;
  }

  if (
    hasDescription
  ) {
    score += 15;
  }

  return clamp(score);
}

function boostScore(
  token: TokenCandidate
): number {
  if (
    !token.boostActive
  ) {
    return 50;
  }

  const boost =
    token.boostAmount ??
    0;

  return clamp(
    60 +
      Math.min(
        boost * 2,
        40
      )
  );
}

function calculateCandidateRank(
  token: TokenCandidate
): number {
  const liquidity =
    liquidityScore(
      token.liquidityUsd
    );

  const volume =
    volumeScore(
      token.volume1hUsd
    );

  const acceleration =
    volumeAccelerationScore(
      token
    );

  const pressure =
    buyPressureScore(
      token
    );

  const momentum =
    momentumScore(
      token
    );

  const holders =
    holderSafetyScore(
      token
    );

  const contract =
    contractSafetyScore(
      token
    );

  const social =
    socialScore(
      token
    );

  const boost =
    boostScore(
      token
    );

  const score =
    liquidity * 0.18 +
    volume * 0.18 +
    acceleration * 0.08 +
    pressure * 0.08 +
    momentum * 0.15 +
    holders * 0.12 +
    contract * 0.10 +
    social * 0.07 +
    boost * 0.04;

  return Math.round(
    clamp(score)
  );
}

/* =========================
   Automatic Solana Discovery
========================= */

export async function discoverSolanaCandidates(): Promise<
  TokenCandidate[]
> {
  console.log(
    "Starting automatic Solana discovery..."
  );

  const [
    profiles,
    boosts,
  ] =
    await Promise.all([
      getLatestTokenProfiles(),
      getLatestTokenBoosts(),
    ]);

  const solanaProfiles =
    profiles.filter(
      (profile) =>
        profile.chainId ===
          "solana" &&
        Boolean(
          profile.tokenAddress
        )
    );

  const solanaBoosts =
    boosts.filter(
      (boost) =>
        boost.chainId ===
        "solana"
    );

  console.log(
    `Latest profiles: ${profiles.length}`
  );

  console.log(
    `Solana profiles: ${solanaProfiles.length}`
  );

  console.log(
    `Latest boosts: ${boosts.length}`
  );

  console.log(
    `Solana boosts: ${solanaBoosts.length}`
  );

  const allCandidates =
    new Map<
      string,
      TokenCandidate
    >();

  for (
    const profile of solanaProfiles
  ) {
    const address =
      profile.tokenAddress;

    if (!address) {
      continue;
    }

    try {
      const pairs =
        await getTokenPairs(
          "solana",
          address
        );

      const pair =
        selectBestPair(
          pairs
        );

      if (!pair) {
        continue;
      }

      const boost =
        findTokenBoost(
          solanaBoosts,
          address
        );

      const candidate =
        toCandidate(
          pair,
          profile,
          boost
        );

      if (!candidate) {
        continue;
      }

      /*
       * Basic market filters
       */

      if (
        candidate.liquidityUsd <
        5000
      ) {
        continue;
      }

      if (
        candidate.volume5mUsd <=
          0 &&
        candidate.volume1hUsd <=
          0
      ) {
        continue;
      }

      /*
       * Enrich with real
       * Solana holder data
       */

      const enriched =
        await enrichSolanaCandidate(
          candidate
        );

      allCandidates.set(
        enriched.address,
        enriched
      );
    } catch (error) {
      console.error(
        `Discovery failed for ${address}:`,
        error
      );
    }
  }

  console.log(
    `Market candidates before ranking: ${allCandidates.size}`
  );

  const ranked =
    Array.from(
      allCandidates.values()
    )
      .filter(
        (token) =>
          token.top10HolderPct !==
          undefined
      )
      .filter(
        (token) =>
          token.topHolders !==
            undefined &&
          token.topHolders.length >
            0
      )
      .map(
        (token) => ({
          ...token,

          candidateRank:
            calculateCandidateRank(
              token
            ),
        })
      )
      .sort(
        (a, b) =>
          (b.candidateRank ??
            0) -
          (a.candidateRank ??
            0)
      )
      .slice(0, 20);

  console.log(
    "Top candidates:",
    ranked.map(
      (token) => ({
        symbol:
          token.symbol,

        rank:
          token.candidateRank,

        liquidity:
          token.liquidityUsd,

        volume1h:
          token.volume1hUsd,

        social:
          socialScore(
            token
          ),

        boost:
          token.boostAmount,

        boostActive:
          token.boostActive,
      })
    )
  );

  return ranked;
}

/* =========================
   Chain Entry
========================= */

export async function getCandidatesForChain(
  chain:
    | "solana"
    | "bsc"
): Promise<TokenCandidate[]> {
  if (
    chain === "solana"
  ) {
    return discoverSolanaCandidates();
  }

  /*
   * BSC discovery will be
   * upgraded separately.
   */

  return [];
}
export async function getCurrentTokenPrice(
  chain: Chain,
  tokenAddress: string
): Promise<number> {
  const chainId =
    chain === "solana"
      ? "solana"
      : chain === "bsc"
      ? "bsc"
      : "solana";

  const pairs = await getTokenPairs(
    chainId,
    tokenAddress
  );

  const pair = selectBestPair(pairs);

  if (!pair) {
    return 0;
  }

  return Number(pair.priceUsd || 0);
}
