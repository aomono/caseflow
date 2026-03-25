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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">クライアント一覧</h1>
        <Link href="/clients/new">
          <Button>新規作成</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>業種</TableHead>
            <TableHead>紹介元</TableHead>
            <TableHead>案件数</TableHead>
            <TableHead>登録日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <Link
                  href={`/clients/${client.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {client.name}
                </Link>
              </TableCell>
              <TableCell>{client.industry ?? "-"}</TableCell>
              <TableCell>{client.referredBy ?? "-"}</TableCell>
              <TableCell>{client._count.deals}</TableCell>
              <TableCell>
                {client.createdAt.toLocaleDateString("ja-JP")}
              </TableCell>
            </TableRow>
          ))}
          {clients.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                クライアントがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
