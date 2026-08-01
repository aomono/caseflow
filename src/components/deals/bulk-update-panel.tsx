"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { PROBABILITY_LABELS } from "@/lib/pipeline";
import type { DealBrief, Suggestion } from "@/lib/bulk-update";

/**
 * 貼り付け一括更新（C-1）。
 *
 * 流れは 貼り付け → 確認 → 反映 の3操作（受け入れ基準2）。
 * **確認画面を必ず挟む**。提案は既定でチェックが入っているが、外したものは
 * 台帳に触れない（受け入れ基準5）。照合できなかった提案は案件を選ばない限り
 * 反映できない——推測で紐付けると台帳が壊れるので、選ばせる。
 */

type Editable = Suggestion & { checked: boolean };

function describe(s: Suggestion): string {
  switch (s.kind) {
    case "status":
      return `ステータスを「${DEAL_STATUS_LABELS[s.value ?? ""] ?? s.value}」に`;
    case "probability":
      return `確度を「${PROBABILITY_LABELS[s.value as "high"] ?? s.value}」に`;
    case "nextAction":
      return `次アクション「${s.action}」${s.date ? `（期日 ${s.date}）` : ""}`;
    case "activity":
      return `メモを追加「${s.summary}」`;
    case "newDeal":
      return `新規案件「${s.title}」（${s.clientName}）`;
    default:
      return s.kind;
  }
}

export function BulkUpdatePanel({ onApplied }: { onApplied?: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<Editable[] | null>(null);
  const [deals, setDeals] = useState<DealBrief[]>([]);

  async function analyze() {
    if (!text.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/deals/bulk-update/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("failed");
      const body = await res.json();
      setDeals(body.deals ?? []);
      setSuggestions(
        (body.suggestions ?? []).map((s: Suggestion) => ({
          ...s,
          // 照合できていないものは既定で外しておく。選ばせてから入れる
          checked: s.kind === "newDeal" ? true : s.dealId !== null,
        })),
      );
      if ((body.suggestions ?? []).length === 0) {
        toast("更新すべき内容は見つかりませんでした", "info");
      }
    } catch {
      toast("解析できませんでした", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  async function applyChecked() {
    if (!suggestions) return;
    const picked = suggestions
      .filter((s) => s.checked)
      .filter((s) => s.kind === "newDeal" || s.dealId) // 未照合は送らない
      // checked は画面の状態なので送らない。APIが読む項目だけ組み立てる
      .map((s) => ({
        kind: s.kind,
        dealId: s.dealId,
        value: s.value,
        action: s.action,
        date: s.date,
        summary: s.summary,
        title: s.title,
        clientName: s.clientName,
      }));
    if (picked.length === 0) {
      toast("反映する項目がありません", "info");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/deals/bulk-update/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions: picked }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error("failed");
      const failed = (body.results ?? []).filter(
        (r: { ok: boolean }) => !r.ok,
      ).length;
      toast(
        failed
          ? `${body.applied}件を反映（${failed}件は失敗）`
          : `${body.applied}件を反映しました`,
        failed ? "info" : "success",
      );
      setSuggestions(null);
      setText("");
      onApplied?.();
    } catch {
      toast("反映できませんでした", "error");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">
        貼り付けて一括更新
      </h2>
      <p className="mt-0.5 text-xs text-slate-400">
        会議メモやチャットの抜粋を貼ると、更新の提案を作ります。反映する前に
        確認できます。
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="例）A社と定例。受注見込みになった。来週までに見積書を送る。B社は先方都合で保留。"
        className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-indigo-400 focus:outline-none"
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={analyze}
          disabled={analyzing || !text.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {analyzing ? "解析中…" : "解析する"}
        </button>
        {suggestions && (
          <button
            onClick={() => {
              setSuggestions(null);
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            提案を破棄
          </button>
        )}
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-500">
            反映する項目を選んでください（{suggestions.length}件の提案）
          </p>

          {suggestions.map((s, i) => {
            const target = deals.find((d) => d.id === s.dealId);
            const unresolved = s.kind !== "newDeal" && !s.dealId;
            return (
              <div
                key={i}
                className={`rounded-lg border p-2 ${
                  unresolved
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-slate-100"
                }`}
              >
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={s.checked}
                    disabled={unresolved}
                    onChange={(e) =>
                      setSuggestions((prev) =>
                        prev!.map((x, j) =>
                          j === i ? { ...x, checked: e.target.checked } : x,
                        ),
                      )
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-700">{describe(s)}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {target
                        ? `${target.clientName} / ${target.title}`
                        : s.kind === "newDeal"
                          ? "新規作成"
                          : `対象が特定できません${s.mentioned ? `（「${s.mentioned}」）` : ""}`}
                    </div>
                    {s.reason && (
                      <div className="mt-0.5 text-xs text-slate-400">
                        根拠: {s.reason}
                      </div>
                    )}
                  </div>
                </label>

                {unresolved && (
                  <div className="mt-1.5 pl-6">
                    <select
                      aria-label="対象の案件を選ぶ"
                      defaultValue=""
                      onChange={(e) => {
                        const dealId = e.target.value || null;
                        setSuggestions((prev) =>
                          prev!.map((x, j) =>
                            j === i
                              ? { ...x, dealId, checked: Boolean(dealId) }
                              : x,
                          ),
                        );
                      }}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="">案件を選ぶ…</option>
                      {deals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.clientName} / {d.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={applyChecked}
            disabled={applying}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {applying ? "反映中…" : "選んだ項目を反映"}
          </button>
        </div>
      )}
    </div>
  );
}
