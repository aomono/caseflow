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
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

const CLIENT_COLORS = ["#4f46e5", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#06b6d4", "#ec4899"];

const STATUS_COLORS: Record<string, string> = {
  "実績": "#4f46e5",
  "契約済み": "#10b981",
  "見込み": "#f59e0b",
};

const PIPELINE_COLORS: Record<string, string> = {
  lead: "#94a3b8",
  discussion: "#6366f1",
  expected: "#f59e0b",
  active: "#10b981",
  renewal: "#eab308",
  closed: "#94a3b8",
  lost: "#f43f5e",
};

const REMINDER_STATUS_STYLES: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-amber-50 text-amber-700 border border-amber-200", label: "未対応" },
  reminded: { className: "bg-indigo-50 text-indigo-700 border border-indigo-200", label: "リマインド済" },
  completed: { className: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "完了" },
};

const ACTIVITY_ICONS: Record<string, { bg: string; color: string; label: string }> = {
  meeting: { bg: "bg-indigo-50", color: "text-indigo-600", label: "会議" },
  email: { bg: "bg-violet-50", color: "text-violet-600", label: "メール" },
  phone: { bg: "bg-emerald-50", color: "text-emerald-600", label: "電話" },
  note: { bg: "bg-slate-100", color: "text-slate-600", label: "メモ" },
};

const ACTIVITY_BADGE_STYLES: Record<string, string> = {
  meeting: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  email: "bg-violet-50 text-violet-700 border border-violet-200",
  phone: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  note: "bg-slate-50 text-slate-700 border border-slate-200",
};

