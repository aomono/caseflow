import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (clientId) {
      where.clientId = clientId;
    }

    const deals = await prisma.deal.findMany({
      where,
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(deals);
  } catch (error) {
    console.error("Failed to list deals:", error);
    return NextResponse.json(
      { error: "Failed to list deals" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, title, ...rest } = body;

    if (!clientId || !title) {
      return NextResponse.json(
        { error: "clientId and title are required" },
        { status: 400 },
      );
    }

    const deal = await prisma.deal.create({
      data: {
        clientId,
        title,
        status: rest.status ?? "lead",
        ...rest,
      },
      include: { client: true },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error("Failed to create deal:", error);
    return NextResponse.json(
      { error: "Failed to create deal" },
      { status: 500 },
    );
  }
}
