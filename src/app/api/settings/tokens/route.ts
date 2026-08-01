import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueToken, revokeToken } from "@/lib/api-token";

export const dynamic = "force-dynamic";

/**
 * 外部APIトークンの管理（C-2）。
 *
 * このパスは middleware の NextAuth に守られている＝**社内の人だけが発行できる**。
 * 発行した平文は**この応答でしか返らない**（DBにはハッシュしか無い）ので、
 * 画面側で一度だけ見せる。
 */

export async function GET() {
  try {
    const tokens = await prisma.apiToken.findMany({
      // tokenHash は返さない。画面に出す必要がなく、出せば漏れる面が増える
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tokens);
  } catch (error) {
    console.error("Failed to list tokens:", error);
    return NextResponse.json({ error: "Failed to list tokens" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const token = await issueToken(name);
    // 平文を返すのはここだけ。再表示はできない
    return NextResponse.json({ name, token }, { status: 201 });
  } catch (error) {
    console.error("Failed to issue token:", error);
    return NextResponse.json({ error: "Failed to issue token" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await revokeToken(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to revoke token:", error);
    return NextResponse.json({ error: "Failed to revoke token" }, { status: 500 });
  }
}
