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

    liquidityUsd: Number(pair.liquidity?.usd || 0),

    volume5mUsd: Number(pair.volume?.m5 || 0),

    volume1hUsd: Number(pair.volume?.h1 || 0),

    marketCapUsd: Number(pair.marketCap || pair.fdv || 0),

    buyCount5m: Number(pair.txns?.m5?.buys || 0),

    sellCount5m: Number(pair.txns?.m5?.sells || 0),
  };
}

export async function getRealCandidates(
  query: string
): Promise<TokenCandidate[]> {
  const pairs = await searchToken(query);

  const candidates = pairs
    .map(toCandidate)
    .filter((token): token is TokenCandidate => token !== null);

  const enriched = await Promise.all(
    candidates.map(async (token) => {
      if (token.chain !== "solana") {
        return token;
      }

      try {
        const mintInfo = await getSolanaMintInfo(token.address);

        if (!mintInfo) {
          return token;
        }

        return {
          ...token,
          mintAuthority: Boolean(mintInfo.mintAuthority),
          freezeAuthority: Boolean(mintInfo.freezeAuthority),
        };
      } catch {
        return token;
      }
    })
  );

  return enriched;
}

export async function getCandidatesForChain(
  chain: "solana" | "bsc"
): Promise<TokenCandidate[]> {
  const query = chain === "solana" ? "PEPE" : "BNB";

  const candidates = await getRealCandidates(query);

  return candidates
    .filter((token) => token.chain === chain)
    .filter((token) => token.liquidityUsd >= 50000)
    .filter((token) => token.volume1hUsd > 0)
    .slice(0, 20);
}
