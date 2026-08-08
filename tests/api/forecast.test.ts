import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  appSettings: { findFirst: vi.fn() },
  deal: { findMany: vi.fn(), findUnique: vi.fn() },
  invoice: { findMany: vi.fn(), findFirst: vi.fn() },
  monthlyCostOverride: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  plannedRevenueOverride: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { GET } = await import("@/app/api/forecast/route");
const { PUT, DELETE } = await import("@/app/api/forecast/overrides/route");

function req(url: string, opts: { method?: string; body?: unknown } = {}) {
  return new Request(url, {
    method: opts.method ?? "GET",
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

describe("GET /api/forecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.appSettings.findFirst.mockResolvedValue({
      revenueCutoverDate: new Date("2026-06-01"),
      probabilityHighRate: 0.8,
      probabilityMidRate: 0.5,
      probabilityLowRate: 0.2,
      monthlyPayment: 1_000_000,
      monthlyExecComp: 2_000_000,
      monthlyExpense: 500_000,
      openingBalance: 5_000_000,
    });
    mockPrisma.deal.findMany.mockResolvedValue([]);
    mockPrisma.invoice.findMany.mockResolvedValue([]);
    mockPrisma.monthlyCostOverride.findMany.mockResolvedValue([]);
    mockPrisma.plannedRevenueOverride.findMany.mockResolvedValue([]);
  });

  it("FYの12ヶ月と資金繰りを返す", async () => {
    const res = await GET(req("http://localhost/api/forecast?fy=2026"));
    const body = await res.json();
    expect(body.fy).toBe(2026);
    expect(body.matrix.months).toHaveLength(12);
    expect(body.cashflow).toHaveLength(12);
    // 売上0・固定費350万/月・繰越500万 → 初月は150万
    expect(body.cashflow[0].balance).toBe(1_500_000);
  });

  it("終了・失注の案件も取得対象にする（Invoiceの実績を消さない）", async () => {
    await GET(req("http://localhost/api/forecast"));
    const args = mockPrisma.deal.findMany.mock.calls[0][0];
    expect(args.where).toBeUndefined();
  });

  it("上書きが資金繰りに反映される", async () => {
    mockPrisma.monthlyCostOverride.findMany.mockResolvedValue([
      { year: 2026, month: 7, category: "execComp", amount: 0 },
    ]);
    const body = await (await GET(req("http://localhost/api/forecast?fy=2026"))).json();
    expect(body.cashflow[0].execComp).toBe(2_000_000);
    expect(body.cashflow[1].execComp).toBe(0);
    expect(body.cashflow[1].overridden).toEqual(["execComp"]);
  });

  it("weighted=1 で加重見込みになる", async () => {
    const body = await (
      await GET(req("http://localhost/api/forecast?weighted=1"))
    ).json();
    expect(body.weighted).toBe(true);
  });

  it("fy が不正なら400", async () => {
    const res = await GET(req("http://localhost/api/forecast?fy=abc"));
    expect(res.status).toBe(400);
  });
});

