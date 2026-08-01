/**
 * Deal の部分更新に対する検証。
 *
 * 画面のPATCH・貼り付け一括更新のapply・外部APIの3経路が**同じ規則**で動く
 * ようにここに集める。経路ごとに書くと、いつか片方だけ緩い口ができる。
 */

export const DEAL_STATUSES = [
  "lead",
  "discussion",
  "expected",
  "active",
  "renewal",
  "closed",
  "lost",
] as const;

export const PROBABILITIES = ["high", "mid", "low"] as const;

export type DealStatusValue = (typeof DEAL_STATUSES)[number];
export type ProbabilityValue = (typeof PROBABILITIES)[number];

/** 外から書き換えてよい列。ここに無いものは触らせない */
export const PATCHABLE_FIELDS = [
  "status",
  "probability",
  "nextAction",
  "nextActionDate",
  "source",
] as const;

export type PatchResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * 受け取った body から、更新してよい値だけを取り出す。
 *
 * 契約金額や請求連動の列は**そもそも取り出さない**（誤ったペイロードで
 * 飛ぶのを防ぐ）。空文字と null は「未設定に戻す」として扱う——確度や
 * 次アクションは入れ直せる必要がある。
 */
export function buildDealPatch(body: unknown): PatchResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "body must be an object" };
  }
  const src = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  for (const key of PATCHABLE_FIELDS) {
    if (!(key in src)) continue;
    const value = src[key];

    if (key === "status") {
      if (!DEAL_STATUSES.includes(value as DealStatusValue)) {
        return { ok: false, error: `invalid status: ${String(value)}` };
      }
      data.status = value;
    } else if (key === "probability") {
      if (value === null || value === "") {
        data.probability = null;
      } else if (!PROBABILITIES.includes(value as ProbabilityValue)) {
        return { ok: false, error: `invalid probability: ${String(value)}` };
      } else {
        data.probability = value;
      }
    } else if (key === "nextActionDate") {
      if (value === null || value === "") {
        data.nextActionDate = null;
      } else {
        const d = new Date(String(value));
        if (Number.isNaN(d.getTime())) {
          return { ok: false, error: `invalid nextActionDate: ${String(value)}` };
        }
        data.nextActionDate = d;
      }
    } else {
      const t = typeof value === "string" ? value.trim() : value;
      data[key] = t === "" || t === undefined || t === null ? null : t;
    }
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "no updatable fields" };
  }
  return { ok: true, data };
}
