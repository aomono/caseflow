import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDealPatch } from "@/lib/deal-validation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        client: true,
        contacts: true,
        activities: {
          orderBy: { date: "desc" },
          take: 10,
        },
        invoices: true,
        reports: true,
        reminders: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error("Failed to get deal:", error);
    return NextResponse.json(
      { error: "Failed to get deal" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const deal = await prisma.deal.update({
      where: { id },
      data: body,
      include: { client: true },
    });

    // 金額変更時、draft状態の請求書を連動更新
    if (body.monthlyAmount !== undefined || body.contractAmount !== undefined) {
      const newAmount = deal.billingType === "lumpsum"
        ? deal.contractAmount
        : deal.monthlyAmount;

      if (newAmount != null) {
        await prisma.invoice.updateMany({
          where: { dealId: id, status: "draft" },
          data: { amount: newAmount },
        });
      }
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error("Failed to update deal:", error);
    return NextResponse.json(
      { error: "Failed to update deal" },
      { status: 500 },
    );
  }
}

/**
 * 部分更新（インライン編集・外部API用）。
 *
 * PUT は body をそのまま data に渡すので、任意の列を書き換えられる。一覧や
 * ボードから叩く経路では**触れる列を絞る**（誤ったペイロードで契約金額や
 * 請求連動の値が飛ぶのを防ぐ）。検証は lib/deal-validation に集約していて、
 * 貼り付け一括更新のapplyと外部APIも同じ規則で動く。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const patch = buildDealPatch(body);
    if (!patch.ok) {
      return NextResponse.json({ error: patch.error }, { status: 400 });
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: patch.data,
      include: { client: true },
    });

    return NextResponse.json(deal);
  } catch (error) {
    console.error("Failed to patch deal:", error);
    return NextResponse.json(
      { error: "Failed to patch deal" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.deal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete deal:", error);
    return NextResponse.json(
      { error: "Failed to delete deal" },
      { status: 500 },
    );
  }
}
