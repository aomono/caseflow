"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEAL_STATUS_LABELS } from "@/lib/constants";

type Stale = {
  id: string;
  title: string;
  clientName: string;
  status: string;
  days: number | null;
};

type Overdue = {
  id: string;
  title: string;
  clientName: string;
  nextAction: string;
  nextActionDate: string;
};

type PipelineStats = {
  weightedTotal: number;
  weightedByStatus: Record<string, number>;
  bySource: { source: string; count: number; amount: number }[];
  stale: Stale[];
  overdue: Overdue[];
};

const YEN = (n: number) => `¥${n.toLocaleString()}`;

/**
 * パイプラインの要約（Phase B）。
 *
 * 「今週動かすべき案件がスクロールなしで見える」（受け入れ基準3）ために、
 * ダッシュボードの**先頭**に置く。集計だけでなく、放置案件と期日超過の
 * 実物を並べる——数字だけ見せても次の行動にならない。
 */
export function PipelineSummary() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/pipeline")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="skeleton h-28 w-full rounded-xl" />;
  }
  if (!stats) return null;

  const statuses = Object.entries(stats.weightedByStatus).filter(
    ([, v]) => v > 0,
  );
  const needsAction = stats.stale.length + stats.overdue.length;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* 見込み金額 */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-semibold text-slate-500">
            見込み金額（確度で加重）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="tabular-nums text-2xl font-bold text-slate-900">
            {YEN(stats.weightedTotal)}
          </div>
          <div className="mt-2 space-y-1">
            {statuses.map(([status, amount]) => (
              <div
                key={status}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="text-slate-500">
                  {DEAL_STATUS_LABELS[status] ?? status}
                </span>
                <span className="tabular-nums text-slate-700">
                  {YEN(amount)}
                </span>
              </div>
            ))}
            {statuses.length === 0 && (
              <p className="text-[12px] text-slate-400">
                確度が入力された案件がありません
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 経路別 */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-semibold text-slate-500">
            経路別
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {stats.bySource.map((s) => (
              <div
                key={s.source}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="text-slate-600">
                  {s.source}
                  <span className="ml-1 text-slate-400">{s.count}件</span>
                </span>
                <span className="tabular-nums text-slate-700">
                  {YEN(s.amount)}
                </span>
              </div>
            ))}
            {stats.bySource.length === 0 && (
              <p className="text-[12px] text-slate-400">案件がありません</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 今週動かすべき案件 */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold text-slate-500">
            動かすべき案件
            {needsAction > 0 && (
              <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">
                {needsAction}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {needsAction === 0 ? (
            <p className="text-[12px] text-slate-400">
              放置・期限超過はありません
            </p>
          ) : (
            <div className="space-y-1.5">
              {stats.overdue.slice(0, 3).map((o) => (
                <Link
                  key={o.id}
                  href={`/deals/${o.id}`}
                  className="block rounded-md px-1 py-0.5 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-1.5 text-[12px]">
                    <span className="shrink-0 rounded bg-rose-50 px-1 text-[11px] font-medium text-rose-700">
                      期限
                    </span>
                    <span className="truncate text-slate-700">{o.title}</span>
                  </div>
                  <div className="truncate pl-1 text-[11px] text-slate-400">
                    {o.nextAction}
                  </div>
                </Link>
              ))}
              {stats.stale.slice(0, 3).map((s) => (
                <Link
                  key={s.id}
                  href={`/deals/${s.id}`}
                  className="block rounded-md px-1 py-0.5 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-1.5 text-[12px]">
                    <span className="shrink-0 rounded bg-amber-50 px-1 text-[11px] font-medium text-amber-700 tabular-nums">
                      {s.days === null ? "未接触" : `${s.days}日`}
                    </span>
                    <span className="truncate text-slate-700">{s.title}</span>
                  </div>
                  <div className="truncate pl-1 text-[11px] text-slate-400">
                    {s.clientName}
                  </div>
                </Link>
              ))}
              {needsAction > 6 && (
                <Link
                  href="/deals"
                  className="block pt-1 text-[11px] text-indigo-600 hover:underline"
                >
                  ほか{needsAction - 6}件を見る
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
