import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDeal = {
  id: "deal-1",
  clientId: "client-1",
  title: "Test Deal",
  status: "lead",
  monthlyAmount: null,
  contractStartDate: null,
  contractEndDate: null,
  renewalReminderDays: 30,
  description: null,
  contractSummary: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  client: { id: "client-1", name: "Test Client" },
};

const mockPrisma = vi.hoisted(() => ({
  deal: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  dealContact: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  activity: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("Deals API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/deals", () => {
    it("should list all deals", async () => {
      mockPrisma.deal.findMany.mockResolvedValue([mockDeal]);

      const { GET } = await import("@/app/api/deals/route");
      const request = new Request("http://localhost/api/deals");
      const response = await GET(request as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Test Deal");
      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith({
        where: {},
        include: { client: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter deals by status", async () => {
      mockPrisma.deal.findMany.mockResolvedValue([mockDeal]);

      const { GET } = await import("@/app/api/deals/route");
      const request = new Request("http://localhost/api/deals?status=lead");
      const response = await GET(request as never);

      expect(response.status).toBe(200);
      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith({
        where: { status: "lead" },
        include: { client: true },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("POST /api/deals", () => {
    it("should create a deal", async () => {
      mockPrisma.deal.create.mockResolvedValue(mockDeal);

      const { POST } = await import("@/app/api/deals/route");
      const request = new Request("http://localhost/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "client-1", title: "Test Deal" }),
      });
      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("Test Deal");
      expect(mockPrisma.deal.create).toHaveBeenCalledWith({
        data: { clientId: "client-1", title: "Test Deal", status: "lead" },
        include: { client: true },
      });
    });

    it("should return 400 when clientId or title is missing", async () => {
      const { POST } = await import("@/app/api/deals/route");
      const request = new Request("http://localhost/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "client-1" }),
      });
      const response = await POST(request as never);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/deals/[id]", () => {
    it("should get deal by id with relations", async () => {
      const dealWithRelations = {
        ...mockDeal,
        contacts: [],
        activities: [],
        invoices: [],
        reports: [],
        reminders: [],
      };
      mockPrisma.deal.findUnique.mockResolvedValue(dealWithRelations);

      const { GET } = await import("@/app/api/deals/[id]/route");
      const request = new Request("http://localhost/api/deals/deal-1");
      const response = await GET(request as never, {
        params: Promise.resolve({ id: "deal-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Test Deal");
      expect(mockPrisma.deal.findUnique).toHaveBeenCalledWith({
        where: { id: "deal-1" },
        include: {
          client: true,
          contacts: true,
          activities: { orderBy: { date: "desc" }, take: 10 },
          invoices: true,
          reports: true,
          reminders: true,
        },
      });
    });

    it("should return 404 when deal not found", async () => {
      mockPrisma.deal.findUnique.mockResolvedValue(null);

      const { GET } = await import("@/app/api/deals/[id]/route");
      const request = new Request("http://localhost/api/deals/nonexistent");
      const response = await GET(request as never, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/deals/[id]", () => {
    it("should update deal status", async () => {
      const updatedDeal = { ...mockDeal, status: "active" };
      mockPrisma.deal.update.mockResolvedValue(updatedDeal);

      const { PUT } = await import("@/app/api/deals/[id]/route");
      const request = new Request("http://localhost/api/deals/deal-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const response = await PUT(request as never, {
        params: Promise.resolve({ id: "deal-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("active");
      expect(mockPrisma.deal.update).toHaveBeenCalledWith({
        where: { id: "deal-1" },
        data: { status: "active" },
        include: { client: true },
      });
    });
  });

  describe("DELETE /api/deals/[id]", () => {
    it("should delete a deal", async () => {
      mockPrisma.deal.delete.mockResolvedValue(mockDeal);

      const { DELETE } = await import("@/app/api/deals/[id]/route");
      const request = new Request("http://localhost/api/deals/deal-1", {
        method: "DELETE",
      });
      const response = await DELETE(request as never, {
        params: Promise.resolve({ id: "deal-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.deal.delete).toHaveBeenCalledWith({
        where: { id: "deal-1" },
      });
    });
  });
});
