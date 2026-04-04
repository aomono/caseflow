import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
