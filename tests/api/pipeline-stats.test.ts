import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  appSettings: { findFirst: vi.fn() },
  deal: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { GET } = await import("@/app/api/dashboard/pipeline/route");

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

const DEALS = [
  {
    id: "d1",
    title: "商談A",
    status: "discussion",
    monthlyAmount: 1_000_000,
    probability: "high",
    source: "NTTD",
    nextAction: "見積書を送る",
    nextActionDate: daysAgo(3), // 期限超過
    lastActivityAt: daysAgo(2),
    client: { id: "c1", name: "クライアントA" },
  },
  {
    id: "d2",
    title: "商談B",
    status: "expected",
    monthlyAmount: 1_000_000,
    probability: "low",
    source: "BCG",
    nextAction: null,
    nextActionDate: null,
    lastActivityAt: daysAgo(30), // 放置
    client: { id: "c2", name: "クライアントB" },
  },
  {
    id: "d3",
    title: "商談C",
    status: "lead",
    monthlyAmount: 500_000,
    probability: null, // 確度未設定
    source: null,
    nextAction: "先方の返事待ち",
    nextActionDate: new Date(Date.now() + 86_400_000), // 未来
    lastActivityAt: null, // 未接触
    client: { id: "c3", name: "クライアントC" },
  },
];

describe("GET /api/dashboard/pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.appSettings.findFirst.mockResolvedValue(null);
    mockPrisma.deal.findMany.mockResolvedValue(DEALS);
  });

  it("確度の係数で加重した見込み金額を返す", async () => {
    const res = await GET();
    const body = await res.json();
    // high 1,000,000×0.8 + low 1,000,000×0.2 + 未設定は加算しない
    expect(body.weightedTotal).toBe(1_000_000);
    expect(body.weightedByStatus.discussion).toBe(800_000);
    expect(body.weightedByStatus.expected).toBe(200_000);
    expect(body.weightedByStatus.lead).toBe(0);
  });

  it("経路別の件数と金額を返す（未設定はまとめる）", async () => {
    const body = await (await GET()).json();
    const map = Object.fromEntries(
      body.bySource.map((s: { source: string; count: number }) => [
        s.source,
        s.count,
      ]),
    );
    expect(map.NTTD).toBe(1);
    expect(map.BCG).toBe(1);
    expect(map["未設定"]).toBe(1);
  });

  it("放置案件を古い順に返す（未接触も含む）", async () => {
    const body = await (await GET()).json();
    const ids = body.stale.map((s: { id: string }) => s.id);
    // d3 は未接触なので放置扱い、d2 は30日
    expect(ids).toContain("d2");
    expect(ids).toContain("d3");
    expect(ids).not.toContain("d1");
  });

  it("期日を過ぎた次アクションだけ返す", async () => {
    const body = await (await GET()).json();
    expect(body.overdue.map((o: { id: string }) => o.id)).toEqual(["d1"]);
  });

  it("設定があれば係数と閾値を使う", async () => {
    mockPrisma.appSettings.findFirst.mockResolvedValue({
      probabilityHighRate: 1.0,
      probabilityMidRate: 0.5,
      probabilityLowRate: 0.0,
      freshnessWarnDays: 3,
      freshnessAlertDays: 5,
      dealSources: "X\nY",
    });
    const body = await (await GET()).json();
    expect(body.weightedTotal).toBe(1_000_000); // high 1.0 + low 0.0
    expect(body.settings.warnDays).toBe(3);
    expect(body.settings.sources).toEqual(["X", "Y"]);
  });

  it("終了・失注はパイプラインに数えない", async () => {
    await GET();
    const where = mockPrisma.deal.findMany.mock.calls[0][0].where;
    expect(where.status.in).not.toContain("closed");
    expect(where.status.in).not.toContain("lost");
  });
});
