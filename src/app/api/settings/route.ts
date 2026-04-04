import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to update settings", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
