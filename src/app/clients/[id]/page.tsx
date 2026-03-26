import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

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

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: { deals: true },
  });

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{client.name}</CardTitle>
          <CardAction>
            <Link href={`/clients/${id}/edit`}>
              <Button variant="outline">編集</Button>
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-muted-foreground">業種</dt>
              <dd className="font-medium">{client.industry ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">紹介元</dt>
              <dd className="font-medium">{client.referredBy ?? "-"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">メモ</dt>
              <dd className="font-medium">{client.notes || "なし"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">紐づく案件</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>案件名</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>金額</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {client.deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell>
                  <Link
                    href={`/deals/${deal.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {deal.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[deal.status]}>
                    {statusLabels[deal.status] || deal.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {deal.billingType === "lumpsum" && deal.contractAmount
                    ? `\u00a5${deal.contractAmount.toLocaleString()}（一括）`
                    : deal.monthlyAmount
                      ? `\u00a5${deal.monthlyAmount.toLocaleString()}/月`
                      : "-"}
                </TableCell>
              </TableRow>
            ))}
            {client.deals.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground"
                >
                  案件がありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
