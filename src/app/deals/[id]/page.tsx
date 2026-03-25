"use client";

export const dynamic = "force-dynamic";

import { use } from "react";
import Link from "next/link";
import {
  mockDeals,
  mockContacts,
  mockActivities,
  mockInvoices,
  mockReminders,
} from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

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

const roleLabels: Record<string, string> = {
  admin: "管理者",
  buyer: "決裁者",
  other: "その他",
};

const roleColors: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700",
  buyer: "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-700",
};

const activityTypeLabels: Record<string, string> = {
  meeting: "打ち合わせ",
  email: "メール",
  phone: "電話",
  note: "メモ",
};

const activityTypeColors: Record<string, string> = {
  meeting: "bg-blue-100 text-blue-700",
  email: "bg-green-100 text-green-700",
  phone: "bg-yellow-100 text-yellow-700",
  note: "bg-gray-100 text-gray-700",
};

const invoiceStatusLabels: Record<string, string> = {
  draft: "下書き",
  sent: "送付済",
  paid: "入金済",
  overdue: "未入金",
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

const reminderStatusLabels: Record<string, string> = {
  pending: "未対応",
  reminded: "通知済",
  done: "完了",
};

const reminderStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  reminded: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

const reminderTypeLabels: Record<string, string> = {
  renewal: "更新",
  report: "報告書",
  invoice: "請求",
  payment: "支払い",
};

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const deal = mockDeals.find((d) => d.id === id);

  if (!deal) {
    return <div className="text-muted-foreground">案件が見つかりません。</div>;
  }

  const contacts = mockContacts.filter((c) => c.dealId === id);
  const activities = mockActivities
    .filter((a) => a.dealId === id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const invoices = mockInvoices.filter((inv) => inv.dealId === id);
  const reminders = mockReminders.filter((r) => r.dealId === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{deal.title}</h1>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Link
              href={`/clients/${deal.clientId}`}
              className="text-primary hover:underline"
            >
              {deal.clientName}
            </Link>
            <Badge className={statusColors[deal.status]}>
              {statusLabels[deal.status] || deal.status}
            </Badge>
            {deal.monthlyAmount && (
              <span className="font-semibold text-foreground">
                {`\u00a5${deal.monthlyAmount.toLocaleString()}`}/月
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">基本情報</TabsTrigger>
          <TabsTrigger value="contacts">関係者</TabsTrigger>
          <TabsTrigger value="activities">やりとり</TabsTrigger>
          <TabsTrigger value="invoices">請求・入金</TabsTrigger>
          <TabsTrigger value="reports">報告書</TabsTrigger>
          <TabsTrigger value="reminders">リマインド</TabsTrigger>
        </TabsList>

        {/* 基本情報 */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <dt className="text-muted-foreground">概要</dt>
                  <dd className="font-medium">{deal.description || "なし"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">契約開始日</dt>
                  <dd className="font-medium">
                    {deal.contractStartDate || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">契約終了日</dt>
                  <dd className="font-medium">
                    {deal.contractEndDate || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">更新リマインド</dt>
                  <dd className="font-medium">
                    {deal.renewalReminderDays}日前
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 関係者 */}
        <TabsContent value="contacts">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button>追加</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>役割</TableHead>
                  <TableHead>肩書</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>電話</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {contact.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColors[contact.role]}>
                        {roleLabels[contact.role] || contact.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{contact.title}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone || "-"}</TableCell>
                  </TableRow>
                ))}
                {contacts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      関係者がいません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* やりとり */}
        <TabsContent value="activities">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button>追加</Button>
            </div>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-4 rounded-lg border p-4"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm text-muted-foreground">
                      {activity.date}
                    </span>
                    <Badge className={activityTypeColors[activity.type]}>
                      {activityTypeLabels[activity.type] || activity.type}
                    </Badge>
                  </div>
                  <p className="flex-1">{activity.summary}</p>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-center text-muted-foreground">
                  やりとりがありません
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 請求・入金 */}
        <TabsContent value="invoices">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button>新規請求</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年/月</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>支払期日</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>入金日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {invoice.year}年{invoice.month}月
                    </TableCell>
                    <TableCell>
                      {`\u00a5${invoice.amount.toLocaleString()}`}
                    </TableCell>
                    <TableCell>{invoice.dueDate}</TableCell>
                    <TableCell>
                      <Badge className={invoiceStatusColors[invoice.status]}>
                        {invoiceStatusLabels[invoice.status] || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{invoice.paidAt || "-"}</TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      請求データがありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 報告書 */}
        <TabsContent value="reports">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button>新規作成</Button>
            </div>
            <p className="text-center text-muted-foreground py-8">
              報告書はまだありません
            </p>
          </div>
        </TabsContent>

        {/* リマインド */}
        <TabsContent value="reminders">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button>追加</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>期日</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell className="font-medium">
                      {reminder.title}
                    </TableCell>
                    <TableCell>
                      {reminderTypeLabels[reminder.type] || reminder.type}
                    </TableCell>
                    <TableCell>{reminder.dueDate}</TableCell>
                    <TableCell>
                      <Badge className={reminderStatusColors[reminder.status]}>
                        {reminderStatusLabels[reminder.status] ||
                          reminder.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {reminders.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      リマインドがありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
