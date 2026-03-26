"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

interface ClientRevenue {
  name: string;
  revenue: number;
}

interface PipelineItem {
  status: string;
  label: string;
  count: number;
  amount: number;
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
  clientRevenue: ClientRevenue[];
  pipeline: PipelineItem[];
  reminders: Reminder[];
  recentActivities: Activity[];
}

const formatJPY = (value: number) =>
  `¥${value.toLocaleString("ja-JP")}`;

const PERIOD_OPTIONS = [
  { label: "3ヶ月", value: "3m" },
  { label: "6ヶ月", value: "6m" },
  { label: "12ヶ月", value: "12m" },
  { label: "全期間", value: "all" },
] as const;

const PIE_COLORS = ["#4f46e5", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6"];

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

export default function DashboardPage() {
  const [period, setPeriod] = useState("12m");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?period=${period}`);
      const data: DashboardStats = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const monthlyRevenue = stats?.monthlyRevenue ?? [];
  const clientRevenue = stats?.clientRevenue ?? [];
  const pipeline = stats?.pipeline ?? [];
  const reminders = stats?.reminders ?? [];
  const recentActivities = stats?.recentActivities ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">CaseFlow の概要</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                period === opt.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
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
                  <p className="mt-1 text-sm tabular-nums text-slate-400">
                    {formatJPY(item.amount)}/月
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Revenue Bar Chart */}
            <Card className="lg:col-span-2 rounded-xl border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">売上推移</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        tickFormatter={(v: string) => {
                          const parts = v.split("-");
                          return `${parts[1]}月`;
                        }}
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
                        labelFormatter={(label: unknown) => {
                          const parts = String(label).split("-");
                          return `${parts[0]}年${parts[1]}月`;
                        }}
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
