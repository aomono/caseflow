import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: { _count: { select: { deals: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-slate-900">クライアント一覧</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">クライアントの管理</p>
        </div>
        <Link href="/clients/new" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-[13px] font-medium text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700">
          新規作成
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">名前</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">業種</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">紹介元</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">案件数</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">登録日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} className="border-slate-50 hover:bg-slate-50/50">
                <TableCell className="text-[13px]">
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell className="text-[13px] text-slate-600">{client.industry ?? "-"}</TableCell>
                <TableCell className="text-[13px] text-slate-600">{client.referredBy ?? "-"}</TableCell>
                <TableCell className="text-[13px] tabular-nums text-slate-600">{client._count.deals}</TableCell>
                <TableCell className="text-[13px] tabular-nums text-slate-600">
                  {client.createdAt.toLocaleDateString("ja-JP")}
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-[13px] text-slate-400">
                  クライアントがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
