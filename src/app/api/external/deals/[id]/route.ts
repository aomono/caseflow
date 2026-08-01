import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/api-token";
import { buildDealPatch } from "@/lib/deal-validation";

export const dynamic = "force-dynamic";

/**
 * 部分更新（C-2）。検証は画面のPATCHと**同じ lib を通す**。
 * 経路ごとに検証を書くと、いつか片方だけ緩い口ができる。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await verifyToken(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const patch = buildDealPatch(body);
    if (!patch.ok) {
      return NextResponse.json({ error: patch.error }, { status: 400 });
    }

    const exists = await prisma.deal.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: patch.data,
      include: { client: true },
    });

    console.log(`[external] ${user.name} PATCH /deals/${id}`);
    return NextResponse.json(deal);
  } catch (error) {
    console.error("Failed to patch deal (external):", error);
    return NextResponse.json({ error: "Failed to patch deal" }, { status: 500 });
  }
}
