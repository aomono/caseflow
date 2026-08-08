import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORIES = ["payment", "execComp", "expense"];

/**
 * 費用セルの月別上書き。
 *
 * 「既定値に戻す」は**行の削除**で表す。0 で上書きするのと区別が要る——
 * 0円（今月は払わない）と未設定（既定値に従う）は別の意味なので。
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, category, amount } = body ?? {};

    if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: `invalid month: ${month}` }, { status: 400 });
    }
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `invalid category: ${category}` },
        { status: 400 },
      );
    }
    if (!Number.isInteger(amount) || amount < 0) {
      return NextResponse.json(
        { error: `invalid amount: ${amount}` },
        { status: 400 },
      );
    }

    const [year, mo] = month.split("-").map(Number);
    const saved = await prisma.monthlyCostOverride.upsert({
      where: { year_month_category: { year, month: mo, category } },
      create: { year, month: mo, category, amount },
      update: { amount },
    });
    return NextResponse.json(saved);
  } catch (error) {
    console.error("Failed to save override:", error);
    return NextResponse.json({ error: "Failed to save override" }, { status: 500 });
  }
}

/** 上書きを消す＝既定値に戻す */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? "";
    const category = searchParams.get("category") ?? "";
    if (!/^\d{4}-\d{2}$/.test(month) || !CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "invalid month/category" }, { status: 400 });
    }
    const [year, mo] = month.split("-").map(Number);
    await prisma.monthlyCostOverride.deleteMany({
      where: { year, month: mo, category },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete override:", error);
    return NextResponse.json({ error: "Failed to delete override" }, { status: 500 });
  }
}
