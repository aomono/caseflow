import { describe, it, expect } from "vitest";
import {
  bySource,
  daysSince,
  freshness,
  isOverdue,
  parseSources,
  weightedAmount,
  weightedByStatus,
} from "@/lib/pipeline";

const NOW = new Date("2026-08-01T09:00:00+09:00");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 86_400_000);
}

describe("freshness", () => {
  it("最近の接触は無印", () => {
    expect(freshness(daysAgo(0), { now: NOW })).toBe("fresh");
    expect(freshness(daysAgo(7), { now: NOW })).toBe("fresh");
  });

  it("8日以上で黄、15日以上で赤", () => {
    expect(freshness(daysAgo(8), { now: NOW })).toBe("warn");
    expect(freshness(daysAgo(14), { now: NOW })).toBe("warn");
    expect(freshness(daysAgo(15), { now: NOW })).toBe("alert");
    expect(freshness(daysAgo(60), { now: NOW })).toBe("alert");
  });

  it("接触が一度も無い案件は放置として扱う", () => {
    // 作られただけで誰も触っていない案件こそ拾いたいので無印にしない
    expect(freshness(null, { now: NOW })).toBe("alert");
    expect(freshness(undefined, { now: NOW })).toBe("alert");
  });

  it("閾値は差し替えられる（設定画面で変更可）", () => {
    expect(freshness(daysAgo(5), { now: NOW, warnDays: 3, alertDays: 10 })).toBe(
      "warn",
    );
    expect(
      freshness(daysAgo(12), { now: NOW, warnDays: 3, alertDays: 10 }),
    ).toBe("alert");
  });

  it("壊れた日付は放置扱い（例外にしない）", () => {
    expect(freshness("not-a-date", { now: NOW })).toBe("alert");
  });
});

describe("daysSince", () => {
  it("経過日数を返す", () => {
    expect(daysSince(daysAgo(3), NOW)).toBe(3);
    expect(daysSince(NOW, NOW)).toBe(0);
  });

  it("接触が無ければ null", () => {
    expect(daysSince(null, NOW)).toBeNull();
  });
});

describe("isOverdue", () => {
  it("期日を過ぎていれば true", () => {
    expect(isOverdue(daysAgo(1), NOW)).toBe(true);
  });

  it("未来の期日と未設定は false", () => {
    expect(isOverdue(new Date(NOW.getTime() + 86_400_000), NOW)).toBe(false);
    expect(isOverdue(null, NOW)).toBe(false);
  });
});

describe("weightedAmount", () => {
  it("確度の係数を掛けて合計する", () => {
    const got = weightedAmount([
      { monthlyAmount: 1_000_000, probability: "high" }, // 800,000
      { monthlyAmount: 1_000_000, probability: "mid" }, //  500,000
      { monthlyAmount: 1_000_000, probability: "low" }, //  200,000
    ]);
    expect(got).toBe(1_500_000);
  });

  it("確度が未設定の案件は加算しない", () => {
    // 勝手に見積もると、入力していない案件が数字を作ってしまう
    expect(
      weightedAmount([
        { monthlyAmount: 1_000_000, probability: null },
        { monthlyAmount: 1_000_000 },
      ]),
    ).toBe(0);
  });

  it("係数は差し替えられる（設定画面で変更可）", () => {
    const got = weightedAmount([{ monthlyAmount: 1_000_000, probability: "high" }], {
      high: 1.0,
      mid: 0.5,
      low: 0.2,
    });
    expect(got).toBe(1_000_000);
  });

  it("金額が無い案件は0として扱う", () => {
    expect(weightedAmount([{ monthlyAmount: null, probability: "high" }])).toBe(0);
  });

  it("知らない確度の値は無視する", () => {
    expect(
      weightedAmount([{ monthlyAmount: 1_000_000, probability: "unknown" }]),
    ).toBe(0);
  });
});

describe("weightedByStatus", () => {
  it("ステータスごとに加重合計する", () => {
    const got = weightedByStatus([
      { status: "discussion", monthlyAmount: 1_000_000, probability: "high" },
      { status: "discussion", monthlyAmount: 1_000_000, probability: "low" },
      { status: "expected", monthlyAmount: 2_000_000, probability: "mid" },
    ]);
    expect(got.discussion).toBe(1_000_000);
    expect(got.expected).toBe(1_000_000);
  });
});

describe("bySource", () => {
  it("経路ごとに件数と金額を集計し、金額の多い順に並べる", () => {
    const got = bySource([
      { source: "NTTD", monthlyAmount: 1_000_000 },
      { source: "NTTD", monthlyAmount: 500_000 },
      { source: "BCG", monthlyAmount: 2_000_000 },
    ]);
    expect(got[0]).toEqual({ source: "BCG", count: 1, amount: 2_000_000 });
    expect(got[1]).toEqual({ source: "NTTD", count: 2, amount: 1_500_000 });
  });

  it("経路が未設定のものはまとめる", () => {
    const got = bySource([
      { source: null, monthlyAmount: 100 },
      { source: "  ", monthlyAmount: 200 },
    ]);
    expect(got).toEqual([{ source: "未設定", count: 2, amount: 300 }]);
  });
});

describe("parseSources", () => {
  it("改行区切りを配列にし、空行と重複を落とす", () => {
    expect(parseSources("NTTD\nBCG\n\n NTTD \nENND")).toEqual([
      "NTTD",
      "BCG",
      "ENND",
    ]);
  });

  it("未設定なら空", () => {
    expect(parseSources(null)).toEqual([]);
    expect(parseSources("")).toEqual([]);
  });
});
