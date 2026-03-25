"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type ActivityFormProps = {
  dealId: string;
};

const typeOptions = [
  { value: "meeting", label: "打ち合わせ" },
  { value: "email", label: "メール" },
  { value: "phone", label: "電話" },
  { value: "note", label: "メモ" },
];

export default function ActivityForm({ dealId }: ActivityFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState("meeting");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [summary, setSummary] = useState("");

  function resetForm() {
    setType("meeting");
    setDate(new Date().toISOString().split("T")[0]);
    setSummary("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          date,
          summary: summary.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存に失敗しました");
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>追加</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>やりとりを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {error && (
              <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="activity-type" className="text-sm font-medium">
                種別 <span className="text-red-500">*</span>
              </label>
              <select
                id="activity-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="activity-date" className="text-sm font-medium">
                日付 <span className="text-red-500">*</span>
              </label>
              <Input
                id="activity-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="activity-summary"
                className="text-sm font-medium"
              >
                内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="activity-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                placeholder="やりとりの内容を入力"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "保存中..." : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
