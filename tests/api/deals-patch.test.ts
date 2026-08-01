import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  deal: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  activity: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { PATCH } = await import("@/app/api/deals/[id]/route");
const { POST: postActivity } = await import(
  "@/app/api/deals/[id]/activities/route"
);

function req(body: unknown) {
  return new Request("http://localhost/api/deals/deal-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

const params = Promise.resolve({ id: "deal-1" });

describe("PATCH /api/deals/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.deal.update.mockResolvedValue({ id: "deal-1" });
  });

  it("確度・次アクション・期日を部分更新できる", async () => {
    const res = await PATCH(
      req({
        probability: "high",
        nextAction: "見積書を送る",
        nextActionDate: "2026-08-10",
      }),
      { params },
    );
    expect(res.status).toBe(200);
    const data = mockPrisma.deal.update.mock.calls[0][0].data;
    expect(data.probability).toBe("high");
    expect(data.nextAction).toBe("見積書を送る");
    expect(data.nextActionDate).toBeInstanceOf(Date);
  });

  it("許可していない列は書き換えられない", async () => {
    // PUT と違い body をそのまま渡さない。誤ったペイロードで契約金額や
    // 請求連動の値が飛ぶのを防ぐ
    const res = await PATCH(
      req({ status: "active", monthlyAmount: 999_999, clientId: "other" }),
      { params },
    );
    expect(res.status).toBe(200);
    const data = mockPrisma.deal.update.mock.calls[0][0].data;
    expect(data.status).toBe("active");
    expect(data).not.toHaveProperty("monthlyAmount");
    expect(data).not.toHaveProperty("clientId");
  });

  it("空文字は未設定に戻す（確度を入れ直せる）", async () => {
    await PATCH(req({ probability: "", nextAction: "  ", nextActionDate: "" }), {
      params,
    });
    const data = mockPrisma.deal.update.mock.calls[0][0].data;
    expect(data.probability).toBeNull();
    expect(data.nextAction).toBeNull();
    expect(data.nextActionDate).toBeNull();
  });

  it("不正な値は400で弾き、DBに触らない", async () => {
    for (const body of [
      { status: "unknown" },
      { probability: "maybe" },
      { nextActionDate: "not-a-date" },
    ]) {
      const res = await PATCH(req(body), { params });
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(mockPrisma.deal.update).not.toHaveBeenCalled();
  });

  it("更新対象が何も無ければ400", async () => {
    const res = await PATCH(req({ foo: "bar" }), { params });
    expect(res.status).toBe(400);
    expect(mockPrisma.deal.update).not.toHaveBeenCalled();
  });
});

describe("POST /api/deals/:id/activities（lastActivityAt の更新）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.activity.create.mockResolvedValue({ id: "act-1" });
    mockPrisma.deal.update.mockResolvedValue({ id: "deal-1" });
  });

  function actReq(body: unknown) {
    return new Request("http://localhost/api/deals/deal-1/activities", {
      method: "POST",
      body: JSON.stringify(body),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  }

  it("接触が新しければ Deal の lastActivityAt を更新する", async () => {
    mockPrisma.deal.findUnique.mockResolvedValue({
      lastActivityAt: new Date("2026-07-01"),
    });
    const res = await postActivity(
      actReq({ type: "note", date: "2026-08-01", summary: "打合せ" }),
      { params },
    );
    expect(res.status).toBe(201);
    expect(mockPrisma.deal.update).toHaveBeenCalledWith({
      where: { id: "deal-1" },
      data: { lastActivityAt: new Date("2026-08-01") },
    });
  });

  it("初回の接触でも更新する", async () => {
    mockPrisma.deal.findUnique.mockResolvedValue({ lastActivityAt: null });
    await postActivity(
      actReq({ type: "note", date: "2026-08-01", summary: "初回" }),
      { params },
    );
    expect(mockPrisma.deal.update).toHaveBeenCalled();
  });

  it("過去の日付を後から登録しても遡って上書きしない", async () => {
    mockPrisma.deal.findUnique.mockResolvedValue({
      lastActivityAt: new Date("2026-08-01"),
    });
    await postActivity(
      actReq({ type: "meeting", date: "2026-07-01", summary: "先月の分" }),
      { params },
    );
    expect(mockPrisma.deal.update).not.toHaveBeenCalled();
  });
});
