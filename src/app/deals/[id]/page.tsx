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
import ContactForm from "@/components/deals/contact-form";
import ActivityForm from "@/components/deals/activity-form";

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
  lead: "bg-slate-50 text-slate-700 border border-slate-200",
  discussion: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  expected: "bg-amber-50 text-amber-700 border border-amber-200",
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  renewal: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  closed: "bg-slate-50 text-slate-700 border border-slate-200",
  lost: "bg-rose-50 text-rose-700 border border-rose-200",
};

const roleLabels: Record<string, string> = {
  admin: "管理者",
  buyer: "決裁者",
  other: "その他",
};

const roleColors: Record<string, string> = {
  admin: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  buyer: "bg-violet-50 text-violet-700 border border-violet-200",
  other: "bg-slate-50 text-slate-700 border border-slate-200",
};

const activityTypeLabels: Record<string, string> = {
  meeting: "打ち合わせ",
  email: "メール",
  phone: "電話",
  note: "メモ",
};

const activityTypeColors: Record<string, string> = {
  meeting: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  email: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  phone: "bg-amber-50 text-amber-700 border border-amber-200",
  note: "bg-slate-50 text-slate-700 border border-slate-200",
};

const invoiceStatusLabels: Record<string, string> = {
  draft: "下書き",
  sent: "送付済",
  paid: "入金済",
  overdue: "未入金",
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-slate-50 text-slate-700 border border-slate-200",
  sent: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  paid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  overdue: "bg-rose-50 text-rose-700 border border-rose-200",
};

const reminderStatusLabels: Record<string, string> = {
  pending: "未対応",
  reminded: "通知済",
  completed: "完了",
};

const reminderStatusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  reminded: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const reminderTypeLabels: Record<string, string> = {
  renewal: "更新",
  report: "報告書",
  invoice: "請求",
  payment: "支払い",
  custom: "カスタム",
};

const reportStatusLabels: Record<string, string> = {
  draft: "下書き",
  finalized: "確定",
};

