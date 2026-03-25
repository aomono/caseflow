import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">クライアント一覧</h1>
          <p className="mt-1 text-sm text-slate-500">{clients.length} 件のクライアント</p>
        </div>
        <Link href="/clients/new">
          <Button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700">新規作成</Button>
        </Link>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">名前</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">業種</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">紹介元</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">案件数</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">登録日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} className="border-slate-50 hover:bg-slate-50/50">
                <TableCell>
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell className="text-slate-600">{client.industry ?? "-"}</TableCell>
                <TableCell className="text-slate-600">{client.referredBy ?? "-"}</TableCell>
                <TableCell className="tabular-nums text-slate-600">{client._count.deals}</TableCell>
                <TableCell className="tabular-nums text-slate-600">
                  {client.createdAt.toLocaleDateString("ja-JP")}
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">👥</span>
                    <p>クライアントがありません</p>
                    <p className="text-xs">新しいクライアントを追加しましょう</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
