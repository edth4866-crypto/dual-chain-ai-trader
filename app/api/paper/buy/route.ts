import { NextResponse } from "next/server";
import { openPaperPosition } from "../../../../lib/paper/engine";
import {
  addPosition,
  getPaperAccount,
} from "../../../../lib/paper/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = String(body.token ?? "");
    const symbol = String(body.symbol ?? "");
    const priceUsd = Number(body.priceUsd);
    const positionUsd = Number(body.positionUsd ?? 100);

    if (!token || !symbol) {
      return NextResponse.json(
        { error: "Token and symbol are required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      return NextResponse.json(
        { error: "Invalid priceUsd." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(positionUsd) || positionUsd <= 0) {
      return NextResponse.json(
        { error: "Invalid positionUsd." },
        { status: 400 }
      );
    }

    const account = await getPaperAccount();

    if (positionUsd > account.balanceUsd) {
      return NextResponse.json(
        { error: "Insufficient paper balance." },
        { status: 400 }
      );
    }

    const position = openPaperPosition(
      token,
      symbol,
      "solana",
      priceUsd,
      positionUsd
    );

    await addPosition(position);

    return NextResponse.json({
      success: true,
      message: "Paper BUY executed.",
      position,
      account: await getPaperAccount(),
    });
  } catch (error) {
    console.error("PAPER BUY ERROR:", error);

    return NextResponse.json(
      {
        error: "Paper buy failed.",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}