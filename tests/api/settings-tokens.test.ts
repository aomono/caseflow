import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  apiToken: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { GET, POST, DELETE } = await import("@/app/api/settings/tokens/route");
const { hashToken } = await import("@/lib/api-token");

function del(id: string) {
  return new Request(`http://localhost/api/settings/tokens?id=${id}`, {
    method: "DELETE",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

function post(body: unknown) {
  return new Request("http://localhost/api/settings/tokens", {
    method: "POST",
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

describe("外部APIトークンの管理", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.apiToken.create.mockResolvedValue({ id: "t1" });
    mockPrisma.apiToken.findMany.mockResolvedValue([]);
    mockPrisma.apiToken.update.mockResolvedValue({ id: "t1" });
  });

  it("発行すると平文を1回だけ返し、DBにはハッシュを保存する", async () => {
    const res = await POST(post({ name: "kioi" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toMatch(/^cf_/);

    const saved = mockPrisma.apiToken.create.mock.calls[0][0].data;
    expect(saved.tokenHash).toBe(hashToken(body.token));
    expect(JSON.stringify(saved)).not.toContain(body.token);
  });

  it("毎回違うトークンになる", async () => {
    const a = await (await POST(post({ name: "a" }))).json();
    const b = await (await POST(post({ name: "b" }))).json();
    expect(a.token).not.toBe(b.token);
  });

  it("名前が無ければ400（誰に出したか分からないトークンを作らない）", async () => {
    const res = await POST(post({ name: "  " }));
    expect(res.status).toBe(400);
    expect(mockPrisma.apiToken.create).not.toHaveBeenCalled();
  });

  it("一覧はハッシュを返さない", async () => {
    await GET();
    const select = mockPrisma.apiToken.findMany.mock.calls[0][0].select;
    expect(select.tokenHash).toBeUndefined();
  });

  it("失効は削除でなく revokedAt を立てる（誰がいつ使ったかを残す）", async () => {
    const res = await DELETE(del("t1"));
    expect(res.status).toBe(200);
    const call = mockPrisma.apiToken.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "t1" });
    expect(call.data.revokedAt).toBeInstanceOf(Date);
  });
});
