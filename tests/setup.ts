import { vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(() => ({
    user: { id: "test-user", email: "test@example.com", name: "Test User" },
  })),
}));
