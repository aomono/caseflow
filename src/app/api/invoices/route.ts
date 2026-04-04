import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const dealId = searchParams.get("dealId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (year) where.year = Number(year);
    if (month) where.month = Number(month);
    if (dealId) where.dealId = dealId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { deal: { include: { client: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Failed to fetch invoices", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.dealId || body.year == null || body.month == null || body.amount == null || !body.dueDate) {
      return NextResponse.json(
        { error: "dealId, year, month, amount, and dueDate are required" },
        { status: 400 },
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        dealId: body.dealId,
        year: Number(body.year),
        month: Number(body.month),
        amount: Number(body.amount),
        dueDate: new Date(body.dueDate),
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
        status: body.status ?? "draft",
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Failed to create invoice", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
