"use client";

import { daysSince, freshness } from "@/lib/pipeline";

/**
 * 鮮度バッジ。最終接触からの経過日数を3段階で示す。
 *
 * 「どの案件が放置されているか」が見えないのが現状のギャップなので、
 * 一覧で目に入る位置に出す。無印（最近触った）は何も描かない——全部に
 * バッジが付くと、赤が目立たなくなる。
 */
export function FreshnessBadge({
  lastActivityAt,
  warnDays,
  alertDays,
}: {
  lastActivityAt: string | Date | null | undefined;
  warnDays?: number;
  alertDays?: number;
}) {
  const level = freshness(lastActivityAt, { warnDays, alertDays });
  if (level === "fresh") return null;

  const days = daysSince(lastActivityAt);
  const label = days === null ? "未接触" : `${days}日`;
  const style =
    level === "alert"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums ${style}`}
      title={
        days === null
          ? "接触の記録がありません"
          : `最終接触から${days}日経過`
      }
    >
      {label}
    </span>
  );
}
