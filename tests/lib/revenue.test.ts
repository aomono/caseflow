import { describe, it, expect } from "vitest";
import { buildRevenue, type RevenueDeal, type RevenueInvoice } from "@/lib/revenue";

/**
 * 売上集計のハイブリッド化（2026-08-08）。
 *
 * 実地で踏んだ3つの乖離をそのままテストにする:
 *   ① 月ごとに変わる実額を単一の monthlyAmount で表せない
 *   ② lost 化すると請求済みの実績まで消える
 *   ③ 同じ Deal×月 に Invoice と Deal 予測が二重計上されない
 */

const NOW = new Date("2026-08-08T00:00:00+09:00");

function deal(over: Partial<RevenueDeal> = {}): RevenueDeal {
  return {
    id: "d1",
    title: "案件A",
    status: "active",
    monthlyAmount: 1_000_000,
    billingType: "monthly",
    contractAmount: null,
    prorateBase: null,
    contractStartDate: new Date("2026-06-01"),
    contractEndDate: new Date("2026-07-31"),
    client: { name: "A社" },
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

const RANGE = { startDate: null, endDate: null, now: NOW };

describe("Invoice が実績の真実", () => {
  it("Invoice のある月は Invoice の金額を使う（Deal予測は使わない）", () => {
    const got = buildRevenue([deal()], [invoice()], RANGE);
    // 6月は請求1,200万（Dealの100万でない）、7月はDeal予測の100万
    expect(got.actualByMonth["2026-06"]).toBe(12_000_000);
    expect(got.actualByMonth["2026-07"]).toBe(1_000_000);
  });

  it("同じ Deal×月 で二重計上しない", () => {
    const got = buildRevenue([deal()], [invoice()], RANGE);
    expect(got.actualByMonth["2026-06"]).toBe(12_000_000);
    expect(got.revenueByClient["A社"]).toBe(13_000_000); // 1,200万 + 7月の100万
  });

  it("月ごとに金額が変わる実績を表現できる（①の乖離）", () => {
    const invoices = [
      invoice({ month: 6, amount: 12_000_000 }),
      invoice({ month: 7, amount: 12_000_000 }),
      invoice({ month: 9, amount: 5_000_000 }),
    ];
    const got = buildRevenue(
      [deal({ contractEndDate: new Date("2026-09-30") })],
      invoices,
      RANGE,
    );
    expect(got.actualByMonth["2026-06"]).toBe(12_000_000);
    expect(got.actualByMonth["2026-07"]).toBe(12_000_000);
    expect(got.actualByMonth["2026-09"]).toBe(5_000_000);
    // 8月は請求が無いので Deal 予測でフォールバック
    expect(got.actualByMonth["2026-08"]).toBeUndefined();
    expect(got.contractedByMonth["2026-08"]).toBe(1_000_000);
  });
});

describe("案件の生死と請求実績は独立（②の乖離）", () => {
  it("lost の Deal に紐づく Invoice の実績が消えない", () => {
    // lost は Deal の取得条件から外れるので deals には入ってこない。
    // それでも Invoice からの実績は残らなければならない
    const got = buildRevenue([], [invoice({ amount: 13_200_000 })], RANGE);
    expect(got.actualByMonth["2026-06"]).toBe(13_200_000);
    expect(got.revenueByClient["A社"]).toBe(13_200_000);
  });

  it("closed の Deal でも Invoice が優先される", () => {
    const got = buildRevenue(
      [deal({ status: "closed" })],
      [invoice({ amount: 9_000_000 })],
      RANGE,
    );
    expect(got.actualByMonth["2026-06"]).toBe(9_000_000);
  });
});

describe("Invoice が無い月は Deal ベースのまま", () => {
  it("将来月は contracted（現行どおり）", () => {
    const got = buildRevenue(
      [deal({ contractStartDate: new Date("2026-08-01"), contractEndDate: new Date("2026-10-31") })],
      [],
      RANGE,
    );
    expect(got.contractedByMonth["2026-09"]).toBe(1_000_000);
    expect(got.contractedByMonth["2026-10"]).toBe(1_000_000);
  });

  it("discussion / expected は prospect", () => {
    const got = buildRevenue([deal({ status: "discussion" })], [], RANGE);
    expect(got.prospectByMonth["2026-06"]).toBe(1_000_000);
    expect(got.actualByMonth["2026-06"]).toBeUndefined();
  });

  it("一括契約は終了月に計上する", () => {
    const got = buildRevenue(
      [
        deal({
          billingType: "lumpsum",
          monthlyAmount: null,
          contractAmount: 5_000_000,
          status: "closed",
        }),
      ],
      [],
      RANGE,
    );
    expect(got.actualByMonth["2026-07"]).toBe(5_000_000);
  });

  it("一括契約でも Invoice があればそちらを使う", () => {
    const got = buildRevenue(
      [
        deal({
          billingType: "lumpsum",
          monthlyAmount: null,
          contractAmount: 5_000_000,
          status: "closed",
        }),
      ],
      [invoice({ month: 7, amount: 6_000_000 })],
      RANGE,
    );
    expect(got.actualByMonth["2026-07"]).toBe(6_000_000);
  });
});

describe("期間の絞り込み", () => {
  it("範囲外の Invoice は集計に入れない", () => {
    const got = buildRevenue([], [invoice({ month: 3 })], {
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-07-31"),
      now: NOW,
    });
    expect(got.actualByMonth["2026-03"]).toBeUndefined();
  });
});

describe("複数の案件", () => {
  it("Invoice のある案件と無い案件が同じ月に混在しても、それぞれ正しく積む", () => {
    // 月単位で切り替えると、片方だけ Invoice 化された月に事故が起きる
    const got = buildRevenue(
      [deal({ id: "d1" }), deal({ id: "d2", client: { name: "B社" } })],
      [invoice({ dealId: "d1", amount: 12_000_000 })],
      RANGE,
    );
    // d1 は請求1,200万、d2 は Deal 予測100万
    expect(got.actualByMonth["2026-06"]).toBe(13_000_000);
    expect(got.revenueByClient["A社"]).toBe(13_000_000); // 6月請求 + 7月予測
    expect(got.revenueByClient["B社"]).toBe(2_000_000); // 6月・7月の予測
  });
});

describe("カットオーバー日（請求書発行基準への移行）", () => {
  const CUTOVER = new Date("2026-06-01");
  const withCutover = { ...RANGE, cutoverDate: CUTOVER };

  it("以降の過去月は Invoice が無ければ実績に計上しない", () => {
    // 会計が請求書発行基準なら、請求していないものは売上でない
    const got = buildRevenue([deal()], [], withCutover);
    expect(got.actualByMonth["2026-06"]).toBeUndefined();
    expect(got.actualByMonth["2026-07"]).toBeUndefined();
    expect(got.revenueByClient["A社"]).toBeUndefined();
  });

  it("計上しなかった分を請求漏れの疑いとして拾う", () => {
    const got = buildRevenue([deal()], [], withCutover);
    expect(got.missingInvoices).toHaveLength(2);
    expect(got.missingInvoices[0]).toMatchObject({
      dealId: "d1",
      dealTitle: "案件A",
      clientName: "A社",
      month: "2026-06",
      expectedAmount: 1_000_000,
      beforeCutover: false,
    });
  });

  it("Invoice がある月は請求漏れに入らない", () => {
    const got = buildRevenue([deal()], [invoice()], withCutover);
    expect(got.actualByMonth["2026-06"]).toBe(12_000_000);
    expect(got.missingInvoices.map((m) => m.month)).toEqual(["2026-07"]);
  });

  it("以前の過去月はフォールバックが効く（消える数字を作らない）", () => {
    const old = deal({
      contractStartDate: new Date("2026-04-01"),
      contractEndDate: new Date("2026-05-31"),
    });
    const got = buildRevenue([old], [], withCutover);
    expect(got.actualByMonth["2026-04"]).toBe(1_000_000);
    expect(got.actualByMonth["2026-05"]).toBe(1_000_000);
    // 数字には影響しないが、漸進移行のリストには出す
    expect(got.missingInvoices.every((m) => m.beforeCutover)).toBe(true);
    expect(got.missingInvoices).toHaveLength(2);
  });

  it("未来月は影響を受けない（contracted のまま）", () => {
    const future = deal({
      contractStartDate: new Date("2026-09-01"),
      contractEndDate: new Date("2026-10-31"),
    });
    const got = buildRevenue([future], [], withCutover);
    expect(got.contractedByMonth["2026-09"]).toBe(1_000_000);
    expect(got.missingInvoices).toEqual([]);
  });

  it("見込み段階の案件は請求漏れに入れない", () => {
    // discussion / expected に「請求し忘れ」は無い
    const got = buildRevenue([deal({ status: "discussion" })], [], withCutover);
    expect(got.missingInvoices).toEqual([]);
    expect(got.prospectByMonth["2026-06"]).toBe(1_000_000);
  });

  it("カットオーバーを指定しなければ現行どおり（後方互換）", () => {
    const got = buildRevenue([deal()], [], RANGE);
    expect(got.actualByMonth["2026-06"]).toBe(1_000_000);
    expect(got.missingInvoices).toEqual([]);
  });

  it("実地の例: 契約終了日が先のままの案件が幻計上されない", () => {
    // J社PTO: 6月で請求完了なのに契約終了日が7/3のまま。7月に按分が乗っていた
    const got = buildRevenue(
      [
        deal({
          id: "pto",
          title: "PTO AI導入",
          billingType: "prorated",
          contractStartDate: new Date("2026-06-01"),
          contractEndDate: new Date("2026-07-03"),
        }),
      ],
      [invoice({ dealId: "pto", month: 6, amount: 13_200_000 })],
      withCutover,
    );
    expect(got.actualByMonth["2026-06"]).toBe(13_200_000);
    expect(got.actualByMonth["2026-07"]).toBeUndefined(); // 幻計上が消える
    // 代わりに請求漏れの疑いとして見えるので、契約終了日の誤りに気づける
    expect(got.missingInvoices.map((m) => m.month)).toEqual(["2026-07"]);
  });
});
