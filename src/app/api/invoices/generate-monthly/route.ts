import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.year == null || body.month == null) {
    return NextResponse.json(
      { error: "year and month are required" },
      { status: 400 },
    );
  }

  const year = Number(body.year);
  const month = Number(body.month);

  // Find all active deals (monthly with monthlyAmount, or lumpsum with contractAmount)
  const activeDeals = await prisma.deal.findMany({
    where: {
      status: "active",
      OR: [
        { billingType: "monthly", monthlyAmount: { not: null } },
        { billingType: "lumpsum", contractAmount: { not: null } },
      ],
    },
  });

  // Find existing invoices for this year+month to avoid duplicates
  const existingInvoices = await prisma.invoice.findMany({
    where: { year, month },
    select: { dealId: true },
  });
  const existingDealIds = new Set(existingInvoices.map((inv: { dealId: string }) => inv.dealId));

  // Calculate due date as end of the target month
  const dueDate = new Date(year, month, 0); // last day of the month

  let createdCount = 0;
  for (const deal of activeDeals) {
    if (existingDealIds.has(deal.id)) continue;

    if (deal.billingType === "lumpsum") {
      // 一括契約: 終了月のみ請求書生成
      if (!deal.contractEndDate || !deal.contractAmount) continue;
      const endDate = new Date(deal.contractEndDate);
      if (endDate.getFullYear() !== year || endDate.getMonth() + 1 !== month) continue;

      await prisma.invoice.create({
        data: {
          dealId: deal.id,
          year,
          month,
          amount: deal.contractAmount,
          dueDate,
          status: "draft",
        },
      });
      createdCount++;
    } else {
      // 月額契約: 毎月生成
      await prisma.invoice.create({
        data: {
          dealId: deal.id,
          year,
          month,
          amount: deal.monthlyAmount!,
          dueDate,
          status: "draft",
        },
      });
      createdCount++;
    }
  }

  return NextResponse.json({ createdCount }, { status: 201 });
}
