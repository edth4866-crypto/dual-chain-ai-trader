import { NextResponse } from "next/server";
import { getSolanaWalletTransactions } from "../../../lib/chain/solana";

export async function GET() {
  try {
    const wallet =
      "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";

    const transactions =
      await getSolanaWalletTransactions(wallet);

    return NextResponse.json({
      wallet,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
