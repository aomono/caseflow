import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 受け入れ基準5:
 *   「AI提案が誤っていた場合でも、確認画面で外せば台帳に触れない
 *    （無確認の自動書き込みが存在しないことをテストで保証）」
 *
 * ここが C-1 の安全性の全部なので、構造で保証されていることを確かめる:
 *   ・analyze は**一切書かない**（prismaの書き込みメソッドを呼ばない）
 *   ・apply は**AIを呼ばない**（渡されたものだけを適用する）
 *   ・照合できていない提案は適用しない
 */

const mockPrisma = vi.hoisted(() => ({
  deal: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  activity: { create: vi.fn(), deleteMany: vi.fn() },
  client: { findFirst: vi.fn() },
}));

const mockAnalyze = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/bulk-update", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bulk-update")>();
  return { ...actual, analyzeText: mockAnalyze };
});

const { POST: analyze } = await import(
  "@/app/api/deals/bulk-update/analyze/route"
);
const { POST: apply } = await import("@/app/api/deals/bulk-update/apply/route");

function post(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

const WRITE_METHODS = [
  mockPrisma.deal.create,
  mockPrisma.deal.update,
  mockPrisma.deal.delete,
  mockPrisma.deal.updateMany,
  mockPrisma.deal.deleteMany,
  mockPrisma.activity.create,
  mockPrisma.activity.deleteMany,
];

describe("analyze（読むだけ）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.deal.findMany.mockResolvedValue([
      {
        id: "d1",
        title: "商談A",
        status: "discussion",
        client: { name: "クライアントA" },
      },
    ]);
    mockAnalyze.mockResolvedValue([
      { kind: "status", dealId: "d1", value: "expected", reason: "受注確度が上がった" },
    ]);
  });

  it("提案を返すが、台帳には一切書かない", async () => {
    const res = await analyze(
      post("http://localhost/api/deals/bulk-update/analyze", {
        text: "商談Aは受注見込みになった",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(1);

    for (const write of WRITE_METHODS) {
      expect(write, "analyze が書き込みを呼んでいる").not.toHaveBeenCalled();
    }
  });

  it("テキストが空なら400", async () => {
    const res = await analyze(
      post("http://localhost/api/deals/bulk-update/analyze", { text: "  " }),
    );
    expect(res.status).toBe(400);
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it("終了・失注は照合の候補に出さない", async () => {
    await analyze(
      post("http://localhost/api/deals/bulk-update/analyze", { text: "何か" }),
    );
    const where = mockPrisma.deal.findMany.mock.calls[0][0].where;
    expect(where.status.in).not.toContain("closed");
    expect(where.status.in).not.toContain("lost");
  });
});

describe("apply（確認済みだけを反映）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.deal.findUnique.mockResolvedValue({
      id: "d1",
      lastActivityAt: null,
    });
    mockPrisma.deal.update.mockResolvedValue({ id: "d1" });
    mockPrisma.activity.create.mockResolvedValue({ id: "a1" });
  });

  it("AIを呼ばない（渡されたものだけを適用する）", async () => {
    await apply(
      post("http://localhost/api/deals/bulk-update/apply", {
        suggestions: [{ kind: "status", dealId: "d1", value: "expected" }],
      }),
    );
    expect(mockAnalyze, "apply が解析を呼んでいる").not.toHaveBeenCalled();
  });

  it("確認画面で外された提案は台帳に触れない", async () => {
    // ユーザーが1件だけ残した想定。残り2件は body に入っていない
    const res = await apply(
      post("http://localhost/api/deals/bulk-update/apply", {
        suggestions: [{ kind: "status", dealId: "d1", value: "expected" }],
      }),
    );
    const body = await res.json();
    expect(body.applied).toBe(1);
    expect(mockPrisma.deal.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.activity.create).not.toHaveBeenCalled();
  });

  it("照合できていない提案（dealId なし）は適用しない", async () => {
    const res = await apply(
      post("http://localhost/api/deals/bulk-update/apply", {
        suggestions: [
          { kind: "status", dealId: null, value: "expected", mentioned: "例の件" },
        ],
      }),
    );
    const body = await res.json();
    expect(body.applied).toBe(0);
    expect(body.results[0].ok).toBe(false);
    expect(mockPrisma.deal.update).not.toHaveBeenCalled();
  });

  it("存在しない案件には書かない", async () => {
    mockPrisma.deal.findUnique.mockResolvedValue(null);
    const res = await apply(
      post("http://localhost/api/deals/bulk-update/apply", {
        suggestions: [{ kind: "status", dealId: "ghost", value: "expected" }],
      }),
    );
    expect((await res.json()).applied).toBe(0);
    expect(mockPrisma.deal.update).not.toHaveBeenCalled();
  });

  it("不正な値は弾く", async () => {
    const res = await apply(
      post("http://localhost/api/deals/bulk-update/apply", {
        suggestions: [
          { kind: "status", dealId: "d1", value: "unknown" },
          { kind: "probability", dealId: "d1", value: "maybe" },
          { kind: "nextAction", dealId: "d1", action: "やる", date: "not-a-date" },
        ],
      }),
    );
    const body = await res.json();
    expect(body.applied).toBe(0);
    expect(mockPrisma.deal.update).not.toHaveBeenCalled();
  });

  it("メモは Activity を作り、接触日も進める", async () => {
    await apply(
      post("http://localhost/api/deals/bulk-update/apply", {
        suggestions: [{ kind: "activity", dealId: "d1", summary: "定例の記録" }],
      }),
    );
    expect(mockPrisma.activity.create).toHaveBeenCalled();
    expect(mockPrisma.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "d1" } }),
    );
  });

  it("新規案件はクライアントが実在するときだけ作る", async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);
    let res = await apply(
      post("http://localhost/api/deals/bulk-update/apply", {
        suggestions: [
          { kind: "newDeal", clientName: "知らない会社", title: "新しい話" },
        ],
      }),
    );
    expect((await res.json()).applied).toBe(0);
    expect(mockPrisma.deal.create).not.toHaveBeenCalled();

    mockPrisma.client.findFirst.mockResolvedValue({ id: "c1" });
    res = await apply(
      post("http://localhost/api/deals/bulk-update/apply", {
        suggestions: [
          { kind: "newDeal", clientName: "クライアントA", title: "新しい話" },
        ],
      }),
    );
    expect((await res.json()).applied).toBe(1);
    expect(mockPrisma.deal.create).toHaveBeenCalled();
  });

  it("1件失敗しても残りは進める", async () => {
    const res = await apply(
      post("http://localhost/api/deals/bulk-update/apply", {
        suggestions: [
          { kind: "status", dealId: null, value: "expected" }, // 失敗
          { kind: "status", dealId: "d1", value: "active" }, // 成功
        ],
      }),
    );
    const body = await res.json();
    expect(body.applied).toBe(1);
    expect(body.results.map((r: { ok: boolean }) => r.ok)).toEqual([false, true]);
  });

  it("提案が空なら400", async () => {
    const res = await apply(
      post("http://localhost/api/deals/bulk-update/apply", { suggestions: [] }),
    );
    expect(res.status).toBe(400);
  });
});
