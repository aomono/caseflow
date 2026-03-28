import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { buildReportDocx } from "@/lib/report-builder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // 実施業務内容: contractSummaryとworkDescriptionから構成
    const workItems: string[] = ["契約に基づき、以下の業務を完了しました。"];
    const summary = report.deal.contractSummary || report.workDescription;
    if (summary) {
      for (const line of summary.split("\n").filter(Boolean)) {
        workItems.push(line.startsWith("・") ? line : `・${line}`);
      }
    }

    // 成果物: workDescriptionに「成果物」「納品」キーワードがあれば抽出、なければ案件名ベースで生成
    const deliverables: string[] = [];
    const desc = report.deal.description || "";
    for (const line of desc.split("\n").filter(Boolean)) {
      if (line.includes("成果物") || line.includes("納品") || line.includes("資料")) {
        deliverables.push(line.startsWith("・") ? line : `・${line}`);
      }
    }
    if (deliverables.length === 0) {
      deliverables.push("・定例会議資料");
      deliverables.push("・業務報告書");
    }

    const buffer = await buildReportDocx({
      clientName: report.deal.client.name,
      dealTitle: report.deal.title,
      reportDate,
      period,
      workDescriptionItems: workItems,
      deliverables,
      nextActions: ["・次期対応については別途協議"],
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
