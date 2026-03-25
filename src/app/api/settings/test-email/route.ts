import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.to) {
    return NextResponse.json(
      { error: "to is required" },
      { status: 400 },
    );
  }

  try {
    await sendEmail(
      body.to,
      body.subject ?? "CaseFlow テスト通知",
      body.text ?? "CaseFlow メール連携が正常に動作しています。",
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to send email: ${message}` },
      { status: 500 },
    );
  }
}
