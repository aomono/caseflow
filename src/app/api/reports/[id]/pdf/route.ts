import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PUT: upload PDF file
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

  // Validate PDF magic bytes (%PDF)
  if (buffer.length < 4 || buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
    return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 });
  }

  try {
    const filename = `reports/${report.id}_${report.year}-${report.month}.pdf`;
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: "application/pdf",
    });

    const updated = await prisma.report.update({
      where: { id },
      data: {
        pdfUrl: blob.url,
        status: "finalized",
      },
    });

    return NextResponse.json({ pdfUrl: updated.pdfUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to upload PDF:", message, error);
    return NextResponse.json(
      { error: `Failed to upload PDF: ${message}` },
      { status: 500 },
    );
  }
}
