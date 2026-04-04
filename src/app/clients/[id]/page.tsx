import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ClientDeleteButton } from "@/components/clients/client-delete-button";
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
import { DEAL_STATUS_LABELS, DEAL_STATUS_COLORS, formatJPY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      deals: {
        include: {
          activities: { orderBy: { date: "desc" }, take: 1 },
          invoices: true,
        },
      },
    },
  });

  if (!client) {
    notFound();
  }

  // Health Summary calculations
  const activeDeals = client.deals.filter((d) => d.status === "active");
  const activeDealsCount = activeDeals.length;
  const totalMonthly = activeDeals.reduce((sum, d) => sum + (d.monthlyAmount ?? 0), 0);

  const allActivities = client.deals.flatMap((d) => d.activities);
  const latestActivity = allActivities.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const lastActivityDate = latestActivity
    ? new Date(latestActivity.date).toLocaleDateString("ja-JP")
    : "-";

  const hasActiveDeals = activeDealsCount > 0;
  const hasRenewalDeals = client.deals.some((d) => d.status === "renewal");
  const hasOverdueInvoices = client.deals.some((d) =>
    d.invoices.some((inv) => inv.status === "overdue")
  );

  let healthColor = "#10b981"; // green
  let healthLabel = "良好";
  if (hasOverdueInvoices || !hasActiveDeals) {
    healthColor = "#ef4444"; // red
    healthLabel = "要対応";
  } else if (hasRenewalDeals) {
    healthColor = "#f59e0b"; // yellow
    healthLabel = "注意";
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "クライアント", href: "/clients" }, { label: client.name }]} />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{client.name}</CardTitle>
          <CardAction>
            <div className="flex gap-2">
              <Link href={`/clients/${id}/edit`}>
                <Button variant="outline">編集</Button>
              </Link>
              <ClientDeleteButton clientId={id} />
            </div>
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

      {/* Health Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/60 bg-white p-4">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">稼働中案件</p>
          <p className="mt-1 font-heading text-xl font-bold text-slate-900">{activeDealsCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">月額合計</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums text-slate-900">{formatJPY(totalMonthly)}</p>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">最終活動</p>
          <p className="mt-1 text-[13px] text-slate-700">{lastActivityDate}</p>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">ステータス</p>
          <p className="mt-1 text-[13px] font-medium" style={{ color: healthColor }}>{healthLabel}</p>
        </div>
      </div>

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
                  <Badge className={DEAL_STATUS_COLORS[deal.status]}>
                    {DEAL_STATUS_LABELS[deal.status] || deal.status}
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
