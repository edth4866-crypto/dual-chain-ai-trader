import { NextResponse } from "next/server";
import { getPaperAccount } from "../../../../lib/paper/store";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      account: getPaperAccount(),
    });
  } catch (error) {
    console.error("PAPER ACCOUNT ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to load paper account.",
      },
      { status: 500 }
    );
  }
}
