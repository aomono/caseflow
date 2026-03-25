import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  let settings = await prisma.appSettings.findFirst();

  if (!settings) {
    settings = await prisma.appSettings.create({
      data: {
        companyName: "My Company",
      },
    });
  }

  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
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
}
