import Link from "next/link";
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
  draft: { label: "下書き", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  finalized: { label: "確定", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-slate-900">報告書一覧</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">業務完了報告書の管理</p>
        </div>
        <Link
          href="/reports/new"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-[13px] font-medium text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700"
        >
          新規作成
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">案件</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">対象期間</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">金額</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">ステータス</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">PDF</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => {
              const config = statusConfig[report.status] ?? {
                label: report.status,
                className: "bg-slate-50 text-slate-700 border border-slate-200",
              };
              return (
                <TableRow key={report.id} className="border-slate-50 hover:bg-slate-50/50">
                  <TableCell className="text-[13px] font-medium text-slate-800">
                    {report.deal.client.name} - {report.deal.title}
                  </TableCell>
                  <TableCell className="text-[13px] text-slate-600">{report.period}</TableCell>
                  <TableCell className="text-[13px] tabular-nums text-slate-700">{formatAmount(report.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`badge-pill ${config.className}`}>
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {report.pdfUrl ? (
                      <a
                        href={report.pdfUrl}
                        className="text-[13px] text-indigo-600 hover:text-indigo-800 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ダウンロード
                      </a>
                    ) : (
                      <span className="text-[13px] text-slate-300">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/reports/new?reportId=${report.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                    >
                      編集
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {reports.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-[13px] text-slate-400">
                  報告書はまだありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
