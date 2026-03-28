import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { buildReportDocx } from "@/lib/report-builder";
import { generateReportContent } from "@/lib/report-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// GET: generate docx from report data and return as download
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

  try {
    const formatJaDate = (d: Date) =>
      `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

    const reportDate = formatJaDate(new Date());

    // 実施期間: 契約開始日～契約終了日
    const period = report.deal.contractStartDate && report.deal.contractEndDate
      ? `${formatJaDate(report.deal.contractStartDate)}～${formatJaDate(report.deal.contractEndDate)}`
      : report.period;

    // AIで業務内容・成果物・今後の対応を推測生成
    const aiContent = await generateReportContent({
      clientName: report.deal.client.name,
      dealTitle: report.deal.title,
      contractStartDate: report.deal.contractStartDate ? formatJaDate(report.deal.contractStartDate) : null,
      contractEndDate: report.deal.contractEndDate ? formatJaDate(report.deal.contractEndDate) : null,
      contractSummary: report.deal.contractSummary,
      description: report.deal.description,
    });

    const buffer = await buildReportDocx({
      clientName: report.deal.client.name,
      dealTitle: report.deal.title,
      reportDate,
      period,
      workDescriptionItems: aiContent.workDescriptionItems,
      deliverables: aiContent.deliverables,
      nextActions: aiContent.nextActions,
    });

    // Try to save to blob (non-blocking — download works even if blob fails)
    try {
      const filename = `reports/${report.id}_${report.year}-${report.month}.docx`;
      const blob = await put(filename, buffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      await prisma.report.update({
        where: { id },
        data: { docxUrl: blob.url },
      });
    } catch {
      // Blob storage may not be configured — continue with direct download
    }

    const filename = `${report.deal.client.name}_ASP業務完了報告書_${report.year}-${report.month}.docx`;
    const encodedFilename = encodeURIComponent(filename);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="report.docx"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to generate docx:", message, error);
    return NextResponse.json(
      { error: `Failed to generate docx: ${message}` },
      { status: 500 },
    );
  }
}

// PUT: upload edited docx to overwrite
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Validate docx magic bytes (PK)
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    return NextResponse.json({ error: "Invalid docx file" }, { status: 400 });
  }

  try {
    const filename = `reports/${report.id}_${report.year}-${report.month}.docx`;
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const updated = await prisma.report.update({
      where: { id },
      data: { docxUrl: blob.url },
    });

    return NextResponse.json({ docxUrl: updated.docxUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to upload docx:", message, error);
    return NextResponse.json(
      { error: `Failed to upload docx: ${message}` },
      { status: 500 },
    );
  }
}
