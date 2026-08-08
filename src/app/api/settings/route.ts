import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 金額の項目。整数で0以上のときだけ更新する（空欄・不正値は無視） */
function numeric(body: Record<string, unknown>, key: string) {
  const v = body?.[key];
  if (v === undefined || v === null || v === "") return {};
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d-]/g, ""));
  if (!Number.isInteger(n) || n < 0) return {};
  return { [key]: n };
}

export async function GET() {
  try {
    let settings = await prisma.appSettings.findFirst();

    if (!settings) {
      settings = await prisma.appSettings.create({
        data: {
          companyName: "My Company",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    let settings = await prisma.appSettings.findFirst();

    if (!settings) {
      settings = await prisma.appSettings.create({
        data: {
          companyName: body.companyName ?? "My Company",
          defaultSlackChannel: body.defaultSlackChannel ?? null,
          defaultEmailTo: body.defaultEmailTo ?? null,
        },
      });
    } else {
      settings = await prisma.appSettings.update({
        where: { id: settings.id },
        data: {
          ...(body.companyName !== undefined && { companyName: body.companyName }),
          ...(body.defaultSlackChannel !== undefined && { defaultSlackChannel: body.defaultSlackChannel }),
          ...(body.defaultEmailTo !== undefined && { defaultEmailTo: body.defaultEmailTo }),
          // 資金繰りの月次既定値と期首繰越（FY月次ビュー）。
          // 数値以外・負値は無視する（画面から空欄で送られても壊さない）
          ...numeric(body, "monthlyPayment"),
          ...numeric(body, "monthlyExecComp"),
          ...numeric(body, "monthlyExpense"),
          ...numeric(body, "openingBalance"),
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to update settings", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
