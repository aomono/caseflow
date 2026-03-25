"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  mockMonthlyRevenue,
  mockClientRevenue,
  mockPipeline,
  mockReminders,
  mockActivities,
} from "@/lib/mock-data";
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
  referred: "border-l-gray-400",
  meeting: "border-l-blue-500",
  active: "border-l-green-500",
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

  const recentActivities = [...mockActivities]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

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

      {/* Pipeline Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {mockPipeline.map((item) => (
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
                <BarChart data={mockMonthlyRevenue}>
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
                    formatter={(value: unknown) => [formatJPY(Number(value)), "売上"]}
                    labelFormatter={(label: unknown) => {
                      const parts = String(label).split("-");
                      return `${parts[0]}年${parts[1]}月`;
                    }}
                  />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
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
                    data={mockClientRevenue}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={((props: { name: string; percent: number }) =>
                      `${props.name} ${(props.percent * 100).toFixed(0)}%`
                    ) as unknown as boolean}
                  >
                    {mockClientRevenue.map((_, index) => (
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
                {mockReminders.map((reminder) => {
                  const style = REMINDER_STATUS_STYLES[reminder.status] ?? {
                    className: "bg-gray-100 text-gray-800",
                    label: reminder.status,
                  };
                  return (
                    <TableRow key={reminder.id}>
                      <TableCell className="font-medium">
                        {reminder.title}
                      </TableCell>
                      <TableCell>{reminder.dueDate}</TableCell>
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
                      <TableCell>{activity.date}</TableCell>
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
    </div>
  );
}
