import { NextResponse } from "next/server";
import {
  getPaperAccount,
  closePosition,
} from "../../../../lib/paper/store";
import { getCurrentTokenPrice } from "../../../../lib/market";
import { closePaperPosition } from "../../../../lib/paper/engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = String(body.token || "");
    const openedAt = String(body.openedAt || "");

    if (!token || !openedAt) {
      return NextResponse.json(
        {
          error: "token and openedAt are required.",
        },
        { status: 400 }
      );
    }

    const account = await getPaperAccount();

    const position = account.positions.find(
      (item) =>
        item.token === token &&
        item.openedAt === openedAt
    );

    if (!position) {
      return NextResponse.json(
        {
          error: "Paper position not found.",
        },
        { status: 404 }
      );
    }

    const currentPrice =
      await getCurrentTokenPrice(
        position.chain,
        position.token
      );

    if (
      !Number.isFinite(currentPrice) ||
      currentPrice <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Current market price unavailable.",
        },
        { status: 503 }
      );
    }

    const trade =
      closePaperPosition(
        position,
        currentPrice
      );

    await closePosition(trade);

    return NextResponse.json({
      success: true,
      trade,
    });
  } catch (error) {
    console.error(
      "PAPER CLOSE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to close paper position.",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}