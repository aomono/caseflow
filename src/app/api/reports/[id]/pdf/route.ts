import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { generateReportPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function POST(
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

  const companyName = process.env.COMPANY_NAME ?? "株式会社Asterio";

  const pdfBuffer = await generateReportPdf({
    companyName,
    clientName: report.deal.client.name,
    period: report.period,
    workDescription: report.workDescription,
    amount: report.amount,
    issueDate: new Date(),
  });

  const blob = await put(
    `reports/${report.id}_${report.year}-${report.month}.pdf`,
    pdfBuffer,
    { access: "public", contentType: "application/pdf" },
  );

  const updated = await prisma.report.update({
    where: { id },
    data: {
      pdfUrl: blob.url,
      status: "finalized",
    },
  });

  return NextResponse.json({ pdfUrl: updated.pdfUrl });
}
