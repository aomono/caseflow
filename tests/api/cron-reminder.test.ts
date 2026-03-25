import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  deal: {
    findMany: vi.fn(),
  },
  invoice: {
    updateMany: vi.fn(),
  },
  reminder: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  notificationLog: {
    create: vi.fn(),
  },
  appSettings: {
    findFirst: vi.fn(),
  },
}));

const mockSlack = vi.hoisted(() => ({
  sendSlackMessage: vi.fn(),
}));

const mockEmail = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/slack", () => mockSlack);

vi.mock("@/lib/email", () => mockEmail);

import { GET } from "@/app/api/cron/reminder/route";

function makeRequest(secret?: string): Request {
  const headers: Record<string, string> = {};
  if (secret) {
    headers["authorization"] = `Bearer ${secret}`;
  }
  return new Request("http://localhost:3000/api/cron/reminder", {
    method: "GET",
    headers,
  });
}

describe("Cron Reminder API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-secret");
    mockPrisma.deal.findMany.mockResolvedValue([]);
    mockPrisma.invoice.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.reminder.findMany.mockResolvedValue([]);
    mockPrisma.appSettings.findFirst.mockResolvedValue(null);
  });

  it("should return 401 without valid authorization", async () => {
    const response = await GET(makeRequest() as never);
    expect(response.status).toBe(401);
  });

  it("should return 401 with wrong secret", async () => {
    const response = await GET(makeRequest("wrong-secret") as never);
    expect(response.status).toBe(401);
  });

  it("should return 200 with valid auth and empty results", async () => {
    const response = await GET(makeRequest("test-secret") as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ sent: 0, renewalsCreated: 0, overdueMarked: 0 });
  });

  it("should create renewal reminders for approaching deals", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 15);

    mockPrisma.deal.findMany.mockResolvedValue([
      {
        id: "deal-1",
        title: "Test Deal",
        status: "active",
        contractEndDate: endDate,
        renewalReminderDays: 30,
      },
    ]);
    mockPrisma.reminder.create.mockResolvedValue({ id: "rem-1" });

    const response = await GET(makeRequest("test-secret") as never);
    const data = await response.json();

    expect(mockPrisma.reminder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dealId: "deal-1",
        type: "renewal",
        status: "pending",
      }),
    });
    expect(data.renewalsCreated).toBe(1);
  });

  it("should skip renewal if reminder already exists (unique constraint)", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 5);

    mockPrisma.deal.findMany.mockResolvedValue([
      {
        id: "deal-1",
        title: "Test Deal",
        status: "active",
        contractEndDate: endDate,
        renewalReminderDays: 30,
      },
    ]);
    mockPrisma.reminder.create.mockRejectedValue(new Error("Unique constraint"));

    const response = await GET(makeRequest("test-secret") as never);
    const data = await response.json();

    expect(data.renewalsCreated).toBe(0);
  });

  it("should mark overdue invoices", async () => {
    mockPrisma.invoice.updateMany.mockResolvedValue({ count: 3 });

    const response = await GET(makeRequest("test-secret") as never);
    const data = await response.json();

    expect(mockPrisma.invoice.updateMany).toHaveBeenCalledWith({
      where: {
        status: "sent",
        dueDate: { lt: expect.any(Date) },
      },
      data: { status: "overdue" },
    });
    expect(data.overdueMarked).toBe(3);
  });

  it("should send notifications for reminders in window", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    mockPrisma.reminder.findMany.mockResolvedValue([
      {
        id: "rem-1",
        title: "Payment due",
        type: "payment",
        dueDate: today,
        reminderDaysBefore: 3,
        slackChannel: "#billing",
        emailTo: null,
        status: "pending",
        deal: { title: "Deal A" },
      },
    ]);
    mockSlack.sendSlackMessage.mockResolvedValue(undefined);

    const response = await GET(makeRequest("test-secret") as never);
    const data = await response.json();

    expect(mockSlack.sendSlackMessage).toHaveBeenCalledWith(
      "#billing",
      expect.stringContaining("Payment due"),
    );
    expect(mockPrisma.notificationLog.create).toHaveBeenCalled();
    expect(mockPrisma.reminder.update).toHaveBeenCalledWith({
      where: { id: "rem-1" },
      data: { status: "reminded" },
    });
    expect(data.sent).toBe(1);
  });

  it("should use default settings when reminder has no channel", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    mockPrisma.reminder.findMany.mockResolvedValue([
      {
        id: "rem-1",
        title: "Report reminder",
        type: "report",
        dueDate: today,
        reminderDaysBefore: 3,
        slackChannel: null,
        emailTo: null,
        status: "pending",
        deal: null,
      },
    ]);
    mockPrisma.appSettings.findFirst.mockResolvedValue({
      defaultSlackChannel: "#general",
      defaultEmailTo: "admin@example.com",
    });
    mockSlack.sendSlackMessage.mockResolvedValue(undefined);
    mockEmail.sendEmail.mockResolvedValue(undefined);

    const response = await GET(makeRequest("test-secret") as never);
    const data = await response.json();

    expect(mockSlack.sendSlackMessage).toHaveBeenCalledWith(
      "#general",
      expect.any(String),
    );
    expect(mockEmail.sendEmail).toHaveBeenCalledWith(
      "admin@example.com",
      expect.any(String),
      expect.any(String),
    );
    expect(data.sent).toBe(1);
  });
});
