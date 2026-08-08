import { describe, it, expect } from "vitest";
import {
  buildCashflow,
  buildForecast,
  currentFiscalYear,
  fiscalYearRange,
  type ForecastDeal,
} from "@/lib/forecast";
import type { RevenueInvoice } from "@/lib/revenue";

const NOW = new Date("2026-08-08T00:00:00+09:00");
const CUTOVER = new Date("2026-06-01");

function deal(over: Partial<ForecastDeal> = {}): ForecastDeal {
  return {
    id: "d1",
    title: "案件A",
    status: "active",
    monthlyAmount: 1_000_000,
    billingType: "monthly",
    contractAmount: null,
    prorateBase: null,
    contractStartDate: new Date("2026-06-01"),
    contractEndDate: new Date("2027-05-31"),
    client: { name: "A社" },
    source: "NTTD",
    probability: null,
    ...over,
  };
}

function invoice(over: Partial<RevenueInvoice> = {}): RevenueInvoice {
  return {
    dealId: "d1",
    year: 2026,
    month: 6,
    amount: 12_000_000,
    deal: { client: { name: "A社" } },
    ...over,
  };
}

const OPTS = { fy: 2026, now: NOW, cutoverDate: CUTOVER };

describe("FYの範囲", () => {
  it("6月始まりの12ヶ月", () => {
    const { start, end } = fiscalYearRange(2026);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(5); // 6月
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(4); // 5月
  });

  it("1〜5月は前年度のFY", () => {
    expect(currentFiscalYear(new Date("2026-08-08"))).toBe(2026);
    expect(currentFiscalYear(new Date("2027-03-01"))).toBe(2026);
    expect(currentFiscalYear(new Date("2027-06-01"))).toBe(2027);
  });

  it("列は12ヶ月", () => {
    const got = buildForecast([], [], OPTS);
    expect(got.months).toHaveLength(12);
    expect(got.months[0]).toBe("2026-06");
    expect(got.months[11]).toBe("2027-05");
  });
});

describe("セルの種別", () => {
  it("Invoice のある月は実績、それ以外は予測", () => {
    const got = buildForecast([deal()], [invoice()], OPTS);
    const row = got.groups[0].rows[0];
    expect(row.cells["2026-06"]).toEqual({ amount: 12_000_000, kind: "actual" });
    expect(row.cells["2026-09"]).toEqual({ amount: 1_000_000, kind: "contracted" });
  });

  it("見込み案件も予測値で出す（Excelの計画値と同じ思想）", () => {
    const got = buildForecast([deal({ status: "discussion" })], [], OPTS);
    const row = got.groups[0].rows[0];
    expect(row.cells["2026-09"].kind).toBe("prospect");
    expect(row.cells["2026-09"].amount).toBe(1_000_000); // 既定は非加重
  });

  it("カットオーバー以降の過去月は請求が無ければ載せない", () => {
    // ダッシュボードと同じ規則（請求書発行基準）
    const got = buildForecast([deal()], [], OPTS);
    const row = got.groups[0].rows[0];
    expect(row.cells["2026-06"]).toBeUndefined();
    expect(row.cells["2026-07"]).toBeUndefined();
    expect(row.cells["2026-08"]).toBeDefined(); // 当月以降は予測
  });

  it("見込み案件も過去月には出さない（過ぎた月の見込みは存在しない）", () => {
    // 契約開始日が過去のままの見込み案件が、過去月の合計を汚していた
    // （2026-08-08 実測: 7月合計に660万が乗った）
    const got = buildForecast([deal({ status: "lead" })], [], OPTS);
    const cells = got.groups[0].rows[0].cells;
    expect(cells["2026-06"]).toBeUndefined();
    expect(cells["2026-07"]).toBeUndefined();
    expect(cells["2026-09"]).toBeDefined(); // 将来月は計画値として出す
  });

  it("過去月の合計に見込みが混ざらない", () => {
    const got = buildForecast(
      [
        deal({ id: "won", status: "active" }),
        deal({ id: "maybe", status: "discussion", monthlyAmount: 6_600_000 }),
      ],
      [invoice({ dealId: "won", month: 7, amount: 14_200_000 })],
      OPTS,
    );
    // 7月は請求済みの1,420万だけ。見込みの660万は乗らない
    expect(got.monthTotals["2026-07"]).toBe(14_200_000);
    // 将来月には両方乗る
    expect(got.monthTotals["2026-09"]).toBe(7_600_000);
  });
});

describe("加重見込みトグル", () => {
  it("ONで見込み案件に確度係数を掛ける", () => {
    const got = buildForecast(
      [deal({ status: "expected", probability: "high" })],
      [],
      { ...OPTS, weighted: true },
    );
    expect(got.groups[0].rows[0].cells["2026-09"].amount).toBe(800_000);
  });

  it("確度が未設定なら加重時は0（＝セルを作らない）", () => {
    const got = buildForecast([deal({ status: "lead" })], [], {
      ...OPTS,
      weighted: true,
    });
    expect(got.groups).toEqual([]);
  });

  it("受注済みの案件は加重の対象外", () => {
    const got = buildForecast([deal({ status: "active", probability: "low" })], [], {
      ...OPTS,
      weighted: true,
    });
    expect(got.groups[0].rows[0].cells["2026-09"].amount).toBe(1_000_000);
  });
});

