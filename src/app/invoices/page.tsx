"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { mockInvoices } from "@/lib/mock-data";
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

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "下書き", className: "bg-gray-100 text-gray-700" },
  sent: { label: "送付済", className: "bg-blue-100 text-blue-700" },
  paid: { label: "入金済", className: "bg-green-100 text-green-700" },
  overdue: { label: "延滞", className: "bg-red-100 text-red-700" },
};

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export default function InvoicesPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const filteredInvoices = mockInvoices.filter((inv) => {
    if (filter === "all") return true;
    if (filter === "unpaid") return inv.status === "sent" || inv.status === "overdue";
    if (filter === "paid") return inv.status === "paid";
    return true;
  });

  // Summary for 2026-03
  const marchInvoices = mockInvoices.filter(
    (inv) => inv.year === 2026 && inv.month === 3
  );
  const totalAmount = marchInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = marchInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const unpaidAmount = marchInvoices
    .filter((inv) => inv.status === "sent")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = marchInvoices
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">請求書一覧</h1>
        <Button>月次一括生成</Button>
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredInvoices.map((invoice) => {
            const config = statusConfig[invoice.status];
            return (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  {invoice.clientName}
                </TableCell>
                <TableCell>{invoice.dealTitle}</TableCell>
                <TableCell>
                  {invoice.year}年{invoice.month}月
                </TableCell>
                <TableCell>{formatAmount(invoice.amount)}</TableCell>
                <TableCell>{invoice.dueDate}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={config.className}>
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell>{invoice.paidAt || "-"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
