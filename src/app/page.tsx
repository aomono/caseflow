"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface MonthlyRevenue {
  month: string;
  actual: number;
  contracted: number;
  prospect: number;
}

interface CumulativeRevenue {
  month: string;
  actual: number;
  contracted: number;
  prospect: number;
}

interface ClientRevenue {
  name: string;
  revenue: number;
}

interface StatusRevenue {
  status: string;
  amount: number;
}

interface PipelineItem {
  status: string;
  label: string;
  count: number;
  monthlyAmount: number;
  lumpsumAmount: number;
}

interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  deal: { title: string } | null;
}

interface Activity {
  id: string;
  type: string;
  date: string;
  summary: string;
  createdAt: string;
  deal: { title: string } | null;
}

interface DashboardStats {
  monthlyRevenue: MonthlyRevenue[];
  cumulativeRevenue: CumulativeRevenue[];
  clientRevenue: ClientRevenue[];
  statusRevenue: StatusRevenue[];
  pipeline: PipelineItem[];
  reminders: Reminder[];
  recentActivities: Activity[];
  currentFiscalYear: number;
  fiscalYears: number[];
}

const formatJPY = (value: number) =>
  `¥${value.toLocaleString("ja-JP")}`;

type ViewMode = "period" | "fy";

const PERIOD_OPTIONS = [
  { label: "3ヶ月", value: "3m" },
  { label: "6ヶ月", value: "6m" },
  { label: "12ヶ月", value: "12m" },
  { label: "全期間", value: "all" },
] as const;

