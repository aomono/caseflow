import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const contacts = await prisma.dealContact.findMany({
      where: { dealId: id },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Failed to list contacts:", error);
    return NextResponse.json(
      { error: "Failed to list contacts" },
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
    const { name, role, title, email, phone, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    const contact = await prisma.dealContact.create({
      data: {
        dealId: id,
        name,
        role,
        title,
        email,
        phone,
        notes,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Failed to create contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 },
    );
  }
}
