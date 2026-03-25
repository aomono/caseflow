import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const clients = await prisma.client.findMany({
    include: { _count: { select: { deals: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  const client = await prisma.client.create({
    data: {
      name: body.name.trim(),
      industry: body.industry ?? null,
      referredBy: body.referredBy ?? null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
