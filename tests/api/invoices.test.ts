import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  invoice: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  deal: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET as listInvoices, POST as createInvoice } from "@/app/api/invoices/route";
import {
  PUT as updateInvoice,
} from "@/app/api/invoices/[id]/route";
import { POST as generateMonthly } from "@/app/api/invoices/generate-monthly/route";

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

describe("Invoices API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/invoices", () => {
    it("should list invoices with deal and client included", async () => {
      const mockInvoices = [
        {
          id: "inv-1",
          dealId: "deal-1",
          year: 2026,
          month: 3,
          amount: 100000,
          status: "draft",
          deal: { id: "deal-1", title: "Web Dev", client: { id: "c-1", name: "Acme" } },
        },
      ];
      mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices);

      const request = makeRequest("http://localhost:3000/api/invoices?status=draft&year=2026");
      const response = await listInvoices(request as never);
      const data = await response.json();

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { status: "draft", year: 2026 },
        include: { deal: { include: { client: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
      expect(data).toEqual(mockInvoices);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/invoices", () => {
    it("should create an invoice with required fields", async () => {
      const created = {
        id: "inv-1",
        dealId: "deal-1",
        year: 2026,
        month: 3,
        amount: 100000,
        dueDate: "2026-03-31T00:00:00.000Z",
        status: "draft",
      };
      mockPrisma.invoice.create.mockResolvedValue(created);

      const request = makeRequest("http://localhost:3000/api/invoices", {
        dealId: "deal-1",
        year: 2026,
        month: 3,
        amount: 100000,
        dueDate: "2026-03-31",
      });
      const response = await createInvoice(request as never);
      const data = await response.json();

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
        data: {
          dealId: "deal-1",
          year: 2026,
          month: 3,
          amount: 100000,
          dueDate: new Date("2026-03-31"),
          invoiceDate: null,
          status: "draft",
        },
      });
      expect(data).toEqual(created);
      expect(response.status).toBe(201);
    });

    it("should return 400 if required fields are missing", async () => {
      const request = makeRequest("http://localhost:3000/api/invoices", {
        dealId: "deal-1",
      });
      const response = await createInvoice(request as never);

      expect(response.status).toBe(400);
      expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    });
  });

  describe("PUT /api/invoices/[id]", () => {
    it("should update status to paid with paidAt", async () => {
      const existing = { id: "inv-1", status: "sent", paidAt: null };
      const updated = { id: "inv-1", status: "paid", paidAt: "2026-03-25T00:00:00.000Z" };
      mockPrisma.invoice.findUnique.mockResolvedValue(existing);
      mockPrisma.invoice.update.mockResolvedValue(updated);

      const request = new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paidAt: "2026-03-25" }),
      });
      const response = await updateInvoice(request as never, makeParams("inv-1"));
      const data = await response.json();

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: {
          status: "paid",
          paidAt: new Date("2026-03-25"),
        },
      });
      expect(data).toEqual(updated);
      expect(response.status).toBe(200);
    });

    it("should return 404 if invoice not found", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      const request = new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      const response = await updateInvoice(request as never, makeParams("nonexistent"));

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/invoices/generate-monthly", () => {
    it("should bulk generate draft invoices for active deals", async () => {
      const activeDeals = [
        { id: "deal-1", monthlyAmount: 100000 },
        { id: "deal-2", monthlyAmount: 200000 },
        { id: "deal-3", monthlyAmount: 150000 },
      ];
      // deal-2 already has an invoice for this month
      const existingInvoices = [{ dealId: "deal-2" }];

      mockPrisma.deal.findMany.mockResolvedValue(activeDeals);
      mockPrisma.invoice.findMany.mockResolvedValue(existingInvoices);
      mockPrisma.invoice.create.mockResolvedValue({});

      const request = makeRequest("http://localhost:3000/api/invoices/generate-monthly", {
        year: 2026,
        month: 3,
      });
      const response = await generateMonthly(request as never);
      const data = await response.json();

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith({
        where: { status: "active", monthlyAmount: { not: null } },
      });
      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { year: 2026, month: 3 },
        select: { dealId: true },
      });
      // Should create 2 invoices (deal-1 and deal-3, skipping deal-2)
      expect(mockPrisma.invoice.create).toHaveBeenCalledTimes(2);
      expect(data.createdCount).toBe(2);
      expect(response.status).toBe(201);
    });

    it("should return 400 if year or month is missing", async () => {
      const request = makeRequest("http://localhost:3000/api/invoices/generate-monthly", {
        year: 2026,
      });
      const response = await generateMonthly(request as never);

      expect(response.status).toBe(400);
    });
  });
});
