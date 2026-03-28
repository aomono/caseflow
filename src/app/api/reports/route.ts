import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get("dealId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (dealId) where.dealId = dealId;
  if (status) where.status = status;

  const reports = await prisma.report.findMany({
    where,
    include: { deal: { include: { client: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(reports);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (
    !body.dealId ||
    body.year == null ||
    body.month == null ||
    !body.period ||
    !body.workDescription ||
    body.amount == null
  ) {
    return NextResponse.json(
      {
        error:
          "dealId, year, month, period, workDescription, and amount are required",
      },
      { status: 400 },
    );
  }

  try {
    const report = await prisma.report.upsert({
      where: {
        dealId_year_month: {
          dealId: body.dealId,
          year: Number(body.year),
          month: Number(body.month),
        },
      },
      update: {
        period: body.period,
        workDescription: body.workDescription,
        amount: Number(body.amount),
      },
      create: {
        dealId: body.dealId,
        year: Number(body.year),
        month: Number(body.month),
        period: body.period,
        workDescription: body.workDescription,
        amount: Number(body.amount),
        status: "draft",
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Failed to create/update report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 },
    );
  }
}
