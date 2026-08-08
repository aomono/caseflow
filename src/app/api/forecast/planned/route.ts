import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 売上の月別計画値の上書き（Phase D）。
 *
 * 案件は月額を1つしか持てないので、月ごとに変わる計画（初月半額・繁忙期の
 * 増額）を表現できない。契約期間を計画に合わせて伸ばすと更新リマインダーが
 * 狂うので、**契約はそのままに計画値だけをここで置く**。
 *
 * **実績（Invoiceのある月）は上書きしない**——実績の真実は請求にあり、
 * 計画値で書き換えられると台帳が嘘をつく。集計側でも Invoice を優先する。
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealId, month, amount } = body ?? {};

    if (typeof dealId !== "string" || !dealId) {
      return NextResponse.json({ error: "dealId is required" }, { status: 400 });
    }
    if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: `invalid month: ${month}` }, { status: 400 });
    }
    if (!Number.isInteger(amount) || amount < 0) {
      return NextResponse.json({ error: `invalid amount: ${amount}` }, { status: 400 });
    }

    const [year, mo] = month.split("-").map(Number);

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { id: true },
    });
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // 請求済みの月は計画で上書きさせない（実績が真実）
    const invoiced = await prisma.invoice.findFirst({
      where: {
        dealId,
        year,
        month: mo,
        status: { in: ["sent", "paid", "overdue"] },
      },
      select: { id: true },
    });
    if (invoiced) {
      return NextResponse.json(
        { error: "請求済みの月は編集できません（実績は請求が正）" },
        { status: 409 },
      );
    }

    const saved = await prisma.plannedRevenueOverride.upsert({
      where: { dealId_year_month: { dealId, year, month: mo } },
      create: { dealId, year, month: mo, amount },
      update: { amount },
    });
    return NextResponse.json(saved);
  } catch (error) {
    console.error("Failed to save planned revenue:", error);
    return NextResponse.json(
      { error: "Failed to save planned revenue" },
      { status: 500 },
    );
  }
}

/** 上書きを消す＝契約ベースの既定値（月額フラット）に戻す */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get("dealId") ?? "";
    const month = searchParams.get("month") ?? "";
    if (!dealId || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "invalid dealId/month" }, { status: 400 });
    }
    const [year, mo] = month.split("-").map(Number);
    await prisma.plannedRevenueOverride.deleteMany({
      where: { dealId, year, month: mo },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete planned revenue:", error);
    return NextResponse.json(
      { error: "Failed to delete planned revenue" },
      { status: 500 },
    );
  }
}
