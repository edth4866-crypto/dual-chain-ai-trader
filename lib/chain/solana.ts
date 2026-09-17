export async function getSolanaMintInfo(mintAddress: string) {
  const response = await fetch(
    "https://api.mainnet-beta.solana.com",
    {
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
    }
  );

  if (!response.ok) {
    throw new Error(`Solana RPC request failed: ${response.status}`);
  }

  const data = await response.json();
  const value = data?.result?.value;
  const info = value?.data?.parsed?.info;

  if (!info) {
    return null;
  }

  const supplyResponse = await fetch(
    "https://api.mainnet-beta.solana.com",
    {
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
    }
  );

  const supplyData = await supplyResponse.json();

  return {
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
    decimals: info.decimals ?? null,
    supply: supplyData?.result?.value?.uiAmount ?? null,
  };
}
