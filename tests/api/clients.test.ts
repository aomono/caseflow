import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  client: {
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

import { GET as listClients, POST as createClient } from "@/app/api/clients/route";
import {
  GET as getClient,
  PUT as updateClient,
  DELETE as deleteClient,
} from "@/app/api/clients/[id]/route";

function makeRequest(body?: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/clients", {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Clients API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/clients", () => {
    it("should list all clients with deal count", async () => {
      const mockClients = [
        { id: "1", name: "Acme Corp", _count: { deals: 3 } },
        { id: "2", name: "Globex", _count: { deals: 1 } },
      ];
      mockPrisma.client.findMany.mockResolvedValue(mockClients);

      const response = await listClients();
      const data = await response.json();

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
        include: { _count: { select: { deals: true } } },
        orderBy: { createdAt: "desc" },
      });
      expect(data).toEqual(mockClients);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/clients", () => {
    it("should create a client with required name", async () => {
      const created = { id: "1", name: "New Client", industry: null, referredBy: null, notes: null };
      mockPrisma.client.create.mockResolvedValue(created);

      const request = makeRequest({ name: "New Client" });
      const response = await createClient(request as never);
      const data = await response.json();

      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: { name: "New Client", industry: null, referredBy: null, notes: null },
      });
      expect(data).toEqual(created);
      expect(response.status).toBe(201);
    });

    it("should return 400 if name is missing", async () => {
      const request = makeRequest({});
      const response = await createClient(request as never);

      expect(response.status).toBe(400);
      expect(mockPrisma.client.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/clients/[id]", () => {
    it("should return a client with deals", async () => {
      const mockClient = { id: "1", name: "Acme Corp", deals: [] };
      mockPrisma.client.findUnique.mockResolvedValue(mockClient);

      const response = await getClient(new Request("http://localhost") as never, makeParams("1"));
      const data = await response.json();

      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
        include: { deals: true },
      });
      expect(data).toEqual(mockClient);
      expect(response.status).toBe(200);
    });

    it("should return 404 if client not found", async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null);

      const response = await getClient(new Request("http://localhost") as never, makeParams("nonexistent"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Client not found");
    });
  });

  describe("PUT /api/clients/[id]", () => {
    it("should update client fields", async () => {
      const existing = { id: "1", name: "Old Name" };
      const updated = { id: "1", name: "New Name" };
      mockPrisma.client.findUnique.mockResolvedValue(existing);
      mockPrisma.client.update.mockResolvedValue(updated);

      const request = new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      });
      const response = await updateClient(request as never, makeParams("1"));
      const data = await response.json();

      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { name: "New Name" },
      });
      expect(data).toEqual(updated);
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/clients/[id]", () => {
    it("should delete a client", async () => {
      mockPrisma.client.findUnique.mockResolvedValue({ id: "1", name: "Acme" });
      mockPrisma.client.delete.mockResolvedValue({ id: "1" });

      const response = await deleteClient(new Request("http://localhost") as never, makeParams("1"));
      const data = await response.json();

      expect(mockPrisma.client.delete).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(data).toEqual({ success: true });
      expect(response.status).toBe(200);
    });
  });
});
