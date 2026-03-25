"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

type Client = {
  id: string;
  name: string;
};

type DealFormProps = {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    clientId: string;
    title: string;
    status: string;
    monthlyAmount: number | null;
    description: string | null;
    contractStartDate: string | null;
    contractEndDate: string | null;
    contractSummary: string | null;
  };
};

const statusOptions = [
  { value: "lead", label: "リード" },
  { value: "discussion", label: "協議中" },
  { value: "expected", label: "受注見込み" },
  { value: "active", label: "稼働中" },
  { value: "renewal", label: "更新交渉" },
  { value: "closed", label: "終了" },
  { value: "lost", label: "失注" },
];

export default function DealForm({ mode, initialData }: DealFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  const [clientId, setClientId] = useState(initialData?.clientId ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "lead");
  const [monthlyAmount, setMonthlyAmount] = useState(
    initialData?.monthlyAmount?.toString() ?? ""
  );
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [contractStartDate, setContractStartDate] = useState(
    initialData?.contractStartDate ?? ""
  );
  const [contractEndDate, setContractEndDate] = useState(
    initialData?.contractEndDate ?? ""
  );
  const [contractSummary, setContractSummary] = useState(
    initialData?.contractSummary ?? ""
  );

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch(() => setClients([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = {
      clientId,
      title: title.trim(),
      status,
      monthlyAmount: monthlyAmount ? parseInt(monthlyAmount, 10) : null,
      description: description.trim() || null,
      contractStartDate: contractStartDate
        ? new Date(contractStartDate).toISOString()
        : null,
      contractEndDate: contractEndDate
        ? new Date(contractEndDate).toISOString()
        : null,
      contractSummary: contractSummary.trim() || null,
    };

    try {
      const url =
        mode === "create" ? "/api/deals" : `/api/deals/${initialData!.id}`;
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
        router.push("/deals");
      } else {
        router.push(`/deals/${initialData!.id}`);
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
            {mode === "create" ? "案件新規作成" : "案件編集"}
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
              <label htmlFor="clientId" className="text-sm font-medium">
                クライアント <span className="text-red-500">*</span>
              </label>
              <select
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="">選択してください</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="title" className="text-sm font-medium">
                案件名 <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="案件名を入力"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="status" className="text-sm font-medium">
                ステータス
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="monthlyAmount" className="text-sm font-medium">
                月額金額
              </label>
              <Input
                id="monthlyAmount"
                type="number"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                placeholder="800000"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="description" className="text-sm font-medium">
                概要
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                placeholder="案件の概要"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="contractStartDate"
                  className="text-sm font-medium"
                >
                  契約開始日
                </label>
                <Input
                  id="contractStartDate"
                  type="date"
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="contractEndDate"
                  className="text-sm font-medium"
                >
                  契約終了日
                </label>
                <Input
                  id="contractEndDate"
                  type="date"
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="contractSummary" className="text-sm font-medium">
                契約概要
              </label>
              <textarea
                id="contractSummary"
                value={contractSummary}
                onChange={(e) => setContractSummary(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                placeholder="契約の概要"
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
