"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * 資金繰りの月次既定値と期首繰越（年度計画で使う）。
 *
 * ここは「毎月これくらい」の既定値。特定の月だけ違う場合は年度計画の表の上で
 * セルを直接上書きする（そちらが優先される）。
 */

const FIELDS = [
  { key: "monthlyPayment", label: "支払い", hint: "外注費・仕入など" },
  { key: "monthlyExecComp", label: "役員報酬", hint: "" },
  { key: "monthlyExpense", label: "経費", hint: "家賃・通信・その他" },
  { key: "openingBalance", label: "期首繰越", hint: "年度はじめの残高" },
] as const;

type Key = (typeof FIELDS)[number]["key"];

export function CashflowDefaults() {
  const [values, setValues] = useState<Record<Key, string>>({
    monthlyPayment: "",
    monthlyExecComp: "",
    monthlyExpense: "",
    openingBalance: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!s) return;
        setValues({
          monthlyPayment: String(s.monthlyPayment ?? 0),
          monthlyExecComp: String(s.monthlyExecComp ?? 0),
          monthlyExpense: String(s.monthlyExpense ?? 0),
          openingBalance: String(s.openingBalance ?? 0),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, number> = {};
      for (const f of FIELDS) {
        const n = Number(values[f.key].replace(/[^\d]/g, ""));
        if (!Number.isInteger(n) || n < 0) {
          setMessage({ ok: false, text: `${f.label}の金額が正しくありません` });
          setSaving(false);
          return;
        }
        body[f.key] = n;
      }
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setMessage({ ok: true, text: "保存しました" });
    } catch {
      setMessage({ ok: false, text: "保存できませんでした" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold text-slate-800">
          資金繰りの既定値
        </CardTitle>
        <p className="mt-0.5 text-[12px] text-slate-400">
          年度計画の資金繰りで使う「毎月これくらい」の金額です。特定の月だけ
          違う場合は、年度計画の表の上でセルを直接編集してください（そちらが
          優先されます）。
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="skeleton h-24 w-full rounded-lg" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-[12px] font-medium text-slate-600">
                    {f.label}
                    {f.hint && (
                      <span className="ml-1 text-[11px] text-slate-400">
                        {f.hint}
                      </span>
                    )}
                  </span>
                  <Input
                    value={values[f.key]}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                    inputMode="numeric"
                    className="mt-1 text-right tabular-nums"
                  />
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
              {message && (
                <span
                  className={`text-[12px] ${
                    message.ok ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {message.text}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
