import {
  dealMonthlyAmounts,
  formatMonth,
  generateMonthRange,
  type RevenueDeal,
  type RevenueInvoice,
} from "@/lib/revenue";

/**
 * FY月次ビュー（売上マトリクス＋資金繰り）。
 *
 * Excel でやっていた「経路×案件の月次売上＋固定費を引いた残高推移」を台帳から
 * 自動生成する。セルの規則はダッシュボードの集計（lib/revenue.ts）と共有する:
 *
 *   実績月（カットオーバー以降・Invoiceあり）… Invoice金額
 *   それ以外                                  … Deal予測
 *
 * ダッシュボードと違うのは **見込み案件（lead/discussion/expected）も予測値で
 * 出す**こと。Excelの計画表と同じ思想で、「取れたらこうなる」を並べる。
 * ただし実績・受注済みとは視覚的に区別する（kind を返す）。
 *
 * 売上は**請求書発行基準**。入金タイミングのズレ（売掛サイト）は反映しない。
 */

export const FISCAL_START_MONTH = 6; // 6月始まり

export type CellKind = "actual" | "contracted" | "prospect";

export type ForecastCell = { amount: number; kind: CellKind };

export type ForecastRow = {
  dealId: string;
  dealTitle: string;
  clientName: string;
  source: string;
  status: string;
  probability: string | null;
  cells: Record<string, ForecastCell>;
  total: number;
};

export type ForecastGroup = {
  source: string;
  rows: ForecastRow[];
  monthTotals: Record<string, number>;
  total: number;
};

export type ExcludedDeal = {
  dealId: string;
  dealTitle: string;
  clientName: string;
  status: string;
  reason: string;
};

export type ForecastMatrix = {
  months: string[];
  groups: ForecastGroup[];
  monthTotals: Record<string, number>;
  grandTotal: number;
  /** 予測に乗らなかった案件。黙って消さず、入力を促すために返す */
  excluded: ExcludedDeal[];
};

export type ForecastDeal = RevenueDeal & {
  source: string | null;
  probability: string | null;
};

/** FY の範囲。FY26 = 2026-06 〜 2027-05 */
export function fiscalYearRange(fy: number): { start: Date; end: Date } {
  return {
    start: new Date(fy, FISCAL_START_MONTH - 1, 1),
    end: new Date(fy + 1, FISCAL_START_MONTH - 1, 0),
  };
}

export function currentFiscalYear(now: Date = new Date()): number {
  return now.getMonth() < FISCAL_START_MONTH - 1
    ? now.getFullYear() - 1
    : now.getFullYear();
}

const PROSPECT_STATUSES = ["lead", "discussion", "expected"];
const DEFAULT_RATES: Record<string, number> = { high: 0.8, mid: 0.5, low: 0.2 };

/** 契約情報が揃っていて、月次に展開できる案件か（FY外かどうかとは別） */
function canExpand(deal: ForecastDeal): boolean {
  if (deal.billingType === "lumpsum") {
    return Boolean(deal.contractAmount && deal.contractEndDate);
  }
  if (deal.billingType === "prorated") {
    return Boolean(
      deal.monthlyAmount && deal.contractStartDate && deal.contractEndDate,
    );
  }
  return Boolean(deal.monthlyAmount);
}

/** 予測に乗らない理由。入力すべき項目が分かる文言にする */
function missingReason(deal: ForecastDeal): string {
  if (deal.billingType === "lumpsum") {
    if (!deal.contractAmount) return "契約金額が未入力";
    return "契約終了日が未入力";
  }
  if (!deal.monthlyAmount) return "月額が未入力";
  if (deal.billingType === "prorated") return "契約期間が未入力";
  return "契約期間が未入力";
}

