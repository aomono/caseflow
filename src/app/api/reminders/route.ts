import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const dealId = searchParams.get("dealId");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (dealId) where.dealId = dealId;
  if (type) where.type = type;

  const reminders = await prisma.reminder.findMany({
    where,
    include: { deal: true },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(reminders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.title || !body.type || !body.dueDate) {
    return NextResponse.json(
      { error: "title, type, and dueDate are required" },
      { status: 400 },
    );
  }

  const reminder = await prisma.reminder.create({
    data: {
      title: body.title,
      type: body.type,
      dueDate: new Date(body.dueDate),
      dealId: body.dealId ?? null,
      reminderDaysBefore: body.reminderDaysBefore ?? 3,
      slackChannel: body.slackChannel ?? null,
      emailTo: body.emailTo ?? null,
    },
  });

  return NextResponse.json(reminder, { status: 201 });
}
