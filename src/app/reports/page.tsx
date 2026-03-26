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
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "下書き", className: "bg-gray-100 text-gray-700" },
  finalized: { label: "確定", className: "bg-green-100 text-green-700" },
};

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    include: { deal: { include: { client: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">報告書一覧</h1>
        <Link href="/reports/new">
          <Button>新規作成</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
      <Table className="min-w-[640px]">
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
          {reports.map((report) => {
            const config = statusConfig[report.status] ?? {
              label: report.status,
              className: "bg-gray-100 text-gray-700",
            };
            return (
              <TableRow key={report.id}>
                <TableCell className="font-medium">
                  {report.deal.client.name} - {report.deal.title}
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
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ダウンロード
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  <Link href={`/reports/new?reportId=${report.id}`}>
                    <Button variant="outline" size="sm">
                      編集
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
