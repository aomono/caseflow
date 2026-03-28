import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { buildReportDocx } from "@/lib/report-builder";

export const dynamic = "force-dynamic";

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
    // Generate from template
    const reportDate = new Date().toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const buffer = await buildReportDocx({
      clientName: report.deal.client.name,
      dealTitle: report.deal.title,
      reportDate,
      period: report.period,
      workDescriptionItems: report.workDescription.split("\n").filter(Boolean),
      deliverables: ["・成果物は別途納品"],
      nextActions: ["・次期対応は別途協議"],
    });

    // Try to save to blob (non-blocking — download works even if blob fails)
    try {
      const filename = `reports/${report.id}_${report.year}-${report.month}.docx`;
      const blob = await put(filename, buffer, {
        access: "public",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      await prisma.report.update({
        where: { id },
        data: { docxUrl: blob.url },
      });
    } catch {
      // Blob storage may not be configured — continue with direct download
    }

    const clientName = encodeURIComponent(report.deal.client.name);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${clientName}_ASP業務完了報告書_${report.year}-${report.month}.docx"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate docx:", error);
    return NextResponse.json(
      { error: "Failed to generate docx" },
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
}