function formatMonthLabel(v: string): string {
  return `${v.split("-")[1]}月`;
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
  const totalContracted = monthlyRevenue.reduce((sum, m) => sum + m.contracted, 0);

  const fyLabel = fiscalYear
    ? `FY${fiscalYear} (${fiscalYear}年6月〜${fiscalYear + 1}年5月)`
    : "";

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const maxClientRevenue = clientRevenue.length > 0 ? clientRevenue[0].revenue : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-slate-900">ダッシュボード</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">
            {viewMode === "fy" ? fyLabel : "CaseFlow の概要"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            <button
              onClick={() => setViewMode("fy")}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                viewMode === "fy"
                  ? "bg-white text-slate-800 shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              会計年度
            </button>
            <button
              onClick={() => setViewMode("period")}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                viewMode === "period"
                  ? "bg-white text-slate-800 shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              期間指定
            </button>
          </div>

          {/* Period/FY Selector */}
          {viewMode === "fy" ? (
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {fiscalYears.map((fy) => (
                <button
                  key={fy}
                  onClick={() => setFiscalYear(fy)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                    fiscalYear === fy
                      ? "bg-white text-slate-800 shadow-sm font-semibold"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  FY{String(fy).slice(2)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                    period === opt.value
                      ? "bg-white text-slate-800 shadow-sm font-semibold"
                      : "text-slate-400 hover:text-slate-600"
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards (FY mode) */}
          {viewMode === "fy" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Actual */}
              <div className="rounded-xl border border-slate-200/60 bg-white p-5 card-hover">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wide">期間売上実績</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  </div>
                </div>
                <p className="font-heading text-[28px] font-bold tabular-nums text-slate-900 mt-2">
                  {formatJPY(totalActual)}
                </p>
                {totalRevenue > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-slate-400">対見込み比</span>
                      <span className="font-semibold text-indigo-600 tabular-nums">
                        {((totalActual / totalRevenue) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${Math.min((totalActual / totalRevenue) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Contracted */}
              <div className="rounded-xl border border-slate-200/60 bg-white p-5 card-hover">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wide">契約済み（実績+確定）</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
                <p className="font-heading text-[28px] font-bold tabular-nums text-slate-900 mt-2">
                  {formatJPY(totalActual + totalContracted)}
                </p>
                {totalRevenue > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-slate-400">対見込み比</span>
                      <span className="font-semibold text-emerald-600 tabular-nums">
                        {(((totalActual + totalContracted) / totalRevenue) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(((totalActual + totalContracted) / totalRevenue) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Prospect */}
              <div className="rounded-xl border border-slate-200/60 bg-white p-5 card-hover">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wide">見込み含む合計</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                </div>
                <p className="font-heading text-[28px] font-bold tabular-nums text-slate-900 mt-2">
                  {formatJPY(totalRevenue)}
                </p>
              </div>
            </div>
          )}

          {/* Pipeline (compact) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pipeline.map((item) => (
              <div
                key={item.status}
                className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white px-4 py-3.5 card-hover"
              >
                <div
                  className="h-9 w-1 rounded-full shrink-0"
                  style={{ backgroundColor: PIPELINE_COLORS[item.status] ?? "#94a3b8" }}
                />
                <div className="min-w-0">
                  <p className="font-heading text-xl font-bold tabular-nums text-slate-900 leading-none">{item.count}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.label}</p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  {item.monthlyAmount > 0 && (
                    <p className="text-[11px] tabular-nums text-slate-400">
                      {formatJPY(item.monthlyAmount)}<span className="text-slate-300">/月</span>
                    </p>
                  )}
                  {item.lumpsumAmount > 0 && (
                    <p className="text-[11px] tabular-nums text-slate-400">
                      {formatJPY(item.lumpsumAmount)}<span className="text-slate-300"> 一括</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Cumulative Revenue Chart (FY mode) */}
          {viewMode === "fy" && cumulativeRevenue.length > 0 && (
            <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">売上累計推移</CardTitle>
                    <p className="text-[11px] text-slate-400 mt-0.5">{fyLabel}</p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />実績
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />契約済み
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-3 rounded border border-dashed border-slate-300" />見込み
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulativeRevenue}>
                      <defs>
                        <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradContracted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradProspect" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#cbd5e1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={formatMonthLabel} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${v.toLocaleString()}`} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)", fontSize: "12px" }}
                        formatter={(value: unknown, name: unknown) => {
                          const labels: Record<string, string> = { actual: "実績累計", contracted: "契約済み累計", prospect: "見込み含む累計" };
                          return [formatJPY(Number(value)), labels[String(name)] ?? String(name)];
                        }}
                        labelFormatter={(label: unknown) => formatMonthLabelFull(String(label))}
                      />
                      <Area type="monotone" dataKey="prospect" stroke="#94a3b8" fill="url(#gradProspect)" strokeWidth={1.5} strokeDasharray="4 2" />
                      <Area type="monotone" dataKey="contracted" stroke="#10b981" fill="url(#gradContracted)" strokeWidth={2} />
                      <Area type="monotone" dataKey="actual" stroke="#4f46e5" fill="url(#gradActual)" strokeWidth={2.5} />
                      <ReferenceLine x={currentMonthKey} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="6 3" label={{ value: "現在", position: "top", fill: "#f43f5e", fontSize: 11, fontWeight: 600 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Row: Monthly Bar + Client Breakdown */}
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Monthly Revenue Bar */}
            <Card className="lg:col-span-3 rounded-xl border-slate-200/60 bg-white shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">月次売上推移</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={formatMonthLabel} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)", fontSize: "12px" }}
                        formatter={(value: unknown, name: unknown) => {
                          const labels: Record<string, string> = { actual: "実績", contracted: "契約済み", prospect: "見込み" };
                          return [formatJPY(Number(value)), labels[String(name)] ?? String(name)];
                        }}
                        labelFormatter={(label: unknown) => formatMonthLabelFull(String(label))}
                      />
                      <Bar dataKey="actual" stackId="revenue" fill="#4f46e5" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="contracted" stackId="revenue" fill="#818cf8" />
                      <Bar dataKey="prospect" stackId="revenue" fill="#cbd5e1" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                      {viewMode === "fy" && (
                        <ReferenceLine x={currentMonthKey} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="6 3" />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Client Revenue (horizontal bars) */}
            <Card className="lg:col-span-2 rounded-xl border-slate-200/60 bg-white shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">クライアント別売上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clientRevenue.slice(0, 6).map((client, idx) => (
                    <div key={client.name}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CLIENT_COLORS[idx % CLIENT_COLORS.length] }}
                          />
                          <span className="font-medium text-slate-700 truncate">{client.name}</span>
                        </div>
                        <span className="tabular-nums text-slate-500 shrink-0 ml-2">{formatJPY(client.revenue)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(client.revenue / maxClientRevenue) * 100}%`,
                            backgroundColor: CLIENT_COLORS[idx % CLIENT_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {clientRevenue.length === 0 && (
                    <p className="py-8 text-center text-[13px] text-slate-400">データなし</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Revenue Breakdown (FY mode) */}
          {viewMode === "fy" && statusRevenue.length > 0 && (
            <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">ステータス別内訳</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {/* Stacked bar */}
                  <div className="flex-1">
                    <div className="h-8 rounded-lg overflow-hidden flex">
                      {statusRevenue.map((item) => {
                        const total = statusRevenue.reduce((s, i) => s + i.amount, 0);
                        const pct = total > 0 ? (item.amount / total) * 100 : 0;
                        return (
                          <div
                            key={item.status}
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: STATUS_COLORS[item.status] ?? "#94a3b8",
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-6 mt-3">
                      {statusRevenue.map((item) => {
                        const total = statusRevenue.reduce((s, i) => s + i.amount, 0);
                        const pct = total > 0 ? ((item.amount / total) * 100).toFixed(1) : "0";
                        return (
                          <div key={item.status} className="flex items-center gap-2 text-[12px]">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: STATUS_COLORS[item.status] ?? "#94a3b8" }}
                            />
                            <span className="text-slate-600">{item.status}</span>
                            <span className="tabular-nums font-medium text-slate-800">{formatJPY(item.amount)}</span>
                            <span className="tabular-nums text-slate-400">({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reminders + Activities */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Reminders */}
            <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">直近のリマインド</CardTitle>
                  {reminders.length > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
                      {reminders.length}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="divide-y divide-slate-100">
                  {reminders.map((reminder) => {
                    const style = REMINDER_STATUS_STYLES[reminder.status] ?? {
                      className: "bg-slate-50 text-slate-700 border border-slate-200",
                      label: reminder.status,
                    };
                    return (
                      <div key={reminder.id} className="flex items-center gap-3.5 py-3 first:pt-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-800 truncate">{reminder.title}</p>
                          <p className="text-[11px] text-slate-400">{new Date(reminder.dueDate).toLocaleDateString("ja-JP")}</p>
                        </div>
                        <Badge className={`badge-pill shrink-0 ${style.className}`} variant="secondary">
                          {style.label}
                        </Badge>
                      </div>
                    );
                  })}
                  {reminders.length === 0 && (
                    <p className="py-8 text-center text-[13px] text-slate-400">リマインドはありません</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activities */}
            <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
              <CardHeader className="pb-0">
                <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">最近のアクティビティ</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="divide-y divide-slate-100">
                  {recentActivities.map((activity) => {
                    const iconStyle = ACTIVITY_ICONS[activity.type] ?? { bg: "bg-slate-100", color: "text-slate-600", label: activity.type };
                    const badgeStyle = ACTIVITY_BADGE_STYLES[activity.type] ?? "bg-slate-50 text-slate-700 border border-slate-200";
                    return (
                      <div key={activity.id} className="flex items-center gap-3.5 py-3 first:pt-0">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconStyle.bg} ${iconStyle.color} shrink-0`}>
                          {activity.type === "meeting" && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                          )}
                          {activity.type === "email" && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                          )}
                          {activity.type === "phone" && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" /></svg>
                          )}
                          {activity.type === "note" && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-800 truncate">{activity.summary}</p>
                          <p className="text-[11px] text-slate-400">{new Date(activity.date ?? activity.createdAt).toLocaleDateString("ja-JP")}</p>
                        </div>
                        <Badge className={`badge-pill shrink-0 ${badgeStyle}`} variant="secondary">
                          {iconStyle.label}
                        </Badge>
                      </div>
                    );
                  })}
                  {recentActivities.length === 0 && (
                    <p className="py-8 text-center text-[13px] text-slate-400">アクティビティはありません</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
