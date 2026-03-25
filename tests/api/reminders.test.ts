import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  reminder: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET as listReminders, POST as createReminder } from "@/app/api/reminders/route";
import {
  GET as getReminder,
  PUT as updateReminder,
  DELETE as deleteReminder,
} from "@/app/api/reminders/[id]/route";

function makeRequest(url: string, body?: Record<string, unknown>): Request {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Reminders API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/reminders", () => {
    it("should list reminders ordered by dueDate", async () => {
      const mockReminders = [
        { id: "1", title: "Payment due", type: "payment", status: "pending", deal: null },
        { id: "2", title: "Renewal", type: "renewal", status: "pending", deal: { id: "d1" } },
      ];
      mockPrisma.reminder.findMany.mockResolvedValue(mockReminders);

      const response = await listReminders(
        makeRequest("http://localhost:3000/api/reminders") as never,
      );
      const data = await response.json();

      expect(mockPrisma.reminder.findMany).toHaveBeenCalledWith({
        where: {},
        include: { deal: true },
        orderBy: { dueDate: "asc" },
      });
      expect(data).toEqual(mockReminders);
      expect(response.status).toBe(200);
    });

    it("should filter by status query param", async () => {
      mockPrisma.reminder.findMany.mockResolvedValue([]);

      await listReminders(
        makeRequest("http://localhost:3000/api/reminders?status=completed") as never,
      );

      expect(mockPrisma.reminder.findMany).toHaveBeenCalledWith({
        where: { status: "completed" },
        include: { deal: true },
        orderBy: { dueDate: "asc" },
      });
    });
  });

  describe("POST /api/reminders", () => {
    it("should create a reminder with required fields", async () => {
      const created = {
        id: "1",
        title: "Invoice reminder",
        type: "invoice",
        dueDate: "2026-04-01T00:00:00.000Z",
        status: "pending",
      };
      mockPrisma.reminder.create.mockResolvedValue(created);

      const request = makeRequest("http://localhost:3000/api/reminders", {
        title: "Invoice reminder",
        type: "invoice",
        dueDate: "2026-04-01",
      });
      const response = await createReminder(request as never);
      const data = await response.json();

      expect(mockPrisma.reminder.create).toHaveBeenCalledWith({
        data: {
          title: "Invoice reminder",
          type: "invoice",
          dueDate: new Date("2026-04-01"),
          dealId: null,
          reminderDaysBefore: 3,
          slackChannel: null,
          emailTo: null,
        },
      });
      expect(data).toEqual(created);
      expect(response.status).toBe(201);
    });

    it("should return 400 if required fields are missing", async () => {
      const request = makeRequest("http://localhost:3000/api/reminders", {
        title: "Missing type",
      });
      const response = await createReminder(request as never);

      expect(response.status).toBe(400);
      expect(mockPrisma.reminder.create).not.toHaveBeenCalled();
    });
  });

  describe("PUT /api/reminders/[id]", () => {
    it("should update reminder status to completed", async () => {
      const existing = { id: "1", title: "Test", status: "pending" };
      const updated = { id: "1", title: "Test", status: "completed" };
      mockPrisma.reminder.findUnique.mockResolvedValue(existing);
      mockPrisma.reminder.update.mockResolvedValue(updated);

      const request = new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const response = await updateReminder(request as never, makeParams("1"));
      const data = await response.json();

      expect(mockPrisma.reminder.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { status: "completed" },
      });
      expect(data).toEqual(updated);
      expect(response.status).toBe(200);
    });

    it("should return 404 if reminder not found", async () => {
      mockPrisma.reminder.findUnique.mockResolvedValue(null);

      const request = new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const response = await updateReminder(request as never, makeParams("nonexistent"));

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/reminders/[id]", () => {
    it("should delete a reminder", async () => {
      mockPrisma.reminder.findUnique.mockResolvedValue({ id: "1", title: "Test" });
      mockPrisma.reminder.delete.mockResolvedValue({ id: "1" });

      const response = await deleteReminder(
        new Request("http://localhost") as never,
        makeParams("1"),
      );
      const data = await response.json();

      expect(mockPrisma.reminder.delete).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(data).toEqual({ success: true });
      expect(response.status).toBe(200);
    });

    it("should return 404 if reminder not found", async () => {
      mockPrisma.reminder.findUnique.mockResolvedValue(null);

      const response = await deleteReminder(
        new Request("http://localhost") as never,
        makeParams("nonexistent"),
      );

      expect(response.status).toBe(404);
    });
  });
});
