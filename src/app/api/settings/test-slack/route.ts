import { NextRequest, NextResponse } from "next/server";
import { sendSlackMessage } from "@/lib/slack";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.channel) {
    return NextResponse.json(
      { error: "channel is required" },
      { status: 400 },
    );
  }

  try {
    await sendSlackMessage(
      body.channel,
      body.message ?? "CaseFlow テスト通知: Slack連携が正常に動作しています。",
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to send Slack message: ${message}` },
      { status: 500 },
    );
  }
}
