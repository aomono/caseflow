"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  lead: "リード",
  discussion: "協議中",
  expected: "受注見込み",
  active: "稼働中",
  renewal: "更新交渉",
  closed: "終了",
  lost: "失注",
};

const statusColors: Record<string, string> = {
  lead: "bg-gray-100 text-gray-700",
  discussion: "bg-blue-100 text-blue-700",
  expected: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  renewal: "bg-yellow-100 text-yellow-700",
  closed: "bg-gray-100 text-gray-700",
  lost: "bg-red-100 text-red-700",
};

const filterOptions = [
  { value: "all", label: "全て" },
  { value: "lead", label: "リード" },
  { value: "discussion", label: "協議中" },
  { value: "expected", label: "受注見込み" },
  { value: "active", label: "稼働中" },
  { value: "renewal", label: "更新交渉" },
  { value: "closed", label: "終了" },
  { value: "lost", label: "失注" },
];

type Deal = {
  id: string;
  title: string;
  status: string;
  monthlyAmount: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  client: {
    id: string;
    name: string;
  };
};

export default function DealsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/deals"
          : `/api/deals?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ja-JP");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">案件一覧</h1>
        <Link href="/deals/new">
          <Button>新規作成</Button>
        </Link>
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
          {!loading &&
            deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell>
                  <Link
                    href={`/deals/${deal.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {deal.title}
                  </Link>
                </TableCell>
                <TableCell>{deal.client.name}</TableCell>
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
                    ? `${formatDate(deal.contractStartDate)} ~ ${formatDate(deal.contractEndDate)}`
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          {!loading && deals.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                該当する案件がありません
              </TableCell>
            </TableRow>
          )}
          {loading && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                読み込み中...
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
