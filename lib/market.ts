import { TokenCandidate } from "./types";

export function demoCandidates(): TokenCandidate[] {
  return [
    {
      address:"DEMO_SOL_ABC",
      symbol:"ABC",
      name:"Demo Solana Meme",
      chain:"solana",
      priceUsd:0.00012,
      liquidityUsd:83000,
      volume5mUsd:42000,
      volume1hUsd:390000,
      marketCapUsd:420000,
      holders:2341,
      buyCount5m:64,
      sellCount5m:36,
      top10HolderPct:18,
      devWalletPct:2.1,
      mintAuthority:false,
      freezeAuthority:false
    },
    {
      address:"DEMO_RH_XYZ",
      symbol:"XYZ",
      name:"Demo Robinhood Meme",
      chain:"robinhood",
      priceUsd:0.00031,
      liquidityUsd:61000,
      volume5mUsd:12000,
      volume1hUsd:180000,
      marketCapUsd:690000,
      holders:1200,
      buyCount5m:41,
      sellCount5m:37,
      top10HolderPct:22,
      devWalletPct:3.2,
      mintAuthority:false,
      freezeAuthority:false
    }
  ];
}