const reportStatusColors: Record<string, string> = {
  draft: "bg-slate-50 text-slate-700 border border-slate-200",
  finalized: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      client: true,
      contacts: true,
      activities: {
        orderBy: { date: "desc" },
      },
      invoices: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
      },
      reports: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
      },
      reminders: {
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!deal) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">{deal.title}</h1>
            <Badge className={`badge-pill text-sm ${statusColors[deal.status]}`}>
              {statusLabels[deal.status] || deal.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href={`/clients/${deal.clientId}`}
              className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {deal.client.name}
            </Link>
            {deal.billingType === "lumpsum" && deal.contractAmount ? (
              <span className="font-heading tabular-nums text-lg font-semibold text-slate-900">
                {`\u00a5${deal.contractAmount.toLocaleString()}`}（一括{deal.contractEndDate ? `・${deal.contractEndDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}計上` : ""}）
              </span>
            ) : deal.monthlyAmount ? (
              <span className="font-heading tabular-nums text-lg font-semibold text-slate-900">
                {`\u00a5${deal.monthlyAmount.toLocaleString()}`}/月{deal.billingType === "prorated" ? "（日割り）" : ""}
              </span>
            ) : null}
          </div>
        </div>
        <Link href={`/deals/${id}/edit`}>
          <Button variant="outline" className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50">編集</Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="border-b border-slate-200 bg-transparent p-0">
          <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none">基本情報</TabsTrigger>
          <TabsTrigger value="contacts" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none">関係者</TabsTrigger>
          <TabsTrigger value="activities" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none">やりとり</TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none">請求・入金</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none">報告書</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none">リマインド</TabsTrigger>
        </TabsList>

        {/* 基本情報 */}
        <TabsContent value="info" className="mt-6">
          <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">基本情報</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <dt className="text-sm text-slate-500">概要</dt>
                  <dd className="mt-1 font-medium text-slate-900">{deal.description || "なし"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">契約開始日</dt>
                  <dd className="mt-1 tabular-nums font-medium text-slate-900">
                    {deal.contractStartDate
                      ? deal.contractStartDate.toLocaleDateString("ja-JP")
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">契約終了日</dt>
                  <dd className="mt-1 tabular-nums font-medium text-slate-900">
                    {deal.contractEndDate
                      ? deal.contractEndDate.toLocaleDateString("ja-JP")
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">更新リマインド</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {deal.renewalReminderDays}日前
                  </dd>
                </div>
                {deal.contractSummary && (
                  <div className="col-span-2">
                    <dt className="text-sm text-slate-500">契約概要</dt>
                    <dd className="mt-1 font-medium text-slate-900">{deal.contractSummary}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 関係者 */}
        <TabsContent value="contacts" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-end">
              <ContactForm dealId={id} />
            </div>
            {deal.contacts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {deal.contacts.map((contact) => (
                  <Card key={contact.id} className="card-hover rounded-xl border-slate-100 bg-white shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-heading font-semibold text-slate-900">{contact.name}</p>
                          <p className="text-sm text-slate-500">{contact.title ?? ""}</p>
                        </div>
                        <Badge className={`badge-pill ${roleColors[contact.role]}`}>
                          {roleLabels[contact.role] || contact.role}
                        </Badge>
                      </div>
                      <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                        {contact.email && (
                          <p className="flex items-center gap-2">
                            <span className="text-slate-400">✉</span>
                            {contact.email}
                          </p>
                        )}
                        {contact.phone && (
                          <p className="flex items-center gap-2">
                            <span className="text-slate-400">☎</span>
                            {contact.phone}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-white py-12 text-center shadow-sm">
                <p className="text-3xl">👤</p>
                <p className="mt-2 text-slate-400">関係者がいません</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* やりとり */}
        <TabsContent value="activities" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-end">
              <ActivityForm dealId={id} />
            </div>
            {deal.activities.length > 0 ? (
              <div className="relative space-y-0">
                {/* Timeline connector line */}
                <div className="absolute left-[27px] top-2 bottom-2 w-px bg-slate-200" />
                {deal.activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`relative flex gap-4 pb-6 ${index === deal.activities.length - 1 ? "pb-0" : ""}`}
                  >
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-[54px] w-[54px] flex-shrink-0 flex-col items-center justify-center">
                      <div className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-indigo-400 bg-white" />
                    </div>
                    <Card className="flex-1 rounded-xl border-slate-100 bg-white shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Badge className={`badge-pill ${activityTypeColors[activity.type]}`}>
                            {activityTypeLabels[activity.type] || activity.type}
                          </Badge>
                          <span className="tabular-nums text-sm text-slate-400">
                            {activity.date.toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">{activity.summary}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-white py-12 text-center shadow-sm">
                <p className="text-3xl">💬</p>
                <p className="mt-2 text-slate-400">やりとりがありません</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 請求・入金 */}
        <TabsContent value="invoices" className="mt-6">
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">年/月</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">金額</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">支払期日</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">ステータス</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">入金日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deal.invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="border-slate-50 hover:bg-slate-50/50">
                    <TableCell className="tabular-nums text-slate-700">
                      {invoice.year}年{invoice.month}月
                    </TableCell>
                    <TableCell className="tabular-nums font-medium text-slate-900">
                      {`\u00a5${invoice.amount.toLocaleString()}`}
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-600">
                      {invoice.dueDate.toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <Badge className={`badge-pill ${invoiceStatusColors[invoice.status]}`}>
                        {invoiceStatusLabels[invoice.status] || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-600">
                      {invoice.paidAt
                        ? invoice.paidAt.toLocaleDateString("ja-JP")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {deal.invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">🧾</span>
                        <p>請求データがありません</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 報告書 */}
        <TabsContent value="reports" className="mt-6">
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">期間</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">金額</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deal.reports.map((report) => (
                  <TableRow key={report.id} className="border-slate-50 hover:bg-slate-50/50">
                    <TableCell className="text-slate-700">{report.period}</TableCell>
                    <TableCell className="tabular-nums font-medium text-slate-900">
                      {`\u00a5${report.amount.toLocaleString()}`}
                    </TableCell>
                    <TableCell>
                      <Badge className={`badge-pill ${reportStatusColors[report.status]}`}>
                        {reportStatusLabels[report.status] || report.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {deal.reports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">📄</span>
                        <p>報告書はまだありません</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* リマインド */}
        <TabsContent value="reminders" className="mt-6">
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">タイトル</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">種別</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">期日</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deal.reminders.map((reminder) => (
                  <TableRow key={reminder.id} className="border-slate-50 hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">
                      {reminder.title}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {reminderTypeLabels[reminder.type] || reminder.type}
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-600">
                      {reminder.dueDate.toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <Badge className={`badge-pill ${reminderStatusColors[reminder.status]}`}>
                        {reminderStatusLabels[reminder.status] ||
                          reminder.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {deal.reminders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">🔔</span>
                        <p>リマインドがありません</p>
                      </div>
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