export function buildForecast(
  deals: ForecastDeal[],
  invoices: RevenueInvoice[],
  {
    fy,
    now,
    cutoverDate = null,
    weighted = false,
    rates = DEFAULT_RATES,
  }: {
    fy: number;
    now: Date;
    cutoverDate?: Date | null;
    /** 見込み案件に確度係数を掛ける（既定OFF＝Excelと同じ非加重の計画値） */
    weighted?: boolean;
    rates?: Record<string, number>;
  },
): ForecastMatrix {
  const { start, end } = fiscalYearRange(fy);
  const months = generateMonthRange(start, end);
  const monthSet = new Set(months);
  const currentMonth = formatMonth(now);
  const cutoverMonth = cutoverDate ? formatMonth(cutoverDate) : null;

  // Deal×月 → Invoice金額
  const invoiceAmount = new Map<string, number>();
  for (const inv of invoices) {
    const m = `${inv.year}-${String(inv.month).padStart(2, "0")}`;
    if (!monthSet.has(m)) continue;
    const k = `${inv.dealId} ${m}`;
    invoiceAmount.set(k, (invoiceAmount.get(k) ?? 0) + inv.amount);
  }

  const groupMap = new Map<string, ForecastRow[]>();
  const excluded: ExcludedDeal[] = [];
  const monthTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const deal of deals) {
    const isProspect = PROSPECT_STATUSES.includes(deal.status);
    const expanded = dealMonthlyAmounts(deal, {
      startDate: start,
      endDate: end,
      now,
    });

    const cells: Record<string, ForecastCell> = {};
    let total = 0;

    // 予測（Invoice が無い月）
    for (const { month, amount } of expanded) {
      if (!monthSet.has(month)) continue;
      if (invoiceAmount.has(`${deal.id} ${month}`)) continue; // Invoice が真実
      // カットオーバー以降の過去月で請求が無い＝実績にしない（請求書発行基準）。
      // 見込み案件は将来の計画値なのでこの制限を受けない
      if (
        !isProspect &&
        cutoverMonth &&
        month >= cutoverMonth &&
        month < currentMonth
      ) {
        continue;
      }
      const value =
        isProspect && weighted
          ? Math.round(amount * (rates[deal.probability ?? ""] ?? 0))
          : amount;
      if (value === 0) continue;
      cells[month] = {
        amount: value,
        kind: isProspect ? "prospect" : "contracted",
      };
      total += value;
    }

    // 実績（Invoice）。案件の状態に関わらず載せる
    for (const month of months) {
      const amount = invoiceAmount.get(`${deal.id} ${month}`);
      if (amount === undefined) continue;
      cells[month] = { amount, kind: "actual" };
      total += amount;
    }

    if (Object.keys(cells).length === 0) {
      // FY外の案件は「予測に乗らない」ではないので黙って外す（入力漏れでは
      // ないものを一覧に出すと、本当に埋めるべき案件が埋もれる）。
      // 契約情報が足りずに展開できない案件だけ、入力を促すために拾う
      if (!canExpand(deal)) {
        excluded.push({
          dealId: deal.id,
          dealTitle: deal.title,
          clientName: deal.client.name,
          status: deal.status,
          reason: missingReason(deal),
        });
      }
      continue;
    }

    const source = deal.source?.trim() || "その他";
    const row: ForecastRow = {
      dealId: deal.id,
      dealTitle: deal.title,
      clientName: deal.client.name,
      source,
      status: deal.status,
      probability: deal.probability,
      cells,
      total,
    };
    if (!groupMap.has(source)) groupMap.set(source, []);
    groupMap.get(source)!.push(row);

    for (const [m, c] of Object.entries(cells)) {
      monthTotals[m] = (monthTotals[m] ?? 0) + c.amount;
    }
    grandTotal += total;
  }

  const groups: ForecastGroup[] = [...groupMap.entries()]
    .map(([source, rows]) => {
      const gm: Record<string, number> = {};
      let gt = 0;
      for (const r of rows) {
        for (const [m, c] of Object.entries(r.cells)) {
          gm[m] = (gm[m] ?? 0) + c.amount;
        }
        gt += r.total;
      }
      rows.sort((a, b) => b.total - a.total);
      return { source, rows, monthTotals: gm, total: gt };
    })
    .sort((a, b) => b.total - a.total);

  return { months, groups, monthTotals, grandTotal, excluded };
}

// ─── 資金繰り ──────────────────────────────────────────

export type CostCategory = "payment" | "execComp" | "expense";

export type CostDefaults = Record<CostCategory, number>;

/** 月別の上書き。セルの値＝上書きがあればそれ、無ければ既定値 */
export type CostOverride = { month: string; category: CostCategory; amount: number };

export type CashflowRow = {
  month: string;
  revenue: number;
  payment: number;
  execComp: number;
  expense: number;
  /** その月の収支。売上 −（支払い＋役員報酬＋経費） */
  net: number;
  /** 期首繰越からの累計残高 */
  balance: number;
  /** 上書きされている費目（画面で印を付ける） */
  overridden: CostCategory[];
};

export function buildCashflow(
  months: string[],
  revenueByMonth: Record<string, number>,
  {
    defaults,
    overrides = [],
    openingBalance = 0,
  }: {
    defaults: CostDefaults;
    overrides?: CostOverride[];
    openingBalance?: number;
  },
): CashflowRow[] {
  const map = new Map<string, number>();
  for (const o of overrides) {
    map.set(`${o.month} ${o.category}`, o.amount);
  }

  let balance = openingBalance;
  return months.map((month) => {
    const overridden: CostCategory[] = [];
    const pick = (category: CostCategory): number => {
      const k = `${month} ${category}`;
      if (map.has(k)) {
        overridden.push(category);
        return map.get(k)!;
      }
      return defaults[category];
    };

    const payment = pick("payment");
    const execComp = pick("execComp");
    const expense = pick("expense");
    const revenue = revenueByMonth[month] ?? 0;
    const net = revenue - (payment + execComp + expense);
    balance += net;

    return { month, revenue, payment, execComp, expense, net, balance, overridden };
  });
}
