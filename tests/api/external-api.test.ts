import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 外部API（C-2）。**認証が全ての入口で効いていること**が要。
 * パスを /api/external/ に分けた代わりに、ここが最後の防波堤になる。
 */

const mockPrisma = vi.hoisted(() => ({
  deal: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  activity: { create: vi.fn() },
  apiToken: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { GET: listDeals } = await import("@/app/api/external/deals/route");
const { PATCH: patchDeal } = await import(
  "@/app/api/external/deals/[id]/route"
);
const { POST: addActivity } = await import(
  "@/app/api/external/deals/[id]/activities/route"
);
const { hashToken } = await import("@/lib/api-token");

const TOKEN = "cf_test_token";
const params = Promise.resolve({ id: "d1" });

function req(url: string, opts: { token?: string; body?: unknown; method?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  return new Request(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

function validToken() {
  mockPrisma.apiToken.findUnique.mockResolvedValue({
    id: "t1",
    name: "kioi",
    tokenHash: hashToken(TOKEN),
    revokedAt: null,
  });
}

describe("認証", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.deal.findMany.mockResolvedValue([]);
    mockPrisma.deal.findUnique.mockResolvedValue({ id: "d1", lastActivityAt: null });
    mockPrisma.deal.update.mockResolvedValue({ id: "d1" });
    mockPrisma.activity.create.mockResolvedValue({ id: "a1" });
  });

  it("トークン無しは全ての入口で401", async () => {
    mockPrisma.apiToken.findUnique.mockResolvedValue(null);
    expect(
      (await listDeals(req("http://localhost/api/external/deals"))).status,
    ).toBe(401);
    expect(
      (
        await patchDeal(
          req("http://localhost/api/external/deals/d1", {
            method: "PATCH",
            body: { status: "active" },
          }),
          { params },
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await addActivity(
          req("http://localhost/api/external/deals/d1/activities", {
            method: "POST",
            body: { summary: "x" },
          }),
          { params },
        )
      ).status,
    ).toBe(401);
    // 認証を通っていないのにDBへ書いていないこと
    expect(mockPrisma.deal.update).not.toHaveBeenCalled();
    expect(mockPrisma.activity.create).not.toHaveBeenCalled();
  });

  it("失効したトークンは通らない", async () => {
    mockPrisma.apiToken.findUnique.mockResolvedValue({
      id: "t1",
      name: "kioi",
      tokenHash: hashToken(TOKEN),
      revokedAt: new Date(),
    });
    const res = await listDeals(
      req("http://localhost/api/external/deals", { token: TOKEN }),
    );
    expect(res.status).toBe(401);
  });

  it("平文は保存しない（照合はハッシュ）", async () => {
    validToken();
    await listDeals(req("http://localhost/api/external/deals", { token: TOKEN }));
    const where = mockPrisma.apiToken.findUnique.mock.calls[0][0].where;
    expect(where.tokenHash).toBe(hashToken(TOKEN));
    expect(JSON.stringify(where)).not.toContain(TOKEN);
  });

  it("使用時刻を記録する（誰がどれだけ使ったかを追う）", async () => {
    validToken();
    await listDeals(req("http://localhost/api/external/deals", { token: TOKEN }));
    expect(mockPrisma.apiToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1" } }),
    );
  });
});

describe("GET /api/external/deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validToken();
    mockPrisma.deal.findMany.mockResolvedValue([
      {
        id: "d1",
        title: "動いている",
        status: "discussion",
        lastActivityAt: new Date(Date.now() - 2 * 86_400_000),
        client: { id: "c1", name: "A社" },
      },
      {
        id: "d2",
        title: "放置",
        status: "lead",
        lastActivityAt: new Date(Date.now() - 30 * 86_400_000),
        client: { id: "c2", name: "B社" },
      },
      {
        id: "d3",
        title: "未接触",
        status: "lead",
        lastActivityAt: null,
        client: { id: "c3", name: "C社" },
      },
    ]);
  });

  it("stale=14 で放置案件だけ返す（未接触も含む）", async () => {
    const res = await listDeals(
      req("http://localhost/api/external/deals?stale=14", { token: TOKEN }),
    );
    const body = await res.json();
    const ids = body.deals.map((d: { id: string }) => d.id);
    expect(ids).toContain("d2");
    expect(ids).toContain("d3");
    expect(ids).not.toContain("d1");
  });

  it("stale が不正なら400", async () => {
    const res = await listDeals(
      req("http://localhost/api/external/deals?stale=abc", { token: TOKEN }),
    );
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/external/deals/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validToken();
    mockPrisma.deal.findUnique.mockResolvedValue({ id: "d1" });
    mockPrisma.deal.update.mockResolvedValue({ id: "d1" });
  });

  it("画面と同じ検証を通る（許可外の列は書けない）", async () => {
    await patchDeal(
      req("http://localhost/api/external/deals/d1", {
        token: TOKEN,
        method: "PATCH",
        body: { status: "active", monthlyAmount: 999_999 },
      }),
      { params },
    );
    const data = mockPrisma.deal.update.mock.calls[0][0].data;
    expect(data.status).toBe("active");
    expect(data).not.toHaveProperty("monthlyAmount");
  });

  it("不正な値は400（DBに触らない）", async () => {
    const res = await patchDeal(
      req("http://localhost/api/external/deals/d1", {
        token: TOKEN,
        method: "PATCH",
        body: { status: "unknown" },
      }),
      { params },
    );
    expect(res.status).toBe(400);
    expect(mockPrisma.deal.update).not.toHaveBeenCalled();
  });

  it("存在しない案件は404", async () => {
    mockPrisma.deal.findUnique.mockResolvedValue(null);
    const res = await patchDeal(
      req("http://localhost/api/external/deals/ghost", {
        token: TOKEN,
        method: "PATCH",
        body: { status: "active" },
      }),
      { params },
    );
    expect(res.status).toBe(404);
    expect(mockPrisma.deal.update).not.toHaveBeenCalled();
  });
});

describe("POST /api/external/deals/:id/activities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validToken();
    mockPrisma.activity.create.mockResolvedValue({ id: "a1" });
    mockPrisma.deal.update.mockResolvedValue({ id: "d1" });
  });

  it("ログを追記し、接触日を進める", async () => {
    mockPrisma.deal.findUnique.mockResolvedValue({
      id: "d1",
      lastActivityAt: new Date("2026-07-01"),
    });
    const res = await addActivity(
      req("http://localhost/api/external/deals/d1/activities", {
        token: TOKEN,
        method: "POST",
        body: { summary: "電話で確認", type: "phone", date: "2026-08-01" },
      }),
      { params },
    );
    expect(res.status).toBe(201);
    expect(mockPrisma.deal.update).toHaveBeenCalled();
  });

  it("過去の記録は遡って上書きしない（画面側と同じ規則）", async () => {
    mockPrisma.deal.findUnique.mockResolvedValue({
      id: "d1",
      lastActivityAt: new Date("2026-08-01"),
    });
    await addActivity(
      req("http://localhost/api/external/deals/d1/activities", {
        token: TOKEN,
        method: "POST",
        body: { summary: "先月の記録", date: "2026-07-01" },
      }),
      { params },
    );
    expect(mockPrisma.deal.update).not.toHaveBeenCalled();
  });

  it("summary が空・種別が不正なら400", async () => {
    mockPrisma.deal.findUnique.mockResolvedValue({ id: "d1", lastActivityAt: null });
    for (const body of [{ summary: "  " }, { summary: "x", type: "unknown" }]) {
      const res = await addActivity(
        req("http://localhost/api/external/deals/d1/activities", {
          token: TOKEN,
          method: "POST",
          body,
        }),
        { params },
      );
      expect(res.status).toBe(400);
    }
    expect(mockPrisma.activity.create).not.toHaveBeenCalled();
  });
});
