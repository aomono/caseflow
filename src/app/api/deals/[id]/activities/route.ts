import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const activities = await prisma.activity.findMany({
      where: { dealId: id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Failed to list activities:", error);
    return NextResponse.json(
      { error: "Failed to list activities" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, date, summary } = body;

    if (!type || !date || !summary) {
      return NextResponse.json(
        { error: "type, date, and summary are required" },
        { status: 400 },
      );
    }

    const activity = await prisma.activity.create({
      data: {
        dealId: id,
        type,
        date: new Date(date),
        summary,
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("Failed to create activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 },
    );
  }
}
