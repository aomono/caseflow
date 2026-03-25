"use client";

import { useState, useEffect, useCallback } from "react";
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

type Filter = "all" | "unpaid" | "paid";

interface Invoice {
  id: string;
  dealId: string;
  year: number;
  month: number;
  amount: number;
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

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "下書き", className: "bg-gray-100 text-gray-700" },
  sent: { label: "送付済", className: "bg-blue-100 text-blue-700" },
  paid: { label: "入金済", className: "bg-green-100 text-green-700" },
  overdue: { label: "延滞", className: "bg-red-100 text-red-700" },
};

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

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "unpaid") {
        // Fetch sent and overdue separately, then combine
      } else if (filter === "paid") {
        params.set("status", "paid");
      }

      if (filter === "unpaid") {
        const [sentRes, overdueRes] = await Promise.all([
          fetch(`/api/invoices?status=sent`),
          fetch(`/api/invoices?status=overdue`),
        ]);
        const sent: Invoice[] = await sentRes.json();
        const overdue: Invoice[] = await overdueRes.json();
        setInvoices([...sent, ...overdue].sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        }));
      } else {
        const url = filter === "paid"
          ? `/api/invoices?status=paid`
          : `/api/invoices`;
        const res = await fetch(url);
        const data: Invoice[] = await res.json();
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

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paidAt: new Date().toISOString() }),
      });
      if (res.ok) {
        await fetchInvoices();
      }
    } catch (err) {
      console.error("Failed to mark invoice as paid:", err);
    }
  };

  const handleGenerateMonthly = async () => {
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
        alert(`${data.createdCount}件の請求書を生成しました`);
        await fetchInvoices();
      }
    } catch (err) {
      console.error("Failed to generate monthly invoices:", err);
    } finally {
      setGenerating(false);
    }
  };

  // Summary for current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // We need all invoices (not filtered) for the summary, so fetch all and filter client-side
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch(`/api/invoices?year=${currentYear}&month=${currentMonth}`);
        const data: Invoice[] = await res.json();
        setAllInvoices(data);
      } catch (err) {
        console.error("Failed to fetch summary invoices:", err);
      }
    };
    fetchAll();
  }, [currentYear, currentMonth]);

  const totalAmount = allInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = allInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const unpaidAmount = allInvoices
    .filter((inv) => inv.status === "sent")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = allInvoices
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">請求書一覧</h1>
        <Button onClick={handleGenerateMonthly} disabled={generating}>
          {generating ? "生成中..." : "月次一括生成"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              今月の請求額合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatAmount(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              入金済み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatAmount(paidAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              未入金
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatAmount(unpaidAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              延滞
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatAmount(overdueAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          全て
        </Button>
        <Button
          variant={filter === "unpaid" ? "default" : "outline"}
          onClick={() => setFilter("unpaid")}
        >
          未入金
        </Button>
        <Button
          variant={filter === "paid" ? "default" : "outline"}
          onClick={() => setFilter("paid")}
        >
          入金済み
        </Button>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>クライアント</TableHead>
              <TableHead>案件</TableHead>
              <TableHead>年月</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>支払期限</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>入金日</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const config = statusConfig[invoice.status] ?? {
                label: invoice.status,
                className: "bg-gray-100 text-gray-700",
              };
              return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.deal.client.name}
                  </TableCell>
                  <TableCell>{invoice.deal.title}</TableCell>
                  <TableCell>
                    {invoice.year}年{invoice.month}月
                  </TableCell>
                  <TableCell>{formatAmount(invoice.amount)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={config.className}>
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(invoice.paidAt)}</TableCell>
                  <TableCell>
                    {(invoice.status === "sent" || invoice.status === "overdue") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkPaid(invoice.id)}
                      >
                        入金登録
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
