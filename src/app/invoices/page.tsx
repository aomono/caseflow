"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from "@/lib/constants";

type Filter = "all" | "unpaid" | "paid";

interface Invoice {
  id: string;
  dealId: string;
  year: number;
  month: number;
  amount: number;
  workingDays: number | null;
  baseDays: number | null;
  dueDate: string;
  status: string;
  paidAt: string | null;
  deal: {
    title: string;
    client: {
      name: string;
    };
  };
}

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP");
}

export default function InvoicesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      if (filter === "unpaid") {
        const [sentRes, overdueRes] = await Promise.all([
          fetch(`/api/invoices?status=sent`),
          fetch(`/api/invoices?status=overdue`),
        ]);
        const sent: Invoice[] = await sentRes.json();
        const overdue: Invoice[] = await overdueRes.json();
        setInvoices([...sent, ...overdue].sort((a, b) => {
          // Sort: overdue first, then sent (unpaid)
          const statusOrder: Record<string, number> = { overdue: 0, sent: 1 };
          const oa = statusOrder[a.status] ?? 2;
          const ob = statusOrder[b.status] ?? 2;
          if (oa !== ob) return oa - ob;
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        }));
      } else {
        const url = filter === "paid"
          ? `/api/invoices?status=paid`
          : `/api/invoices`;
        const res = await fetch(url);
        const data: Invoice[] = await res.json();
        // Sort: overdue first, then sent (unpaid), then others
        const statusOrder: Record<string, number> = { overdue: 0, sent: 1 };
        data.sort((a, b) => {
          const oa = statusOrder[a.status] ?? 2;
          const ob = statusOrder[b.status] ?? 2;
          if (oa !== ob) return oa - ob;
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        setInvoices(data);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Clear message after a delay
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paidAt: new Date().toISOString() }),
      });
      if (res.ok) {
        await fetchInvoices();
      } else {
        console.error("Failed to mark invoice as paid:", res.statusText);
        setMessage({ text: "入金登録に失敗しました", type: "error" });
      }
    } catch (err) {
      console.error("Failed to mark invoice as paid:", err);
      setMessage({ text: "入金登録に失敗しました", type: "error" });
    }
  };

  const handleGenerateMonthly = async () => {
    const confirmed = window.confirm(`${currentYear}年${currentMonth}月の請求書を一括生成しますか？\n対象: 稼働中の全案件`);
    if (!confirmed) return;

    setGenerating(true);
    try {
      const now = new Date();
      const res = await fetch("/api/invoices/generate-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: now.getFullYear(), month: now.getMonth() + 1 }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage({ text: `${data.createdCount}件の請求書を生成しました`, type: "success" });
        await fetchInvoices();
      } else {
        console.error("Failed to generate monthly invoices:", res.statusText);
        setMessage({ text: "請求書の生成に失敗しました", type: "error" });
      }
    } catch (err) {
      console.error("Failed to generate monthly invoices:", err);
      setMessage({ text: "請求書の生成に失敗しました", type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  // Summary computed from the main invoices list (filtered to current month when viewing all)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const currentMonthInvoices = useMemo(() => {
    // When filter is "all", invoices contains everything, so we can derive current month stats
    // For filtered views, we still compute from what we have
    return invoices.filter(
      (inv) => inv.year === currentYear && inv.month === currentMonth
    );
  }, [invoices, currentYear, currentMonth]);

  const totalAmount = currentMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = currentMonthInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const unpaidAmount = currentMonthInvoices
    .filter((inv) => inv.status === "sent")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = currentMonthInvoices
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const summaryCards = [
    { label: "今月の請求額合計", amount: totalAmount, color: "text-slate-900", bg: "bg-white" },
    { label: "入金済み", amount: paidAmount, color: "text-emerald-600", bg: "bg-emerald-50/50" },
    { label: "未入金", amount: unpaidAmount, color: "text-indigo-600", bg: "bg-indigo-50/50" },
    { label: "延滞", amount: overdueAmount, color: "text-rose-600", bg: "bg-rose-50/50" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-slate-900">請求書一覧</h1>
          <p className="mt-1 text-[13px] text-slate-500">請求と入金の管理</p>
        </div>
        <Button
          onClick={handleGenerateMonthly}
          disabled={generating}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700"
        >
          {generating ? "生成中..." : "月次一括生成"}
        </Button>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-[13px] font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className={`card-hover rounded-xl border-slate-100 shadow-sm ${card.bg}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`font-heading text-2xl font-bold tabular-nums ${card.color}`}>
                {formatAmount(card.amount)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {([
          { value: "all" as Filter, label: "全て" },
          { value: "unpaid" as Filter, label: "未入金" },
          { value: "paid" as Filter, label: "入金済み" },
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all duration-150 ${
              filter === opt.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">クライアント</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">案件</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">年月</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">金額</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">支払期限</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">ステータス</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">入金日</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                return (
                  <TableRow key={invoice.id} className={`border-slate-50 hover:bg-slate-50/50 ${invoice.status === "overdue" ? "bg-rose-50/30" : ""}`}>
                    <TableCell className="text-[13px] font-medium text-slate-900">
                      {invoice.deal.client.name}
                    </TableCell>
                    <TableCell className="text-[13px] text-slate-600">{invoice.deal.title}</TableCell>
                    <TableCell className="text-[13px] tabular-nums text-slate-600">
                      {invoice.year}年{invoice.month}月
                    </TableCell>
                    <TableCell className="text-[13px] tabular-nums font-medium text-slate-900">
                      {formatAmount(invoice.amount)}
                      {invoice.workingDays != null && invoice.baseDays != null && (
                        <span className="ml-1 text-xs text-slate-400">({invoice.workingDays}/{invoice.baseDays}日)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[13px] tabular-nums text-slate-600">{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`badge-pill ${INVOICE_STATUS_COLORS[invoice.status] ?? "bg-slate-50 text-slate-700 border border-slate-200"}`}>
                        {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[13px] tabular-nums text-slate-600">{formatDate(invoice.paidAt)}</TableCell>
                    <TableCell>
                      {(invoice.status === "sent" || invoice.status === "overdue") && (
                        <button
                          onClick={() => handleMarkPaid(invoice.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900"
                        >
                          入金登録
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <p className="text-[13px] text-slate-400">請求書がありません</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
