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
import { Button } from "@/components/ui/button";
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

const PIE_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

const PIPELINE_BORDER_COLORS: Record<string, string> = {
  lead: "border-l-gray-400",
  discussion: "border-l-blue-500",
  expected: "border-l-amber-500",
  active: "border-l-green-500",
  renewal: "border-l-yellow-500",
  closed: "border-l-gray-400",
  lost: "border-l-red-500",
};

const REMINDER_STATUS_STYLES: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-yellow-100 text-yellow-800", label: "未対応" },
  reminded: { className: "bg-blue-100 text-blue-800", label: "リマインド済" },
  completed: { className: "bg-green-100 text-green-800", label: "完了" },
};

const ACTIVITY_TYPE_STYLES: Record<string, { className: string; label: string }> = {
  meeting: { className: "bg-blue-100 text-blue-800", label: "会議" },
  email: { className: "bg-purple-100 text-purple-800", label: "メール" },
  phone: { className: "bg-green-100 text-green-800", label: "電話" },
  note: { className: "bg-gray-100 text-gray-800", label: "メモ" },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">CaseFlow の概要</p>
        </div>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : (
        <>
          {/* Pipeline Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {pipeline.map((item) => (
              <Card
                key={item.status}
                className={`border-l-4 ${PIPELINE_BORDER_COLORS[item.status] ?? "border-l-gray-300"}`}
              >
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatJPY(item.amount)}/月
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Revenue Bar Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>売上推移</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: string) => {
                          const parts = v.split("-");
                          return `${parts[1]}月`;
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: number) =>
                          `¥${(v / 10000).toFixed(0)}万`
                        }
                      />
                      <Tooltip
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
                      <Bar dataKey="actual" stackId="revenue" fill="#2563eb" />
                      <Bar dataKey="contracted" stackId="revenue" fill="#93c5fd" />
                      <Bar dataKey="prospect" stackId="revenue" fill="#d1d5db" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Client Revenue Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>クライアント別売上</CardTitle>
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
                        formatter={(value: unknown) => [formatJPY(Number(value)), "売上"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tables Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Reminders Table */}
            <Card>
              <CardHeader>
                <CardTitle>直近のリマインド</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイトル</TableHead>
                      <TableHead>期日</TableHead>
                      <TableHead>ステータス</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminders.map((reminder) => {
                      const style = REMINDER_STATUS_STYLES[reminder.status] ?? {
                        className: "bg-gray-100 text-gray-800",
                        label: reminder.status,
                      };
                      return (
                        <TableRow key={reminder.id}>
                          <TableCell className="font-medium">
                            {reminder.title}
                          </TableCell>
                          <TableCell>
                            {new Date(reminder.dueDate).toLocaleDateString("ja-JP")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={style.className}
                              variant="secondary"
                            >
                              {style.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Activities Table */}
            <Card>
              <CardHeader>
                <CardTitle>最近のActivity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日付</TableHead>
                      <TableHead>種別</TableHead>
                      <TableHead>内容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivities.map((activity) => {
                      const style = ACTIVITY_TYPE_STYLES[activity.type] ?? {
                        className: "bg-gray-100 text-gray-800",
                        label: activity.type,
                      };
                      return (
                        <TableRow key={activity.id}>
                          <TableCell>
                            {new Date(activity.date ?? activity.createdAt).toLocaleDateString("ja-JP")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={style.className}
                              variant="secondary"
                            >
                              {style.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {activity.summary}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
