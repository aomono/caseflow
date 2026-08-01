"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * 外部APIトークンの管理（C-2）。
 *
 * 発行した平文は**この画面に一度だけ出る**。DBにはハッシュしか無いので、
 * 閉じたら二度と見られない——その旨を画面にも書いておく（後から見られると
 * 思って控えないと、再発行の手間になる）。
 */

type Token = {
  id: string;
  name: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

function formatDate(v: string | null): string {
  if (!v) return "-";
  return new Date(v).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ApiTokens() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<{ name: string; token: string } | null>(
    null,
  );
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/tokens");
      if (res.ok) setTokens(await res.json());
    } catch {
      // 一覧が取れなくても発行はできる。ここでは黙って空にする
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function issue() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIssuing(true);
    setError("");
    try {
      const res = await fetch("/api/settings/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "failed");
      setIssued({ name: body.name, token: body.token });
      setName("");
      load();
    } catch {
      setError("発行できませんでした");
    } finally {
      setIssuing(false);
    }
  }

  async function revoke(id: string, tokenName: string) {
    if (!confirm(`「${tokenName}」のトークンを失効させますか？`)) return;
    try {
      const res = await fetch(`/api/settings/tokens?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
      load();
    } catch {
      setError("失効できませんでした");
    }
  }

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold text-slate-800">
          外部APIトークン
        </CardTitle>
        <p className="mt-0.5 text-[12px] text-slate-400">
          エージェント連携（案件の更新・照会）に使います。利用者ごとに別々に
          発行してください——誰がどれだけ使ったかを追えるようにするためです。
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 発行 */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") issue();
            }}
            placeholder="発行先の名前（例: kioi）"
            className="w-56"
          />
          <button
            onClick={issue}
            disabled={issuing || !name.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {issuing ? "発行中…" : "発行"}
          </button>
        </div>

        {error && <p className="text-[12px] text-rose-600">{error}</p>}

        {/* 発行直後だけ平文を出す */}
        {issued && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <p className="text-[12px] font-medium text-amber-800">
              「{issued.name}」のトークンを発行しました。
              <strong>この画面を閉じると二度と表示できません。</strong>
              いま控えてください。
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded border border-amber-200 bg-white px-2 py-1 font-mono text-[12px] text-slate-800">
                {issued.token}
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText(issued.token)}
                className="shrink-0 rounded-md border border-amber-300 px-2 py-1 text-[12px] text-amber-800 hover:bg-amber-100"
              >
                コピー
              </button>
              <button
                onClick={() => setIssued(null)}
                className="shrink-0 rounded-md px-2 py-1 text-[12px] text-slate-500 hover:text-slate-700"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* 一覧 */}
        {loading ? (
          <div className="skeleton h-16 w-full rounded-lg" />
        ) : tokens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center">
            <p className="text-[13px] font-medium text-slate-400">
              発行済みのトークンはありません
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-slate-800">
                      {t.name}
                    </span>
                    {t.revokedAt && (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                        失効済み
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] tabular-nums text-slate-400">
                    発行 {formatDate(t.createdAt)} / 最終利用{" "}
                    {formatDate(t.lastUsedAt)}
                  </div>
                </div>
                {!t.revokedAt && (
                  <button
                    onClick={() => revoke(t.id, t.name)}
                    className="shrink-0 rounded-md px-2 py-1 text-[12px] text-rose-600 hover:bg-rose-50"
                  >
                    失効
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
