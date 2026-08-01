/**
 * パイプライン管理（アップグレード v1.1）の計算。
 *
 * 「会議のあと30秒でパイプラインが最新になる」ための土台。画面から使う計算を
 * ここに集めて、UIとAPIの両方が同じ規則で動くようにする。
 */

export type Probability = "high" | "mid" | "low";

/** 鮮度。最終接触からの経過日数で3段階に分ける */
export type Freshness = "fresh" | "warn" | "alert";

export const PROBABILITY_LABELS: Record<Probability, string> = {
  high: "高",
  mid: "中",
  low: "低",
};

/** 加重集計の既定係数。設定画面で変更できる（AppSettings に保持） */
export const DEFAULT_PROBABILITY_RATES: Record<Probability, number> = {
  high: 0.8,
  mid: 0.5,
  low: 0.2,
};

export const DEFAULT_FRESHNESS_WARN_DAYS = 8;
export const DEFAULT_FRESHNESS_ALERT_DAYS = 15;

/** 経路の初期リスト。設定画面で編集できる */
export const DEFAULT_DEAL_SOURCES = [
  "NTTD",
  "BCG",
  "ENND",
  "既存クライアント紹介",
  "直接",
];

/**
 * 経路リストの文字列（改行区切り）を配列にする。
 *
 * 選択式＋自由追記なので enum にはしない。空行と重複は落とす。
 */
export function parseSources(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const v = line.trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** 最終接触からの経過日数。接触が無ければ null */
export function daysSince(
  lastActivityAt: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!lastActivityAt) return null;
  const last = new Date(lastActivityAt);
  if (Number.isNaN(last.getTime())) return null;
  const ms = now.getTime() - last.getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * 鮮度バッジの段階。
 *
 * 接触が一度も無い案件は「放置」として扱う。作られただけで誰も触っていない
 * 案件こそ拾いたいので、無印にはしない。
 */
export function freshness(
  lastActivityAt: Date | string | null | undefined,
  {
    now = new Date(),
    warnDays = DEFAULT_FRESHNESS_WARN_DAYS,
    alertDays = DEFAULT_FRESHNESS_ALERT_DAYS,
  }: { now?: Date; warnDays?: number; alertDays?: number } = {},
): Freshness {
  const days = daysSince(lastActivityAt, now);
  if (days === null) return "alert";
  if (days >= alertDays) return "alert";
  if (days >= warnDays) return "warn";
  return "fresh";
}

/** 次アクションの期日が過ぎているか。期日なしは false */
export function isOverdue(
  nextActionDate: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!nextActionDate) return false;
  const due = new Date(nextActionDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

type WeightedDeal = {
  monthlyAmount?: number | null;
  probability?: Probability | string | null;
};

/**
 * 見込み金額＝金額×確度係数の合計。
 *
 * 確度が未設定の案件は**加算しない**。0.5 などで勝手に見積もると、入力して
 * いない案件が数字を作ってしまう。入っていないものは数えないほうが誠実で、
 * 「確度を入れると見込みが増える」ので入力の動機にもなる。
 */
export function weightedAmount(
  deals: WeightedDeal[],
  rates: Partial<Record<Probability, number>> = DEFAULT_PROBABILITY_RATES,
): number {
  let total = 0;
  for (const d of deals) {
    const p = d.probability as Probability | null | undefined;
    if (!p || !(p in DEFAULT_PROBABILITY_RATES)) continue;
    const rate = rates[p] ?? DEFAULT_PROBABILITY_RATES[p];
    total += (d.monthlyAmount ?? 0) * rate;
  }
  return Math.round(total);
}

/** ステータス別の加重合計。dashboard の「見込み金額」に使う */
export function weightedByStatus<T extends WeightedDeal & { status: string }>(
  deals: T[],
  rates?: Partial<Record<Probability, number>>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of deals) {
    out[d.status] = (out[d.status] ?? 0) + weightedAmount([d], rates);
  }
  return out;
}

/** 経路別の件数と金額。経路が未設定のものは「未設定」にまとめる */
export function bySource<
  T extends { source?: string | null; monthlyAmount?: number | null },
>(deals: T[]): { source: string; count: number; amount: number }[] {
  const map = new Map<string, { count: number; amount: number }>();
  for (const d of deals) {
    const key = d.source?.trim() || "未設定";
    const cur = map.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += d.monthlyAmount ?? 0;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.amount - a.amount || b.count - a.count);
}
