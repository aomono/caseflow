"use client";

export const dynamic = "force-dynamic";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import type {
  CashflowRow,
  CostCategory,
  ForecastMatrix,
} from "@/lib/forecast";

type Payload = {
  fy: number;
  weighted: boolean;
  matrix: ForecastMatrix;
  cashflow: CashflowRow[];
  fiscalYears: number[];
};

const YEN = (n: number) => (n === 0 ? "-" : `¥${n.toLocaleString()}`);

function monthLabel(m: string): string {
  return `${Number(m.split("-")[1])}月`;
}

/** セルの種別で見た目を変える。実績・受注済み・見込みが混ざる表なので */
const CELL_STYLE: Record<string, string> = {
  actual: "text-slate-900 font-medium",
  contracted: "text-slate-700",
  prospect: "text-slate-400 italic",
};

const COST_LABELS: Record<CostCategory, string> = {
  payment: "支払い",
  execComp: "役員報酬",
  expense: "経費",
};

export default function ForecastPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fy, setFy] = useState<number | null>(null);
  const [weighted, setWeighted] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fy !== null) params.set("fy", String(fy));
      if (weighted) params.set("weighted", "1");
      const res = await fetch(`/api/forecast?${params}`);
      if (res.ok) {
        const body = await res.json();
        setData(body);
        if (fy === null) setFy(body.fy);
      }
    } catch {
      // 一覧が出せないときは空のまま。トーストは出さない（初期表示で驚かせない）
    } finally {
      setLoading(false);
    }
  }, [fy, weighted]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveOverride(month: string, category: CostCategory, raw: string) {
    const amount = Number(raw.replace(/[^\d]/g, ""));
    if (!Number.isInteger(amount) || amount < 0) {
      toast("金額の形式が正しくありません", "error");
      return;
    }
    try {
      const res = await fetch("/api/forecast/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, category, amount }),
      });
      if (!res.ok) throw new Error();
      setEditing(null);
      load();
    } catch {
      toast("保存できませんでした", "error");
    }
  }

  async function resetOverride(month: string, category: CostCategory) {
    try {
      const res = await fetch(
        `/api/forecast/overrides?month=${month}&category=${category}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      setEditing(null);
      load();
    } catch {
      toast("戻せませんでした", "error");
    }
  }

  const matrix = data?.matrix;
  const months = matrix?.months ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-slate-900">
            年度計画
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-400">
            経路別の月次売上と資金繰り（FYは6月始まり）
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(data?.fiscalYears ?? []).map((y) => (
            <button
              key={y}
              onClick={() => setFy(y)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                data?.fy === y
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:text-slate-700"
              }`}
            >
              FY{String(y).slice(2)}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-1.5 text-[13px] text-slate-600">
            <input
              type="checkbox"
              checked={weighted}
              onChange={(e) => setWeighted(e.target.checked)}
            />
            加重見込み
          </label>
        </div>
      </div>

      {loading && <div className="skeleton h-64 w-full rounded-xl" />}

      {!loading && matrix && (
        <>
          {/* 売上マトリクス。横スクロールはこのコンテナの中だけで起こす */}
          <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    案件
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      className="px-2 py-2 text-right text-[11px] font-semibold text-slate-400"
                    >
                      {monthLabel(m)}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400">
                    年間
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.groups.map((g) => (
                  // Fragment に key を付ける（<> では付けられず、実行時に警告になる）
                  <Fragment key={g.source}>
                    <tr className="bg-slate-50/70">
                      <td className="sticky left-0 z-10 bg-slate-50/70 px-3 py-1.5 text-[12px] font-semibold text-slate-600">
                        {g.source}
                      </td>
                      {months.map((m) => (
                        <td
                          key={m}
                          className="px-2 py-1.5 text-right tabular-nums text-[12px] text-slate-600"
                        >
                          {YEN(g.monthTotals[m] ?? 0)}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-right tabular-nums text-[12px] font-semibold text-slate-700">
                        {YEN(g.total)}
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.dealId} className="border-b border-slate-50">
                        <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                          <Link
                            href={`/deals/${r.dealId}`}
                            className="text-[12px] text-indigo-600 hover:underline"
                          >
                            {r.dealTitle}
                          </Link>
                          <span className="ml-1 text-[11px] text-slate-400">
                            {r.clientName}
                          </span>
                          <span className="ml-1 text-[10px] text-slate-300">
                            {DEAL_STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </td>
                        {months.map((m) => {
                          const cell = r.cells[m];
                          return (
                            <td
                              key={m}
                              className={`px-2 py-1.5 text-right tabular-nums ${
                                cell ? CELL_STYLE[cell.kind] : "text-slate-200"
                              } ${cell?.kind === "actual" ? "bg-emerald-50/40" : ""}`}
                            >
                              {cell ? YEN(cell.amount) : "-"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">
                          {YEN(r.total)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr className="border-t-2 border-slate-200 bg-white font-semibold">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-[12px] text-slate-700">
                    月別合計
                  </td>
                  {months.map((m) => (
                    <td
                      key={m}
                      className="px-2 py-2 text-right tabular-nums text-slate-800"
                    >
                      {YEN(matrix.monthTotals[m] ?? 0)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums text-slate-900">
                    {YEN(matrix.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-100" />
              実績（請求済み）
            </span>
            <span className="text-slate-700">受注済みの予測</span>
            <span className="italic text-slate-400">見込みの予測</span>
          </div>

          {/* 資金繰り */}
          <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    資金繰り
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      className="px-2 py-2 text-right text-[11px] font-semibold text-slate-400"
                    >
                      {monthLabel(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-50">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-[12px] text-slate-600">
                    売上合計
                  </td>
                  {(data?.cashflow ?? []).map((c) => (
                    <td
                      key={c.month}
                      className="px-2 py-1.5 text-right tabular-nums text-slate-700"
                    >
                      {YEN(c.revenue)}
                    </td>
                  ))}
                </tr>

                {(["payment", "execComp", "expense"] as CostCategory[]).map(
                  (cat) => (
                    <tr key={cat} className="border-b border-slate-50">
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-[12px] text-slate-600">
                        {COST_LABELS[cat]}
                      </td>
                      {(data?.cashflow ?? []).map((c) => {
                        const id = `${c.month}:${cat}`;
                        const isOverridden = c.overridden.includes(cat);
                        if (editing === id) {
                          return (
                            <td key={c.month} className="px-1 py-1">
                              <input
                                autoFocus
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    saveOverride(c.month, cat, draft);
                                  if (e.key === "Escape") setEditing(null);
                                }}
                                onBlur={() => saveOverride(c.month, cat, draft)}
                                className="w-full rounded border border-indigo-300 px-1 py-0.5 text-right text-[12px] tabular-nums focus:outline-none"
                              />
                            </td>
                          );
                        }
                        return (
                          <td
                            key={c.month}
                            onClick={() => {
                              setEditing(id);
                              setDraft(String(c[cat]));
                            }}
                            title={
                              isOverridden
                                ? "この月だけ上書きしています（クリックで編集）"
                                : "クリックで編集"
                            }
                            className={`relative cursor-pointer px-2 py-1.5 text-right tabular-nums hover:bg-indigo-50/50 ${
                              isOverridden ? "text-indigo-700" : "text-slate-600"
                            }`}
                          >
                            {isOverridden && (
                              <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            )}
                            {YEN(c[cat])}
                          </td>
                        );
                      })}
                    </tr>
                  ),
                )}

                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="sticky left-0 z-10 bg-slate-50/50 px-3 py-1.5 text-[12px] font-medium text-slate-700">
                    単月収支
                  </td>
                  {(data?.cashflow ?? []).map((c) => (
                    <td
                      key={c.month}
                      className={`px-2 py-1.5 text-right tabular-nums ${
                        c.net < 0 ? "text-rose-600" : "text-slate-700"
                      }`}
                    >
                      {YEN(c.net)}
                    </td>
                  ))}
                </tr>
                <tr className="font-semibold">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-[12px] text-slate-700">
                    残高
                  </td>
                  {(data?.cashflow ?? []).map((c) => (
                    <td
                      key={c.month}
                      className={`px-2 py-2 text-right tabular-nums ${
                        c.balance < 0 ? "text-rose-600" : "text-slate-900"
                      }`}
                    >
                      {YEN(c.balance)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-[11px] text-slate-400">
            <p>
              費用のセルはクリックでその月だけ上書きできます（点付き＝上書き中）。
              既定値は設定画面で変更します。
              {editing && (
                <button
                  onClick={() => {
                    const [m, c] = editing.split(":");
                    resetOverride(m, c as CostCategory);
                  }}
                  className="ml-2 text-indigo-600 hover:underline"
                >
                  このセルを既定値に戻す
                </button>
              )}
            </p>
            <p>
              売上は<strong>請求書発行基準</strong>です。入金タイミングのズレ
              （売掛サイト）は反映していません。
            </p>
          </div>

          {/* 予測に乗らない案件。黙って消さない */}
          {matrix.excluded.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
              <p className="text-[13px] font-medium text-amber-800">
                予測に乗っていない案件（{matrix.excluded.length}件）
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700">
                契約期間や金額が未入力のため、上の表に含まれていません。
              </p>
              <ul className="mt-2 space-y-0.5">
                {matrix.excluded.map((e) => (
                  <li key={e.dealId} className="text-[12px]">
                    <Link
                      href={`/deals/${e.dealId}`}
                      className="text-indigo-700 hover:underline"
                    >
                      {e.dealTitle}
                    </Link>
                    <span className="ml-1 text-slate-500">{e.clientName}</span>
                    <span className="ml-2 text-amber-700">{e.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
