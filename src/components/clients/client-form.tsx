"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

type ClientFormProps = {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    industry: string | null;
    referredBy: string | null;
    notes: string | null;
  };
};

export default function ClientForm({ mode, initialData }: ClientFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.name ?? "");
  const [industry, setIndustry] = useState(initialData?.industry ?? "");
  const [referredBy, setReferredBy] = useState(initialData?.referredBy ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body = {
      name: name.trim(),
      industry: industry.trim() || null,
      referredBy: referredBy.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      const url =
        mode === "create"
          ? "/api/clients"
          : `/api/clients/${initialData!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存に失敗しました");
      }

      if (mode === "create") {
        router.push("/clients");
      } else {
        router.push(`/clients/${initialData!.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "クライアント新規作成" : "クライアント編集"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                名前 <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="株式会社〇〇"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="industry" className="text-sm font-medium">
                業種
              </label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="IT、コンサルティングなど"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="referredBy" className="text-sm font-medium">
                紹介元
              </label>
              <Input
                id="referredBy"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
                placeholder="紹介者名"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="notes" className="text-sm font-medium">
                メモ
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                placeholder="備考・メモ"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
