import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  report: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET as listReports, POST as createReport } from "@/app/api/reports/route";
import {
  GET as getReport,
  PUT as updateReport,
  DELETE as deleteReport,
} from "@/app/api/reports/[id]/route";

function makeRequest(
  url: string,
  body?: Record<string, unknown>,
): Request {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Reports API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/reports", () => {
    it("should list all reports with deal and client", async () => {
      const mockReports = [
        { id: "1", year: 2026, month: 3, deal: { client: { name: "Acme" } } },
        { id: "2", year: 2026, month: 2, deal: { client: { name: "Globex" } } },
      ];
      mockPrisma.report.findMany.mockResolvedValue(mockReports);

      const response = await listReports(
        makeRequest("http://localhost:3000/api/reports") as never,
      );
      const data = await response.json();

      expect(mockPrisma.report.findMany).toHaveBeenCalledWith({
        where: {},
        include: { deal: { include: { client: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
      expect(data).toEqual(mockReports);
      expect(response.status).toBe(200);
    });

    it("should filter by dealId and status", async () => {
      mockPrisma.report.findMany.mockResolvedValue([]);

      const response = await listReports(
        makeRequest(
          "http://localhost:3000/api/reports?dealId=d1&status=draft",
        ) as never,
      );

      expect(mockPrisma.report.findMany).toHaveBeenCalledWith({
        where: { dealId: "d1", status: "draft" },
        include: { deal: { include: { client: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/reports", () => {
    it("should create a report with required fields", async () => {
      const created = {
        id: "1",
        dealId: "d1",
        year: 2026,
        month: 3,
        period: "2026/03/01-2026/03/31",
        workDescription: "Development work",
        amount: 500000,
        status: "draft",
      };
      mockPrisma.report.upsert.mockResolvedValue(created);

      const request = makeRequest("http://localhost:3000/api/reports", {
        dealId: "d1",
        year: 2026,
        month: 3,
        period: "2026/03/01-2026/03/31",
        workDescription: "Development work",
        amount: 500000,
      });
      const response = await createReport(request as never);
      const data = await response.json();

      expect(mockPrisma.report.upsert).toHaveBeenCalledWith({
        where: {
          dealId_year_month: {
            dealId: "d1",
            year: 2026,
            month: 3,
          },
        },
        update: {
          period: "2026/03/01-2026/03/31",
          workDescription: "Development work",
          amount: 500000,
        },
        create: {
          dealId: "d1",
          year: 2026,
          month: 3,
          period: "2026/03/01-2026/03/31",
          workDescription: "Development work",
          amount: 500000,
          status: "draft",
        },
      });
      expect(data).toEqual(created);
      expect(response.status).toBe(201);
    });

    it("should return 400 if required fields are missing", async () => {
      const request = makeRequest("http://localhost:3000/api/reports", {
        dealId: "d1",
      });
      const response = await createReport(request as never);

      expect(response.status).toBe(400);
      expect(mockPrisma.report.upsert).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/reports/[id]", () => {
    it("should return a report with deal and client", async () => {
      const mockReport = {
        id: "1",
        year: 2026,
        month: 3,
        deal: { client: { name: "Acme" } },
      };
      mockPrisma.report.findUnique.mockResolvedValue(mockReport);

      const response = await getReport(
        new Request("http://localhost") as never,
        makeParams("1"),
      );
      const data = await response.json();

      expect(mockPrisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
        include: { deal: { include: { client: true } } },
      });
      expect(data).toEqual(mockReport);
      expect(response.status).toBe(200);
    });

    it("should return 404 if report not found", async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      const response = await getReport(
        new Request("http://localhost") as never,
        makeParams("nonexistent"),
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Report not found");
    });
  });

  describe("PUT /api/reports/[id]", () => {
    it("should update report fields", async () => {
      const existing = { id: "1", amount: 500000 };
      const updated = { id: "1", amount: 600000 };
      mockPrisma.report.findUnique.mockResolvedValue(existing);
      mockPrisma.report.update.mockResolvedValue(updated);

      const request = new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 600000 }),
      });
      const response = await updateReport(request as never, makeParams("1"));
      const data = await response.json();

      expect(mockPrisma.report.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { amount: 600000 },
      });
      expect(data).toEqual(updated);
      expect(response.status).toBe(200);
    });

    it("should return 404 if report not found", async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      const request = new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 600000 }),
      });
      const response = await updateReport(
        request as never,
        makeParams("nonexistent"),
      );

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/reports/[id]", () => {
    it("should delete a report", async () => {
      mockPrisma.report.findUnique.mockResolvedValue({ id: "1" });
      mockPrisma.report.delete.mockResolvedValue({ id: "1" });

      const response = await deleteReport(
        new Request("http://localhost") as never,
        makeParams("1"),
      );
      const data = await response.json();

      expect(mockPrisma.report.delete).toHaveBeenCalledWith({
        where: { id: "1" },
      });
      expect(data).toEqual({ success: true });
      expect(response.status).toBe(200);
    });

    it("should return 404 if report not found", async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      const response = await deleteReport(
        new Request("http://localhost") as never,
        makeParams("nonexistent"),
      );

      expect(response.status).toBe(404);
    });
  });
});
