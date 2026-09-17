import { TokenCandidate } from "./types";
import { searchToken } from "./market/dexscreener";
import { getSolanaMintInfo } from "./chain/solana";

function toCandidate(pair: any): TokenCandidate | null {
  if (!pair?.baseToken?.address) return null;

  const chain =
    pair.chainId === "solana"
      ? "solana"
      : pair.chainId === "bsc"
      ? "bsc"
      : null;

  if (!chain) return null;

  return {
    address: pair.baseToken.address,
    symbol: pair.baseToken.symbol || "UNKNOWN",
    name: pair.baseToken.name || "Unknown Token",
    chain,

    priceUsd: Number(pair.priceUsd || 0),

    priceChange5mPct: Number(pair.priceChange?.m5 || 0),
    priceChange1hPct: Number(pair.priceChange?.h1 || 0),
    priceChange24hPct: Number(pair.priceChange?.h24 || 0),

    liquidityUsd: Number(pair.liquidity?.usd || 0),

    volume5mUsd: Number(pair.volume?.m5 || 0),
    volume1hUsd: Number(pair.volume?.h1 || 0),

    marketCapUsd: Number(
      pair.marketCap || pair.fdv || 0
    ),

    buyCount5m: Number(
      pair.txns?.m5?.buys || 0
    ),

    sellCount5m: Number(
      pair.txns?.m5?.sells || 0
    ),
  };
}

export async function getRealCandidates(
  query: string
): Promise<TokenCandidate[]> {
  const pairs = await searchToken(query);

  const candidates = pairs
    .map(toCandidate)
    .filter(
      (token): token is TokenCandidate =>
        token !== null
    );

  const enriched: TokenCandidate[] = [];

  for (const token of candidates) {
    if (token.chain !== "solana") {
      enriched.push(token);
      continue;
    }

    try {
      const mintInfo = await getSolanaMintInfo(
        token.address
      );

      if (!mintInfo) {
        enriched.push(token);
        continue;
      }

      enriched.push({
        ...token,

        mintAuthority: Boolean(
          mintInfo.mintAuthority
        ),

        freezeAuthority: Boolean(
          mintInfo.freezeAuthority
        ),

        supply: mintInfo.supply,

        top10HolderPct:
          mintInfo.top10HolderPct,

        topHolders:
          mintInfo.topHolders,
      });
    } catch (error) {
      console.error(
        `Solana enrichment failed for ${token.address}:`,
        error
      );

      enriched.push(token);
    }
  }

  return enriched;
}

export async function getCandidatesForChain(
  chain: "solana" | "bsc"
): Promise<TokenCandidate[]> {
  const query =
    chain === "solana"
      ? "PEPE"
      : "BNB";

  const candidates =
    await getRealCandidates(query);

  return candidates
    .filter(
      (token) =>
        token.chain === chain
    )
    .filter(
      (token) =>
        token.liquidityUsd >= 50000
    )
    .filter(
      (token) =>
        token.volume1hUsd > 0
    )
    .sort((a, b) => {
      if (
        b.volume1hUsd !==
        a.volume1hUsd
      ) {
        return (
          b.volume1hUsd -
          a.volume1hUsd
        );
      }

      return (
        b.liquidityUsd -
        a.liquidityUsd
      );
    })
    .slice(0, 20);
}