describe("経路でのグループ化", () => {
  it("source ごとにまとめ、金額の多い順に並べる", () => {
    const got = buildForecast(
      [
        deal({ id: "d1", source: "NTTD", monthlyAmount: 1_000_000 }),
        deal({ id: "d2", source: "BCG", monthlyAmount: 2_000_000, client: { name: "B社" } }),
      ],
      [],
      OPTS,
    );
    expect(got.groups.map((g) => g.source)).toEqual(["BCG", "NTTD"]);
  });

  it("source が未設定なら「その他」", () => {
    const got = buildForecast([deal({ source: null })], [], OPTS);
    expect(got.groups[0].source).toBe("その他");
  });

  it("月別合計と年間合計を出す", () => {
    const got = buildForecast(
      [deal({ id: "d1" }), deal({ id: "d2", client: { name: "B社" } })],
      [],
      OPTS,
    );
    expect(got.monthTotals["2026-09"]).toBe(2_000_000);
    expect(got.grandTotal).toBe(got.groups.reduce((s, g) => s + g.total, 0));
  });
});

describe("予測に乗らない案件（黙って消さない）", () => {
  it("金額が無い案件を理由付きで列挙する", () => {
    const got = buildForecast([deal({ monthlyAmount: null })], [], OPTS);
    expect(got.groups).toEqual([]);
    expect(got.excluded).toEqual([
      {
        dealId: "d1",
        dealTitle: "案件A",
        clientName: "A社",
        status: "active",
        reason: "月額が未入力",
      },
    ]);
  });

  it("一括で契約金額が無い案件も拾う", () => {
    const got = buildForecast(
      [deal({ billingType: "lumpsum", monthlyAmount: null, contractAmount: null })],
      [],
      OPTS,
    );
    expect(got.excluded[0].reason).toBe("契約金額が未入力");
  });

  it("FY外の案件は「乗らない案件」に入れない（入力漏れではない）", () => {
    const got = buildForecast(
      [
        deal({
          contractStartDate: new Date("2025-01-01"),
          contractEndDate: new Date("2025-12-31"),
        }),
      ],
      [],
      OPTS,
    );
    expect(got.excluded).toEqual([]);
    expect(got.groups).toEqual([]);
  });
});

describe("一括・日割り", () => {
  it("一括契約は終了月にまとめて乗る", () => {
    const got = buildForecast(
      [
        deal({
          billingType: "lumpsum",
          monthlyAmount: null,
          contractAmount: 5_000_000,
          contractEndDate: new Date("2026-10-31"),
        }),
      ],
      [],
      OPTS,
    );
    const cells = got.groups[0].rows[0].cells;
    expect(cells["2026-10"].amount).toBe(5_000_000);
    expect(Object.keys(cells)).toEqual(["2026-10"]);
  });

  it("日割りは月ごとに按分される", () => {
    const got = buildForecast(
      [
        deal({
          billingType: "prorated",
          contractStartDate: new Date("2026-09-15"),
          contractEndDate: new Date("2026-10-31"),
        }),
      ],
      [],
      OPTS,
    );
    const cells = got.groups[0].rows[0].cells;
    expect(cells["2026-09"].amount).toBeLessThan(1_000_000); // 半月ぶん
    // 既定の fixed30（30日固定）は31日の月で1ヶ月分を少し超える。
    // 既存の按分ロジックの仕様なので、そのまま通す
    expect(cells["2026-10"].amount).toBe(1_033_333);
  });
});

describe("資金繰り", () => {
  const MONTHS = ["2026-06", "2026-07", "2026-08"];
  const DEFAULTS = { payment: 1_000_000, execComp: 2_000_000, expense: 500_000 };

  it("単月収支と累計残高を出す", () => {
    const got = buildCashflow(
      MONTHS,
      { "2026-06": 10_000_000, "2026-07": 5_000_000, "2026-08": 0 },
      { defaults: DEFAULTS, openingBalance: 3_000_000 },
    );
    expect(got[0].net).toBe(6_500_000);
    expect(got[0].balance).toBe(9_500_000);
    expect(got[1].balance).toBe(11_000_000);
    expect(got[2].net).toBe(-3_500_000);
    expect(got[2].balance).toBe(7_500_000);
  });

  it("月別の上書きが既定値より優先される", () => {
    const got = buildCashflow(
      MONTHS,
      {},
      {
        defaults: DEFAULTS,
        overrides: [{ month: "2026-07", category: "execComp", amount: 0 }],
      },
    );
    expect(got[0].execComp).toBe(2_000_000);
    expect(got[1].execComp).toBe(0);
    expect(got[1].overridden).toEqual(["execComp"]);
    expect(got[0].overridden).toEqual([]);
  });

  it("残高がマイナスになることもある（赤字表示のため）", () => {
    const got = buildCashflow(MONTHS, {}, { defaults: DEFAULTS, openingBalance: 0 });
    expect(got[2].balance).toBeLessThan(0);
  });
});
