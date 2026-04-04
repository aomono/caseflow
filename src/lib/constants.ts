// ─── Deal Status ───────────────────────────────────────

export const DEAL_STATUS_LABELS: Record<string, string> = {
  lead: "リード",
  discussion: "商談中",
  expected: "受注見込",
  active: "稼働中",
  renewal: "更新",
  closed: "終了",
  lost: "失注",
};

export const DEAL_STATUS_COLORS: Record<string, string> = {
  lead: "bg-slate-50 text-slate-700 border border-slate-200",
  discussion: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  expected: "bg-amber-50 text-amber-700 border border-amber-200",
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  renewal: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  closed: "bg-slate-50 text-slate-700 border border-slate-200",
  lost: "bg-rose-50 text-rose-700 border border-rose-200",
};

export const DEAL_STATUS_OPTIONS = [
  { value: "all", label: "全て" },
  { value: "lead", label: "リード" },
  { value: "discussion", label: "商談中" },
  { value: "expected", label: "受注見込" },
  { value: "active", label: "稼働中" },
  { value: "renewal", label: "更新" },
  { value: "closed", label: "終了" },
  { value: "lost", label: "失注" },
];

// ─── Contact Role ──────────────────────────────────────

export const CONTACT_ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  buyer: "発注者",
  other: "その他",
};

// ─── Activity Type ─────────────────────────────────────

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  meeting: "会議",
  email: "メール",
  phone: "電話",
  note: "メモ",
};

export const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  meeting: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  email: "bg-violet-50 text-violet-700 border border-violet-200",
  phone: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  note: "bg-slate-50 text-slate-700 border border-slate-200",
};

// ─── Invoice Status ────────────────────────────────────

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  sent: "送付済み",
  paid: "入金済み",
  overdue: "未入金",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-50 text-slate-700 border border-slate-200",
  sent: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  paid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  overdue: "bg-rose-50 text-rose-700 border border-rose-200",
};

// ─── Report Status ─────────────────────────────────────

export const REPORT_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  finalized: "確定",
};

export const REPORT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700 border border-amber-200",
  finalized: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

// ─── Billing Type ──────────────────────────────────────

export const BILLING_TYPE_LABELS: Record<string, string> = {
  monthly: "月額",
  lumpsum: "一括",
  prorated: "日割り",
};

// ─── Formatting ────────────────────────────────────────

export function formatJPY(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}
