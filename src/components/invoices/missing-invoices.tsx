"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * 請求漏れの疑い。
 *
 * カットオーバー以降の過去月で Invoice が無い実働中/完了の案件＝**請求し忘れ**
 * の可能性が高い。実績にも計上されていない（請求書発行基準）ので、売上から
 * 落ちたままになる。毎月末の請求業務のチェックリストとして使う。
 *
 * カットオーバー以前の分は数字に影響しない（フォールバックが効いている）ので、
 * 「移行の残り」として畳んで出す——急ぎではないものを同じ強さで見せると、
 * 急ぎのほうが埋もれる。
 */

type Missing = {
  dealId: string;
  dealTitle: string;
  clientName: string;
  month: string;
  status: string;
  expectedAmount: number;
  beforeCutover: boolean;
};

export function MissingInvoices() {
  const [items, setItems] = useState<Missing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOld, setShowOld] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setItems(data?.missingInvoices ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || items.length === 0) return null;

  const urgent = items.filter((m) => !m.beforeCutover);
  const old = items.filter((m) => m.beforeCutover);

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
          請求漏れの疑い
          {urgent.length > 0 && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
              {urgent.length}
            </span>
          )}
        </CardTitle>
        <p className="mt-0.5 text-[12px] text-slate-400">
          過去の月なのに請求が登録されていない案件です。売上にも計上されていません。
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {urgent.length === 0 ? (
          <p className="text-[12px] text-slate-400">請求漏れはありません</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {urgent.map((m) => (
              <li
                key={`${m.dealId}-${m.month}`}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/deals/${m.dealId}`}
                    className="text-[13px] font-medium text-indigo-600 hover:underline"
                  >
                    {m.dealTitle}
                  </Link>
                  <div className="text-[11px] text-slate-400">
                    {m.clientName} / {m.month}
                  </div>
                </div>
                <span className="shrink-0 tabular-nums text-[12px] text-slate-600">
                  ¥{m.expectedAmount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}

        {old.length > 0 && (
          <div>
            <button
              onClick={() => setShowOld((v) => !v)}
              className="text-[12px] text-slate-500 hover:text-slate-700"
            >
              {showOld ? "▾" : "▸"} 移行の残り {old.length}件
              <span className="ml-1 text-slate-400">（売上には影響しません）</span>
            </button>
            {showOld && (
              <ul className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-100">
                {old.map((m) => (
                  <li
                    key={`${m.dealId}-${m.month}`}
                    className="flex items-center justify-between gap-2 px-3 py-1.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/deals/${m.dealId}`}
                        className="text-[12px] text-slate-600 hover:underline"
                      >
                        {m.dealTitle}
                      </Link>
                      <span className="ml-1 text-[11px] text-slate-400">
                        {m.clientName} / {m.month}
                      </span>
                    </div>
                    <span className="shrink-0 tabular-nums text-[11px] text-slate-500">
                      ¥{m.expectedAmount.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