describe("費用セルの上書き", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.monthlyCostOverride.upsert.mockResolvedValue({ id: "o1" });
    mockPrisma.monthlyCostOverride.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("保存できる", async () => {
    const res = await PUT(
      req("http://localhost/api/forecast/overrides", {
        method: "PUT",
        body: { month: "2026-07", category: "execComp", amount: 0 },
      }),
    );
    expect(res.status).toBe(200);
    const call = mockPrisma.monthlyCostOverride.upsert.mock.calls[0][0];
    expect(call.create).toEqual({
      year: 2026,
      month: 7,
      category: "execComp",
      amount: 0,
    });
  });

  it("0円の上書きと「既定値に戻す」は別物", async () => {
    // 0で上書き＝今月は払わない。削除＝既定値に従う。混ぜると意味が壊れる
    await PUT(
      req("http://localhost/api/forecast/overrides", {
        method: "PUT",
        body: { month: "2026-07", category: "payment", amount: 0 },
      }),
    );
    expect(mockPrisma.monthlyCostOverride.upsert).toHaveBeenCalled();
    expect(mockPrisma.monthlyCostOverride.deleteMany).not.toHaveBeenCalled();

    await DELETE(
      req("http://localhost/api/forecast/overrides?month=2026-07&category=payment", {
        method: "DELETE",
      }),
    );
    expect(mockPrisma.monthlyCostOverride.deleteMany).toHaveBeenCalled();
  });

  it("不正な値は400（DBに触らない）", async () => {
    for (const body of [
      { month: "2026-7", category: "payment", amount: 100 },
      { month: "2026-07", category: "unknown", amount: 100 },
      { month: "2026-07", category: "payment", amount: -1 },
      { month: "2026-07", category: "payment", amount: 1.5 },
    ]) {
      const res = await PUT(
        req("http://localhost/api/forecast/overrides", { method: "PUT", body }),
      );
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(mockPrisma.monthlyCostOverride.upsert).not.toHaveBeenCalled();
  });
});

describe("月別計画値の上書き（Phase D）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.deal.findUnique.mockResolvedValue({ id: "d1" });
    mockPrisma.invoice.findFirst.mockResolvedValue(null);
    mockPrisma.plannedRevenueOverride.upsert.mockResolvedValue({ id: "p1" });
    mockPrisma.plannedRevenueOverride.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("将来月の計画値を保存できる", async () => {
    const { PUT } = await import("@/app/api/forecast/planned/route");
    const res = await PUT(
      req("http://localhost/api/forecast/planned", {
        method: "PUT",
        body: { dealId: "d1", month: "2026-09", amount: 5_500_000 },
      }),
    );
    expect(res.status).toBe(200);
    const call = mockPrisma.plannedRevenueOverride.upsert.mock.calls[0][0];
    expect(call.create).toEqual({
      dealId: "d1",
      year: 2026,
      month: 9,
      amount: 5_500_000,
    });
  });

  it("請求済みの月は409で拒否する（実績は請求が正）", async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({ id: "inv1" });
    const { PUT } = await import("@/app/api/forecast/planned/route");
    const res = await PUT(
      req("http://localhost/api/forecast/planned", {
        method: "PUT",
        body: { dealId: "d1", month: "2026-06", amount: 1 },
      }),
    );
    expect(res.status).toBe(409);
    expect(mockPrisma.plannedRevenueOverride.upsert).not.toHaveBeenCalled();
  });

  it("存在しない案件は404", async () => {
    mockPrisma.deal.findUnique.mockResolvedValue(null);
    const { PUT } = await import("@/app/api/forecast/planned/route");
    const res = await PUT(
      req("http://localhost/api/forecast/planned", {
        method: "PUT",
        body: { dealId: "ghost", month: "2026-09", amount: 1 },
      }),
    );
    expect(res.status).toBe(404);
  });

  it("不正な値は400（DBに触らない）", async () => {
    const { PUT } = await import("@/app/api/forecast/planned/route");
    for (const body of [
      { dealId: "", month: "2026-09", amount: 1 },
      { dealId: "d1", month: "2026-9", amount: 1 },
      { dealId: "d1", month: "2026-09", amount: -1 },
      { dealId: "d1", month: "2026-09", amount: 1.5 },
    ]) {
      const res = await PUT(
        req("http://localhost/api/forecast/planned", { method: "PUT", body }),
      );
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(mockPrisma.plannedRevenueOverride.upsert).not.toHaveBeenCalled();
  });

  it("削除で契約ベースに戻せる", async () => {
    const { DELETE: del } = await import("@/app/api/forecast/planned/route");
    const res = await del(
      req("http://localhost/api/forecast/planned?dealId=d1&month=2026-09", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.plannedRevenueOverride.deleteMany).toHaveBeenCalledWith({
      where: { dealId: "d1", year: 2026, month: 9 },
    });
  });
});
