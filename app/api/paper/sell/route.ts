import { NextResponse } from "next/server";
import {
  closePaperPosition,
} from "../../../../lib/paper/engine";
import {
  closePosition,
  getPaperAccount,
} from "../../../../lib/paper/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = String(body.token ?? "");
    const exitPrice = Number(body.exitPrice);

    if (!token) {
      return NextResponse.json(
        { error: "Token is required." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(exitPrice) ||
      exitPrice <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid exitPrice." },
        { status: 400 }
      );
    }

    const account = await getPaperAccount();

    const position = account.positions.find(
      (item) => item.token === token
    );

    if (!position) {
      return NextResponse.json(
        { error: "Paper position not found." },
        { status: 404 }
      );
    }

    const trade = closePaperPosition(
      position,
      exitPrice
    );

    closePosition(trade);

    return NextResponse.json({
      success: true,
      message: "Paper SELL executed.",
      trade,
      account: getPaperAccount(),
    });
  } catch (error) {
    console.error("PAPER SELL ERROR:", error);

    return NextResponse.json(
      {
        error: "Paper sell failed.",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