const PIE_COLORS = ["#4f46e5", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#06b6d4", "#ec4899"];

const STATUS_PIE_COLORS = ["#4f46e5", "#818cf8", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#64748b"];

const PIPELINE_BORDER_COLORS: Record<string, string> = {
  lead: "border-l-slate-400",
  discussion: "border-l-indigo-500",
  expected: "border-l-amber-500",
  active: "border-l-emerald-500",
  renewal: "border-l-yellow-500",
  closed: "border-l-slate-400",
  lost: "border-l-rose-500",
};

const REMINDER_STATUS_STYLES: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-amber-50 text-amber-700 border border-amber-200", label: "未対応" },
  reminded: { className: "bg-indigo-50 text-indigo-700 border border-indigo-200", label: "リマインド済" },
  completed: { className: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "完了" },
};

const ACTIVITY_TYPE_STYLES: Record<string, { className: string; label: string }> = {
  meeting: { className: "bg-indigo-50 text-indigo-700 border border-indigo-200", label: "会議" },
  email: { className: "bg-violet-50 text-violet-700 border border-violet-200", label: "メール" },
  phone: { className: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "電話" },
  note: { className: "bg-slate-50 text-slate-700 border border-slate-200", label: "メモ" },
};

function formatMonthLabel(v: string): string {
  const parts = v.split("-");
  return `${parts[1]}月`;
}

function formatMonthLabelFull(v: string): string {
  const parts = v.split("-");
  return `${parts[0]}年${parts[1]}月`;
}

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("fy");
  const [period, setPeriod] = useState("12m");
  const [fiscalYear, setFiscalYear] = useState<number | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (viewMode === "fy") {
        // fiscalYearがnull（初回）の場合、APIにfy指定なし→APIがcurrentFiscalYearベースで返す
        // fy=currentを送ってAPI側で判定させる
        params.set("fy", fiscalYear ? String(fiscalYear) : "current");
      } else {
        params.set("period", period);
      }
      const res = await fetch(`/api/dashboard/stats?${params}`);
      const data: DashboardStats = await res.json();
      setStats(data);
      if (!fiscalYear && data.currentFiscalYear) {
        setFiscalYear(data.currentFiscalYear);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, period, fiscalYear]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const monthlyRevenue = stats?.monthlyRevenue ?? [];
  const cumulativeRevenue = stats?.cumulativeRevenue ?? [];
  const clientRevenue = stats?.clientRevenue ?? [];
  const statusRevenue = stats?.statusRevenue ?? [];
  const pipeline = stats?.pipeline ?? [];
  const reminders = stats?.reminders ?? [];
  const recentActivities = stats?.recentActivities ?? [];
  const fiscalYears = stats?.fiscalYears ?? [];

  const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.actual + m.contracted + m.prospect, 0);
  const totalActual = monthlyRevenue.reduce((sum, m) => sum + m.actual, 0);

  const fyLabel = fiscalYear
    ? `FY${fiscalYear} (${fiscalYear}年6月〜${fiscalYear + 1}年5月)`
    : "";

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">
            {viewMode === "fy" ? fyLabel : "CaseFlow の概要"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setViewMode("fy")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                viewMode === "fy"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              会計年度
            </button>
            <button
              onClick={() => setViewMode("period")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                viewMode === "period"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              期間指定
            </button>
          </div>

          {/* Period/FY Selector */}
          {viewMode === "fy" ? (
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {fiscalYears.map((fy) => (
                <button
                  key={fy}
                  onClick={() => setFiscalYear(fy)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                    fiscalYear === fy
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  FY{fy}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                    period === opt.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards (FY mode) */}
          {viewMode === "fy" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="rounded-xl border-slate-100 bg-gradient-to-br from-indigo-50 to-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">期間売上実績</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-bold tabular-nums text-indigo-700">
                    {formatJPY(totalActual)}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-slate-100 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">契約済み（実績+確定）</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-bold tabular-nums text-emerald-700">
                    {formatJPY(totalActual + monthlyRevenue.reduce((s, m) => s + m.contracted, 0))}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-slate-100 bg-gradient-to-br from-amber-50 to-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">見込み含む合計</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-bold tabular-nums text-amber-700">
                    {formatJPY(totalRevenue)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pipeline Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pipeline.map((item) => (
              <Card
                key={item.status}
                className={`card-hover border-l-4 rounded-xl border-slate-100 bg-white shadow-sm ${PIPELINE_BORDER_COLORS[item.status] ?? "border-l-slate-300"}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-3xl font-bold tabular-nums text-slate-900">{item.count}</p>
                  {item.monthlyAmount > 0 && (
                    <p className="mt-1 text-sm tabular-nums text-slate-400">
                      {formatJPY(item.monthlyAmount)}/月
                    </p>
                  )}
                  {item.lumpsumAmount > 0 && (
                    <p className="mt-0.5 text-sm tabular-nums text-slate-400">
                      {formatJPY(item.lumpsumAmount)}（一括）
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cumulative Revenue Chart (FY mode) */}
          {viewMode === "fy" && cumulativeRevenue.length > 0 && (
            <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">
                  売上累計推移（{fyLabel}）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulativeRevenue}>
                      <defs>
                        <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="gradContracted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="gradProspect" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#cbd5e1" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        tickFormatter={formatMonthLabel}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        tickFormatter={(v: number) =>
                          v >= 10000 ? `¥${(v / 10000).toFixed(0)}万` : `¥${v.toLocaleString()}`
                        }
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(value: unknown, name: unknown) => {
                          const labels: Record<string, string> = {
                            actual: "実績累計",
                            contracted: "契約済み累計",
                            prospect: "見込み含む累計",
                          };
                          return [formatJPY(Number(value)), labels[String(name)] ?? String(name)];
                        }}
                        labelFormatter={(label: unknown) => formatMonthLabelFull(String(label))}
                      />
                      <Legend
                        formatter={(value: string) => {
                          const labels: Record<string, string> = {
                            actual: "実績累計",
                            contracted: "契約済み累計",
                            prospect: "見込み含む累計",
                          };
                          return labels[value] ?? value;
                        }}
                      />
                      <Area type="monotone" dataKey="prospect" stroke="#94a3b8" fill="url(#gradProspect)" strokeWidth={1.5} strokeDasharray="4 2" />
                      <Area type="monotone" dataKey="contracted" stroke="#10b981" fill="url(#gradContracted)" strokeWidth={2} />
                      <Area type="monotone" dataKey="actual" stroke="#4f46e5" fill="url(#gradActual)" strokeWidth={2.5} />
                      <ReferenceLine
                        x={currentMonthKey}
                        stroke="#f43f5e"
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        label={{ value: "現在", position: "top", fill: "#f43f5e", fontSize: 12, fontWeight: 600 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Revenue Bar Chart */}
            <Card className="lg:col-span-2 rounded-xl border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">月次売上推移</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        tickFormatter={formatMonthLabel}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        tickFormatter={(v: number) =>
                          `¥${(v / 10000).toFixed(0)}万`
                        }
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(value: unknown, name: unknown) => {
                          const labels: Record<string, string> = {
                            actual: "実績",
                            contracted: "契約済み",
                            prospect: "見込み",
                          };
                          return [formatJPY(Number(value)), labels[String(name)] ?? String(name)];
                        }}
                        labelFormatter={(label: unknown) => formatMonthLabelFull(String(label))}
                      />
                      <Legend
                        formatter={(value: string) => {
                          const labels: Record<string, string> = {
                            actual: "実績",
                            contracted: "契約済み",
                            prospect: "見込み",
                          };
                          return labels[value] ?? value;
                        }}
                      />
                      <Bar dataKey="actual" stackId="revenue" fill="#4f46e5" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="contracted" stackId="revenue" fill="#818cf8" />
                      <Bar dataKey="prospect" stackId="revenue" fill="#cbd5e1" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                      {viewMode === "fy" && (
                        <ReferenceLine
                          x={currentMonthKey}
                          stroke="#f43f5e"
                          strokeWidth={1.5}
                          strokeDasharray="6 3"
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Client Revenue Pie Chart */}
            <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">クライアント別売上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={clientRevenue}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={((props: { name: string; percent: number }) =>
                          `${props.name} ${(props.percent * 100).toFixed(0)}%`
                        ) as unknown as boolean}
                      >
                        {clientRevenue.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(value: unknown) => [formatJPY(Number(value)), "売上"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Revenue Breakdown (FY mode) */}
          {viewMode === "fy" && statusRevenue.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">ステータス別売上構成</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusRevenue}
                          dataKey="amount"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          label={((props: { status: string; percent: number }) =>
                            `${props.status} ${(props.percent * 100).toFixed(0)}%`
                          ) as unknown as boolean}
                        >
                          {statusRevenue.map((_, index) => (
                            <Cell
                              key={`cell-status-${index}`}
                              fill={STATUS_PIE_COLORS[index % STATUS_PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "0.75rem",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                          formatter={(value: unknown) => [formatJPY(Number(value)), "月額"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Status Revenue Table */}
              <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">ステータス別内訳</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">ステータス</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-400">月額</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-400">構成比</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statusRevenue.map((item, idx) => {
                        const totalAmount = statusRevenue.reduce((s, i) => s + i.amount, 0);
                        const pct = totalAmount > 0 ? ((item.amount / totalAmount) * 100).toFixed(1) : "0";
                        return (
                          <TableRow key={item.status} className="border-slate-50 hover:bg-slate-50/50">
                            <TableCell className="font-medium text-slate-900">
                              <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_PIE_COLORS[idx % STATUS_PIE_COLORS.length] }} />
                              {item.status}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-slate-700">{formatJPY(item.amount)}</TableCell>
                            <TableCell className="text-right tabular-nums text-slate-500">{pct}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tables Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Reminders Table */}
            <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">直近のリマインド</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">タイトル</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">期日</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">ステータス</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminders.map((reminder) => {
                      const style = REMINDER_STATUS_STYLES[reminder.status] ?? {
                        className: "bg-slate-50 text-slate-700 border border-slate-200",
                        label: reminder.status,
                      };
                      return (
                        <TableRow key={reminder.id} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="font-medium text-slate-900">
                            {reminder.title}
                          </TableCell>
                          <TableCell className="tabular-nums text-slate-600">
                            {new Date(reminder.dueDate).toLocaleDateString("ja-JP")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`badge-pill ${style.className}`}
                              variant="secondary"
                            >
                              {style.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {reminders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-slate-400">
                          リマインドはありません
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Activities Table */}
            <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">最近のActivity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">日付</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">種別</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivities.map((activity) => {
                      const style = ACTIVITY_TYPE_STYLES[activity.type] ?? {
                        className: "bg-slate-50 text-slate-700 border border-slate-200",
                        label: activity.type,
                      };
                      return (
                        <TableRow key={activity.id} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="tabular-nums text-slate-600">
                            {new Date(activity.date ?? activity.createdAt).toLocaleDateString("ja-JP")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`badge-pill ${style.className}`}
                              variant="secondary"
                            >
                              {style.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-slate-700">
                            {activity.summary}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {recentActivities.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-slate-400">
                          アクティビティはありません
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
