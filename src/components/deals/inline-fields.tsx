"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { PROBABILITY_LABELS, isOverdue, type Probability } from "@/lib/pipeline";

/**
 * 一覧・ボードのその場で編集する部品（B-2）。
 *
 * 詳細ページに遷移させない。ステータスや確度の更新は「会議のあと30秒」の
 * 大半を占める操作なので、遷移とフォーム保存を挟むと更新されなくなる。
 *
 * 保存は PATCH（触れる列を絞ったエンドポイント）。失敗したら元の値に戻して
 * トーストで知らせる——黙って戻すと「保存された」と誤解される。
 */
async function patchDeal(
  id: string,
  body: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const PROBABILITY_STYLES: Record<Probability, string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  mid: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};

export function ProbabilitySelect({
  dealId,
  value,
  onSaved,
}: {
  dealId: string;
  value: Probability | null;
  onSaved?: (v: Probability | null) => void;
}) {
  const { toast } = useToast();
  const [current, setCurrent] = useState<Probability | "">(value ?? "");
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    const prev = current;
    setCurrent(next as Probability | "");
    setSaving(true);
    const ok = await patchDeal(dealId, { probability: next });
    setSaving(false);
    if (ok) {
      onSaved?.((next || null) as Probability | null);
    } else {
      setCurrent(prev); // 保存できていないのに表示だけ変えない
      toast("確度を保存できませんでした", "error");
    }
  }

  const style = current
    ? PROBABILITY_STYLES[current as Probability]
    : "bg-white text-slate-400 border-slate-200";

  return (
    <select
      aria-label="確度"
      value={current}
      disabled={saving}
      onChange={(e) => change(e.target.value)}
      className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${style} disabled:opacity-50`}
    >
      <option value="">-</option>
      {(Object.keys(PROBABILITY_LABELS) as Probability[]).map((p) => (
        <option key={p} value={p}>
          {PROBABILITY_LABELS[p]}
        </option>
      ))}
    </select>
  );
}

export function NextActionCell({
  dealId,
  action,
  date,
  onSaved,
}: {
  dealId: string;
  action: string | null;
  date: string | null;
  onSaved?: (action: string | null, date: string | null) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(action ?? "");
  const [due, setDue] = useState(date ? date.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const ok = await patchDeal(dealId, {
      nextAction: text,
      nextActionDate: due,
    });
    setSaving(false);
    if (ok) {
      setEditing(false);
      onSaved?.(text || null, due || null);
    } else {
      toast("次アクションを保存できませんでした", "error");
    }
  }

  function cancel() {
    setText(action ?? "");
    setDue(date ? date.slice(0, 10) : "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        <input
          autoFocus
          aria-label="次アクション"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder="次にやること"
          className="w-40 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <input
          type="date"
          aria-label="次アクションの期日"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="rounded-md border border-slate-200 px-2 py-1 text-sm tabular-nums focus:border-indigo-400 focus:outline-none"
        />
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          保存
        </button>
        <button
          onClick={cancel}
          className="rounded-md px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
        >
          取消
        </button>
      </div>
    );
  }

  const overdue = isOverdue(date);
  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex flex-col items-start gap-0.5 text-left"
      title="クリックして編集"
    >
      <span
        className={
          action ? "text-sm text-slate-700" : "text-sm text-slate-300"
        }
      >
        {action || "次アクションを追加"}
      </span>
      {date && (
        <span
          className={`text-xs tabular-nums ${
            overdue ? "font-medium text-rose-600" : "text-slate-400"
          }`}
        >
          {new Date(date).toLocaleDateString("ja-JP")}
          {overdue ? " 期限超過" : ""}
        </span>
      )}
    </button>
  );
}

/**
 * クイックメモ（B-3）。入力1回＋Enterで Activity(note) を1件足す。
 *
 * 種別と日付は選ばせない。会議のあとに「今日・メモ」以外を選ぶ場面はほぼ
 * 無く、選択肢が増えるほど書かれなくなる。
 */
export function QuickNote({
  dealId,
  onSaved,
}: {
  dealId: string;
  onSaved?: (at: string) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const summary = text.trim();
    if (!summary) return;
    setSaving(true);
    const now = new Date();
    try {
      const res = await fetch(`/api/deals/${dealId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "note",
          date: now.toISOString(),
          summary,
        }),
      });
      if (res.ok) {
        setText("");
        setOpen(false);
        onSaved?.(now.toISOString());
        toast("メモを追加しました", "success");
      } else {
        toast("メモを追加できませんでした", "error");
      }
    } catch {
      toast("メモを追加できませんでした", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        title="メモを追加"
      >
        ＋メモ
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        aria-label="クイックメモ"
        value={text}
        disabled={saving}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setText("");
            setOpen(false);
          }
        }}
        placeholder="メモを入力してEnter"
        className="w-48 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none disabled:opacity-50"
      />
      <button
        onClick={() => {
          setText("");
          setOpen(false);
        }}
        className="rounded-md px-1.5 py-1 text-xs text-slate-400 hover:text-slate-600"
      >
        ✕
      </button>
    </div>
  );
}
