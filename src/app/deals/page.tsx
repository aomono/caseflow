"use client";

import { useState } from "react";
import Link from "next/link";
import { mockDeals } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  referred: "紹介",
  meeting: "打ち合わせ",
  won: "受注",
  active: "稼働中",
  renewal: "更新待ち",
  renewed: "更新済",
  closed: "終了",
  lost: "失注",
};

const statusColors: Record<string, string> = {
  referred: "bg-gray-100 text-gray-700",
  meeting: "bg-blue-100 text-blue-700",
  won: "bg-green-100 text-green-700",
  active: "bg-emerald-100 text-emerald-700",
  renewal: "bg-yellow-100 text-yellow-700",
  renewed: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
  lost: "bg-red-100 text-red-700",
};

const filterOptions = [
  { value: "all", label: "全て" },
  { value: "referred", label: "紹介" },
  { value: "meeting", label: "打ち合わせ" },
  { value: "active", label: "稼働中" },
  { value: "renewal", label: "更新待ち" },
  { value: "won", label: "受注" },
  { value: "lost", label: "失注" },
  { value: "closed", label: "終了" },
];

export default function DealsPage() {
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredDeals =
    statusFilter === "all"
      ? mockDeals
      : mockDeals.filter((d) => d.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">案件一覧</h1>
        <Button>新規作成</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>案件名</TableHead>
            <TableHead>クライアント</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>月額金額</TableHead>
            <TableHead>契約期間</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDeals.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell>
                <Link
                  href={`/deals/${deal.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {deal.title}
                </Link>
              </TableCell>
              <TableCell>{deal.clientName}</TableCell>
              <TableCell>
                <Badge className={statusColors[deal.status]}>
                  {statusLabels[deal.status] || deal.status}
                </Badge>
              </TableCell>
              <TableCell>
                {deal.monthlyAmount
                  ? `\u00a5${deal.monthlyAmount.toLocaleString()}`
                  : "-"}
              </TableCell>
              <TableCell>
                {deal.contractStartDate && deal.contractEndDate
                  ? `${deal.contractStartDate} ~ ${deal.contractEndDate}`
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
          {filteredDeals.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                該当する案件がありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
