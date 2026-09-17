export async function getSolanaMintInfo(mintAddress: string) {
  const apiKey = process.env.HELIUS_API_KEY;

  if (!apiKey) {
    throw new Error("HELIUS_API_KEY is missing");
  }

  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  const accountResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [
        mintAddress,
        {
          encoding: "jsonParsed",
        },
      ],
    }),
    cache: "no-store",
  });

  if (!accountResponse.ok) {
    throw new Error(
      `Helius account request failed: ${accountResponse.status}`
    );
  }

  const accountData = await accountResponse.json();
  const value = accountData?.result?.value;
  const info = value?.data?.parsed?.info;

  if (!info) {
    return null;
  }

  const supplyResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "getTokenSupply",
      params: [mintAddress],
    }),
    cache: "no-store",
  });

  if (!supplyResponse.ok) {
    throw new Error(
      `Helius supply request failed: ${supplyResponse.status}`
    );
  }

  const supplyData = await supplyResponse.json();

  const holderResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "getTokenLargestAccounts",
      params: [mintAddress],
    }),
    cache: "no-store",
  });

  if (!holderResponse.ok) {
    throw new Error(
      `Helius holder request failed: ${holderResponse.status}`
    );
  }

  const holderData = await holderResponse.json();

  const largestAccounts = Array.isArray(holderData?.result?.value)
    ? holderData.result.value
    : [];

  const top10Amount = largestAccounts
    .slice(0, 10)
    .reduce(
      (total: number, account: { uiAmount?: number | null }) =>
        total + Number(account.uiAmount || 0),
      0
    );

  const totalSupply = Number(
    supplyData?.result?.value?.uiAmount || 0
  );

  const top10HolderPct =
    totalSupply > 0 ? (top10Amount / totalSupply) * 100 : 0;

  return {
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
    decimals: info.decimals ?? null,
    supply: totalSupply,
    top10HolderPct,
  };
}
