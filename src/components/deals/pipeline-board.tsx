"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { FreshnessBadge } from "@/components/deals/freshness-badge";
import {
  NextActionCell,
  ProbabilitySelect,
  QuickNote,
} from "@/components/deals/inline-fields";
import type { Probability } from "@/lib/pipeline";

export type BoardDeal = {
  id: string;
  title: string;
  status: string;
  monthlyAmount: number | null;
  billingType: "monthly" | "lumpsum" | "prorated";
  contractAmount: number | null;
  probability: Probability | null;
  nextAction: string | null;
  nextActionDate: string | null;
  lastActivityAt: string | null;
  client: { id: string; name: string };
};

/** 列＝ステータス。終了・失注はボードに出さない（動いている案件だけ見たい） */
const COLUMNS = ["lead", "discussion", "expected", "active", "renewal"];

function amountOf(deal: BoardDeal): string {
  if (deal.billingType === "lumpsum" && deal.contractAmount) {
    return `¥${deal.contractAmount.toLocaleString()}（一括）`;
  }
  if (deal.monthlyAmount) {
    return `¥${deal.monthlyAmount.toLocaleString()}/月`;
  }
  return "-";
}

/**
 * パイプラインボード（B-1）。
 *
 * ドラッグでステータスを変える。確認ダイアログは挟まない——1日に何度も動く
 * 操作なので、毎回確認を出すと結局ボードを使わなくなる。代わりに取り消せる
 * ようにする（Undoトースト）。
 */
export function PipelineBoard({
  deals,
  onChange,
}: {
  deals: BoardDeal[];
  onChange: (id: string, patch: Partial<BoardDeal>) => void;
}) {
  const { toast } = useToast();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ id: string; status: string } | null>(null);

  async function move(id: string, status: string, previous: string) {
    if (status === previous) return;
    onChange(id, { status }); // 先に画面を動かす（待たせない）
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("failed");
      setUndo({ id, status: previous });
      toast(`「${DEAL_STATUS_LABELS[status]}」に移しました`, "success");
    } catch {
      onChange(id, { status: previous }); // 保存できていないのに動かしたままにしない
      toast("ステータスを変更できませんでした", "error");
    }
  }

  async function revert() {
    if (!undo) return;
    const { id, status } = undo;
    setUndo(null);
    onChange(id, { status });
    try {
      await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      toast("元に戻せませんでした", "error");
    }
  }

  return (
    <div className="space-y-2">
      {undo && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
          <span className="text-slate-600">ステータスを変更しました</span>
          <button
            onClick={revert}
            className="rounded-md px-2 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            元に戻す
          </button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((status) => {
          const items = deals.filter((d) => d.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain") || dragging;
                const deal = deals.find((d) => d.id === id);
                if (deal) move(deal.id, status, deal.status);
                setDragging(null);
              }}
              className={`flex min-h-[12rem] w-72 shrink-0 flex-col rounded-xl border p-2 transition-colors ${
                over === status
                  ? "border-indigo-300 bg-indigo-50/50"
                  : "border-slate-100 bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {DEAL_STATUS_LABELS[status]}
                </span>
                <span className="tabular-nums text-xs text-slate-400">
                  {items.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {items.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", deal.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragging(deal.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={`cursor-grab rounded-lg border border-slate-100 bg-white p-2.5 shadow-sm transition-opacity active:cursor-grabbing ${
                      dragging === deal.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-sm font-medium text-indigo-600 hover:underline"
                      >
                        {deal.title}
                      </Link>
                      <FreshnessBadge lastActivityAt={deal.lastActivityAt} />
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {deal.client.name}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="tabular-nums text-xs text-slate-600">
                        {amountOf(deal)}
                      </span>
                      <ProbabilitySelect
                        dealId={deal.id}
                        value={deal.probability}
                        onSaved={(v) => onChange(deal.id, { probability: v })}
                      />
                    </div>
                    <div className="mt-1.5 border-t border-slate-50 pt-1.5">
                      <NextActionCell
                        dealId={deal.id}
                        action={deal.nextAction}
                        date={deal.nextActionDate}
                        onSaved={(a, d) =>
                          onChange(deal.id, {
                            nextAction: a,
                            nextActionDate: d,
                          })
                        }
                      />
                    </div>
                    <div className="mt-1">
                      <QuickNote
                        dealId={deal.id}
                        onSaved={(at) =>
                          onChange(deal.id, { lastActivityAt: at })
                        }
                      />
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">
                    ここにドラッグ
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
