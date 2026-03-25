"use client";

export const dynamic = "force-dynamic";

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

const mockReports = [
  {
    id: "rp1",
    dealTitle: "DX推進コンサルティング",
    period: "2026年2月",
    amount: 800000,
    status: "finalized",
    pdfUrl: "/reports/rp1.pdf",
  },
  {
    id: "rp2",
    dealTitle: "PMO支援",
    period: "2026年2月",
    amount: 600000,
    status: "finalized",
    pdfUrl: "/reports/rp2.pdf",
  },
  {
    id: "rp3",
    dealTitle: "組織改革コンサルティング",
    period: "2026年3月",
    amount: 500000,
    status: "draft",
    pdfUrl: null,
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "下書き", className: "bg-gray-100 text-gray-700" },
  finalized: { label: "確定", className: "bg-green-100 text-green-700" },
};

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">報告書一覧</h1>
        <Link href="/reports/new">
          <Button>新規作成</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>案件</TableHead>
            <TableHead>対象期間</TableHead>
            <TableHead>金額</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>PDF</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockReports.map((report) => {
            const config = statusConfig[report.status];
            return (
              <TableRow key={report.id}>
                <TableCell className="font-medium">
                  {report.dealTitle}
                </TableCell>
                <TableCell>{report.period}</TableCell>
                <TableCell>{formatAmount(report.amount)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={config.className}>
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {report.pdfUrl ? (
                    <a
                      href={report.pdfUrl}
                      className="text-primary hover:underline"
                    >
                      ダウンロード
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    編集
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
