import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { deal: { include: { client: true } } },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.report.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = await prisma.report.update({
    where: { id },
    data: {
      ...(body.year !== undefined && { year: Number(body.year) }),
      ...(body.month !== undefined && { month: Number(body.month) }),
      ...(body.period !== undefined && { period: body.period }),
      ...(body.workDescription !== undefined && {
        workDescription: body.workDescription,
      }),
      ...(body.amount !== undefined && { amount: Number(body.amount) }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });

  return NextResponse.json(report);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await prisma.report.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  await prisma.report.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
