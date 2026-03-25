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

  // Find all active deals with a monthlyAmount set
  const activeDeals = await prisma.deal.findMany({
    where: {
      status: "active",
      monthlyAmount: { not: null },
    },
  });

  // Find existing invoices for this year+month to avoid duplicates
  const existingInvoices = await prisma.invoice.findMany({
    where: { year, month },
    select: { dealId: true },
  });
  const existingDealIds = new Set(existingInvoices.map((inv: { dealId: string }) => inv.dealId));

  // Create invoices for deals that don't have one yet
  const toCreate = activeDeals.filter(
    (deal: { id: string }) => !existingDealIds.has(deal.id),
  );

  // Calculate due date as end of the target month
  const dueDate = new Date(year, month, 0); // last day of the month

  let createdCount = 0;
  for (const deal of toCreate) {
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

  return NextResponse.json({ createdCount }, { status: 201 });
}
