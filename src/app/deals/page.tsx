"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { DEAL_STATUS_LABELS, DEAL_STATUS_COLORS, DEAL_STATUS_OPTIONS } from "@/lib/constants";
import { FreshnessBadge } from "@/components/deals/freshness-badge";
import {
  NextActionCell,
  ProbabilitySelect,
  QuickNote,
} from "@/components/deals/inline-fields";
import { PipelineBoard } from "@/components/deals/pipeline-board";
import { BulkUpdatePanel } from "@/components/deals/bulk-update-panel";
import type { Probability } from "@/lib/pipeline";

type Deal = {
  id: string;
  title: string;
  status: string;
  monthlyAmount: number | null;
  billingType: "monthly" | "lumpsum" | "prorated";
  contractAmount: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  probability: Probability | null;
  nextAction: string | null;
  nextActionDate: string | null;
  source: string | null;
  lastActivityAt: string | null;
  client: {
    id: string;
    name: string;
  };
};

type Client = { id: string; name: string };

export default function DealsPage() {
  const [view, setView] = useState<"list" | "board">("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then((data: Client[]) => setClients(data));
  }, []);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (clientFilter !== "all") params.set("clientId", clientFilter);
      const qs = params.toString();
      const res = await fetch(`/api/deals${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // 保存済みの値を手元にも反映する。一覧を取り直すと編集中のスクロール位置や
  // 他の行の編集状態が飛ぶので、成功したぶんだけ差し替える
  const patchLocal = useCallback((id: string, patch: Partial<Deal>) => {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ja-JP");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">案件一覧</h1>
          <p className="mt-1 text-sm text-slate-500">すべての案件を管理</p>
        </div>
        <Link href="/deals/new">
          <Button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700">新規作成</Button>
        </Link>
      </div>

      <BulkUpdatePanel onApplied={fetchDeals} />

      {/* View switch */}
      <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
        {([
          { value: "list", label: "一覧" },
          { value: "board", label: "ボード" },
        ] as const).map((v) => (
          <button
            key={v.value}
            onClick={() => setView(v.value)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
              view === v.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* ステータス絞り込み（ボードは列がステータスなので出さない） */}
        <div
          className={`flex-wrap gap-1 rounded-xl bg-slate-100 p-1 ${
            view === "board" ? "hidden" : "flex"
          }`}
        >
          {DEAL_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                statusFilter === opt.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Client filter */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setClientFilter("all")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
              clientFilter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            全クライアント
          </button>
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setClientFilter(c.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                clientFilter === c.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {view === "board" && !loading && (
        <PipelineBoard
          deals={deals}
          onChange={(id, patch) => patchLocal(id, patch)}
        />
      )}

      <div
        className={`overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm ${
          view === "board" ? "hidden" : ""
        }`}
      >
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">案件名</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">クライアント</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">ステータス</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">確度</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">次アクション</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">金額</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">契約期間</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">メモ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              deals.map((deal) => (
                <TableRow key={deal.id} className="border-slate-50 hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {deal.title}
                      </Link>
                      <FreshnessBadge lastActivityAt={deal.lastActivityAt} />
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{deal.client.name}</TableCell>
                  <TableCell>
                    <Badge className={`badge-pill ${DEAL_STATUS_COLORS[deal.status]}`}>
                      {DEAL_STATUS_LABELS[deal.status] || deal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ProbabilitySelect
                      dealId={deal.id}
                      value={deal.probability}
                      onSaved={(v) => patchLocal(deal.id, { probability: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <NextActionCell
                      dealId={deal.id}
                      action={deal.nextAction}
                      date={deal.nextActionDate}
                      onSaved={(a, d) =>
                        patchLocal(deal.id, { nextAction: a, nextActionDate: d })
                      }
                    />
                  </TableCell>
                  <TableCell className="tabular-nums text-slate-700">
                    {deal.billingType === "lumpsum" && deal.contractAmount
                      ? `\u00a5${deal.contractAmount.toLocaleString()}（一括）`
                      : deal.monthlyAmount
                        ? `\u00a5${deal.monthlyAmount.toLocaleString()}/月${deal.billingType === "prorated" ? "（日割り）" : ""}`
                        : "-"}
                  </TableCell>
                  <TableCell className="tabular-nums text-slate-600">
                    {deal.contractStartDate && deal.contractEndDate
                      ? `${formatDate(deal.contractStartDate)} ~ ${formatDate(deal.contractEndDate)}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <QuickNote
                      dealId={deal.id}
                      onSaved={(at) => patchLocal(deal.id, { lastActivityAt: at })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            {!loading && deals.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">💼</span>
                    <p>該当する案件がありません</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8">
                  <div className="flex flex-col gap-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="skeleton h-8 w-full" />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
