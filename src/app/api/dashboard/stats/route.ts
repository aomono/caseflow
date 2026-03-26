import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getStartDate(period: string | null): Date | null {
  const now = new Date();
  switch (period) {
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 3, 1);
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, 1);
    case "12m":
      return new Date(now.getFullYear(), now.getMonth() - 12, 1);
    case "all":
    default:
      return null;
  }
}

function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function generateMonthRange(start: Date, end: Date): string[] {
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= last) {
    months.push(formatMonth(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

const STATUS_LABELS: Record<string, string> = {
  lead: "リード",
  discussion: "商談中",
  expected: "受注見込",
  active: "稼働中",
  renewal: "更新",
  closed: "終了",
  lost: "失注",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  const startDate = getStartDate(period);

  const now = new Date();
  const currentMonth = formatMonth(now);

  // --- Monthly Revenue (from deals by status) ---
  // actual = closed + active (past months) — work already done
  // contracted = active (current & future months) + renewal
  // prospect = discussion + expected
  const deals = await prisma.deal.findMany({
    where: {
      status: { in: ["active", "closed", "renewal", "discussion", "expected"] },
      monthlyAmount: { not: null },
    },
    select: {
      status: true,
      monthlyAmount: true,
      contractStartDate: true,
      contractEndDate: true,
      client: { select: { name: true } },
    },
  });

  const actualByMonth: Record<string, number> = {};
  const contractedByMonth: Record<string, number> = {};
  const prospectByMonth: Record<string, number> = {};
  const revenueByClient: Record<string, number> = {};

  for (const deal of deals) {
    if (!deal.monthlyAmount) continue;

    const dealStart = deal.contractStartDate ?? now;
    const dealEnd = deal.contractEndDate ?? new Date(now.getFullYear(), now.getMonth() + 12, 0);
    const rangeStart = startDate && startDate > dealStart ? startDate : dealStart;
    const months = generateMonthRange(rangeStart, dealEnd);

    for (const m of months) {
      if (deal.status === "closed") {
        // Closed deals are always actual (past revenue)
        actualByMonth[m] = (actualByMonth[m] ?? 0) + deal.monthlyAmount;
      } else if (deal.status === "active" || deal.status === "renewal") {
        // Active/renewal: past months = actual, current & future = contracted
        if (m < currentMonth) {
          actualByMonth[m] = (actualByMonth[m] ?? 0) + deal.monthlyAmount;
        } else {
          contractedByMonth[m] = (contractedByMonth[m] ?? 0) + deal.monthlyAmount;
        }
      } else {
        // discussion, expected = prospect
        prospectByMonth[m] = (prospectByMonth[m] ?? 0) + deal.monthlyAmount;
      }
    }

    // Client revenue: total from actual months (closed + active past)
    const totalMonths = months.length;
    if (deal.status === "closed") {
      revenueByClient[deal.client.name] = (revenueByClient[deal.client.name] ?? 0) + deal.monthlyAmount * totalMonths;
    } else if (deal.status === "active" || deal.status === "renewal") {
      const pastMonths = months.filter((m) => m < currentMonth).length;
      if (pastMonths > 0) {
        revenueByClient[deal.client.name] = (revenueByClient[deal.client.name] ?? 0) + deal.monthlyAmount * pastMonths;
      }
    }
  }

  // Override with paid invoice amounts where available (more accurate)
  const invoiceWhere: Record<string, unknown> = { status: "paid" };
  if (startDate) {
    invoiceWhere.dueDate = { gte: startDate };
  }
  const paidInvoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    select: { year: true, month: true, amount: true, deal: { select: { client: { select: { name: true } } } } },
  });
  for (const inv of paidInvoices) {
    const key = `${inv.year}-${String(inv.month).padStart(2, "0")}`;
    // Paid invoices supplement the actual amount (don't double-count — but if invoice exists, it's the authoritative source)
    // For simplicity, add invoice amounts on top since they may differ from monthlyAmount
    if (!actualByMonth[key]) {
      actualByMonth[key] = inv.amount;
    }
  }

  // Merge all months
  const allMonths = new Set([
    ...Object.keys(actualByMonth),
    ...Object.keys(contractedByMonth),
    ...Object.keys(prospectByMonth),
  ]);
  const monthlyRevenue = Array.from(allMonths)
    .sort()
    .map((month) => ({
      month,
      actual: actualByMonth[month] ?? 0,
      contracted: contractedByMonth[month] ?? 0,
      prospect: prospectByMonth[month] ?? 0,
    }));

  // --- Client Revenue ---
  const clientRevenue = Object.entries(revenueByClient)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // --- Pipeline ---
  const allDeals = await prisma.deal.findMany({
    select: { status: true, monthlyAmount: true },
  });

  const pipelineMap: Record<string, { count: number; amount: number }> = {};
  for (const deal of allDeals) {
    if (!pipelineMap[deal.status]) {
      pipelineMap[deal.status] = { count: 0, amount: 0 };
    }
    pipelineMap[deal.status].count += 1;
    pipelineMap[deal.status].amount += deal.monthlyAmount ?? 0;
  }

  const pipeline = Object.entries(pipelineMap).map(([status, data]) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    count: data.count,
    amount: data.amount,
  }));

  // --- Reminders (pending/reminded, limit 10) ---
  const reminders = await prisma.reminder.findMany({
    where: { status: { in: ["pending", "reminded"] } },
    include: { deal: true },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  // --- Recent Activities (latest 10) ---
  const recentActivities = await prisma.activity.findMany({
    include: { deal: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    monthlyRevenue,
    clientRevenue,
    pipeline,
    reminders,
    recentActivities,
  });
}
