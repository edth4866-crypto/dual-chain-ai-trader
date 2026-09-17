export type SolanaHolderInfo = {
  tokenAccount: string;
  walletOwner: string;
  amount: number;
  percentageOfSupply: number;
};

export type WhaleFlow = {
  action: "BUY" | "SELL" | "NEUTRAL";
  buyAmount: number;
  sellAmount: number;
  netAmount: number;
  transactionCount: number;
};

export async function getSolanaMintInfo(mintAddress: string) {
  const apiKey = process.env.HELIUS_API_KEY;

  if (!apiKey) {
    throw new Error("HELIUS_API_KEY is missing");
  }

  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  async function rpc(method: string, params: unknown[]) {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Helius ${method} failed: ${response.status}`);
    }

    const data = await response.json();

    if (data?.error) {
      throw new Error(
        `Helius ${method} error: ${
          data.error.message || "Unknown error"
        }`
      );
    }

    return data?.result;
  }

  const accountResult = await rpc("getAccountInfo", [
    mintAddress,
    {
      encoding: "jsonParsed",
    },
  ]);

  const info = accountResult?.value?.data?.parsed?.info;

  if (!info) {
    return null;
  }

  const supplyResult = await rpc("getTokenSupply", [mintAddress]);

  const holderResult = await rpc("getTokenLargestAccounts", [
    mintAddress,
  ]);

  const largestAccounts = Array.isArray(holderResult?.value)
    ? holderResult.value.slice(0, 10)
    : [];

  const totalSupply = Number(
    supplyResult?.value?.uiAmount || 0
  );

  const topHolders: SolanaHolderInfo[] = [];

  for (const account of largestAccounts) {
    const tokenAccount = account?.address;

    if (!tokenAccount) {
      continue;
    }

    try {
      const tokenAccountResult = await rpc("getAccountInfo", [
        tokenAccount,
        {
          encoding: "jsonParsed",
        },
      ]);

      const tokenInfo =
        tokenAccountResult?.value?.data?.parsed?.info;

      const walletOwner = tokenInfo?.owner;
      const amount = Number(account?.uiAmount || 0);

      if (!walletOwner) {
        continue;
      }

      const percentageOfSupply =
        totalSupply > 0
          ? (amount / totalSupply) * 100
          : 0;

      topHolders.push({
        tokenAccount,
        walletOwner,
        amount,
        percentageOfSupply,
      });
    } catch {
      continue;
    }
  }

  const top10Amount = topHolders.reduce(
    (total, holder) => total + holder.amount,
    0
  );

  const top10HolderPct =
    totalSupply > 0
      ? (top10Amount / totalSupply) * 100
      : 0;

  return {
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
    decimals: info.decimals ?? null,
    supply: totalSupply,
    top10HolderPct,
    topHolders,
  };
}

export async function getSolanaWalletTransactions(
  walletAddress: string
) {
  const apiKey = process.env.HELIUS_API_KEY;

  if (!apiKey) {
    throw new Error("HELIUS_API_KEY is missing");
  }

  const url =
    `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions` +
    `?api-key=${apiKey}&limit=100`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Helius wallet transactions failed: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data) ? data : [];
}

export function analyzeWhaleFlow(
  transactions: any[],
  walletAddress: string,
  mintAddress: string
): WhaleFlow {
  let buyAmount = 0;
  let sellAmount = 0;
  let transactionCount = 0;

  for (const tx of transactions) {
    if (tx?.type !== "SWAP") {
      continue;
    }

    const transfers = Array.isArray(tx?.tokenTransfers)
      ? tx.tokenTransfers
      : [];

    let walletSent = 0;
    let walletReceived = 0;

    for (const transfer of transfers) {
      if (transfer?.mint !== mintAddress) {
        continue;
      }

      const amount = Number(transfer?.tokenAmount || 0);

      if (transfer?.fromUserAccount === walletAddress) {
        walletSent += amount;
      }

      if (transfer?.toUserAccount === walletAddress) {
        walletReceived += amount;
      }
    }

    if (walletReceived > walletSent) {
      buyAmount += walletReceived - walletSent;
      transactionCount++;
    } else if (walletSent > walletReceived) {
      sellAmount += walletSent - walletReceived;
      transactionCount++;
    }
  }

  const netAmount = buyAmount - sellAmount;

  let action: WhaleFlow["action"] = "NEUTRAL";

  if (netAmount > 0) {
    action = "BUY";
  } else if (netAmount < 0) {
    action = "SELL";
  }

  return {
    action,
    buyAmount,
    sellAmount,
    netAmount,
    transactionCount,
  };
}

export async function getSolanaWhaleFlow(
  walletAddress: string,
  mintAddress: string
): Promise<WhaleFlow> {
  const transactions =
    await getSolanaWalletTransactions(walletAddress);

  return analyzeWhaleFlow(
    transactions,
    walletAddress,
    mintAddress
  );
}

export type MultiWhaleFlow = {
  walletAddress: string;
  percentageOfSupply: number;
  amount: number;
  action: "BUY" | "SELL" | "NEUTRAL";
  buyAmount: number;
  sellAmount: number;
  netAmount: number;
  transactionCount: number;
};

export async function analyzeTopWhales(
  holders: SolanaHolderInfo[],
  mintAddress: string
): Promise<MultiWhaleFlow[]> {
  const results: MultiWhaleFlow[] = [];

  for (const holder of holders.slice(0, 10)) {
    try {
      const flow = await getSolanaWhaleFlow(
        holder.walletOwner,
        mintAddress
      );

      results.push({
        walletAddress: holder.walletOwner,
        percentageOfSupply:
          holder.percentageOfSupply,
        amount: holder.amount,
        action: flow.action,
        buyAmount: flow.buyAmount,
        sellAmount: flow.sellAmount,
        netAmount: flow.netAmount,
        transactionCount:
          flow.transactionCount,
      });
    } catch (error) {
      console.error(
        `Whale analysis failed for ${holder.walletOwner}:`,
        error
      );

      results.push({
        walletAddress: holder.walletOwner,
        percentageOfSupply:
          holder.percentageOfSupply,
        amount: holder.amount,
        action: "NEUTRAL",
        buyAmount: 0,
        sellAmount: 0,
        netAmount: 0,
        transactionCount: 0,
      });
    }
  }

  return results;
}
