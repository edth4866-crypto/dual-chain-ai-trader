import { NextResponse } from "next/server";
import { runPaperScan } from "../../../../lib/paper/auto-scan";
import { withPaperAuth } from "../../../../lib/security/paper-access";

async function paperAuthenticatedGET(request: Request) {
  try {
    const url = new URL(request.url);
    const chainParam = url.searchParams.get("chain");
    const chain = chainParam === "bsc" ? "bsc" : "solana";

    const result = await runPaperScan({ chain });

    return NextResponse.json(result);
  } catch (error) {
    console.error("PAPER AUTO SCAN ERROR:", error);

    return NextResponse.json(
      {
        error: "Paper auto scan failed.",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

export const GET = withPaperAuth(
  paperAuthenticatedGET,
  "CRON"
);
