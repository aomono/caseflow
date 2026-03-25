"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface Deal {
  id: string;
  title: string;
  monthlyAmount: number | null;
  contractSummary: string | null;
  client: {
    name: string;
  };
}

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export default function ReportNewPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [period, setPeriod] = useState(`${new Date().getFullYear()}年${new Date().getMonth() + 1}月`);
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await fetch("/api/deals?status=active");
        const data: Deal[] = await res.json();
        setDeals(data);
        if (data.length > 0) {
          setSelectedDealId(data[0].id);
          if (data[0].monthlyAmount) setAmount(data[0].monthlyAmount);
          if (data[0].contractSummary) setContent(data[0].contractSummary);
        }
      } catch (err) {
        console.error("Failed to fetch deals:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  const selectedDeal = deals.find((d) => d.id === selectedDealId);
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleDealChange = (value: string | null) => {
    if (value === null) return;
    setSelectedDealId(value);
    const deal = deals.find((d) => d.id === value);
    if (deal?.monthlyAmount) {
      setAmount(deal.monthlyAmount);
    }
    if (deal?.contractSummary) {
      setContent(deal.contractSummary);
    } else {
      setContent("");
    }
  };

  const handleSave = async (): Promise<string | null> => {
    if (!selectedDealId || !period || !content || amount <= 0) {
      alert("全てのフィールドを入力してください");
      return null;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: selectedDealId,
          year,
          month,
          period,
          workDescription: content,
          amount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`保存に失敗しました: ${err.error}`);
        return null;
      }

      const report = await res.json();
      setSavedReportId(report.id);
      return report.id;
    } catch (err) {
      console.error("Failed to save report:", err);
      alert("保存に失敗しました");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOnly = async () => {
    const id = await handleSave();
    if (id) {
      alert("報告書を保存しました");
      router.push("/reports");
    }
  };

  const handleGeneratePdf = async () => {
    let reportId = savedReportId;

    if (!reportId) {
      reportId = await handleSave();
      if (!reportId) return;
    }

    setGeneratingPdf(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/pdf`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`PDF生成に失敗しました: ${err.error}`);
        return;
      }

      const data = await res.json();
      alert("PDF生成が完了しました");
      if (data.pdfUrl) {
        window.open(data.pdfUrl, "_blank");
      }
      router.push("/reports");
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("PDF生成に失敗しました");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-64 w-full rounded-xl" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">報告書 新規作成</h1>
        <p className="mt-1 text-sm text-slate-500">業務完了報告書を作成</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form */}
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">報告書情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">案件選択</label>
              <Select value={selectedDealId} onValueChange={handleDealChange}>
                <SelectTrigger className="w-full rounded-lg border-slate-200">
                  <SelectValue placeholder="案件を選択" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.client.name} - {deal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">年</label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="rounded-lg border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">月</label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="rounded-lg border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">対象期間</label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="例: 2026年3月"
                className="rounded-lg border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">作業内容</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="コンサルティング業務"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">金額</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="rounded-lg border-slate-200 tabular-nums"
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview - styled like a paper document */}
        <div>
          <h2 className="mb-4 font-heading text-base font-semibold tracking-tight text-slate-900">プレビュー</h2>
          <div className="rounded-xl bg-white p-8 shadow-lg ring-1 ring-slate-200/50" style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)" }}>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-heading text-lg font-bold text-slate-900">株式会社Asterio</h2>
                </div>
                <div className="text-sm text-slate-500">
                  発行日: {today}
                </div>
              </div>

              <Separator className="bg-slate-200" />

              <div className="text-sm">
                <p className="font-medium text-slate-700">
                  {selectedDeal?.client.name || "（クライアント未選択）"} 御中
                </p>
              </div>

              <h3 className="text-center font-heading text-xl font-bold tracking-tight text-slate-900">業務完了報告書</h3>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-medium text-slate-500">
                    対象期間
                  </span>
                  <span className="text-slate-900">{period || "-"}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-medium text-slate-500">
                    作業内容
                  </span>
                  <span className="text-slate-900">{content || "コンサルティング業務"}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-medium text-slate-500">金額</span>
                  <span className="font-heading text-lg font-bold tabular-nums text-slate-900">{formatAmount(amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleSaveOnly}
          disabled={saving}
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50"
        >
          {saving ? "保存中..." : "下書き保存"}
        </button>
        <button
          onClick={handleGeneratePdf}
          disabled={generatingPdf || saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700 disabled:opacity-50"
        >
          {generatingPdf ? "PDF生成中..." : "PDF生成"}
        </button>
      </div>
    </div>
  );
}
