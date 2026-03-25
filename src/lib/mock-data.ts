// Clients
export const mockClients = [
  { id: "c1", name: "株式会社テクノロジーパートナーズ", industry: "IT", referredBy: "田中太郎", notes: "大手SIer", createdAt: "2025-06-01" },
  { id: "c2", name: "グローバルコンサルティング合同会社", industry: "コンサルティング", referredBy: "鈴木一郎", notes: null, createdAt: "2025-09-15" },
  { id: "c3", name: "ABC商事株式会社", industry: "商社", referredBy: "高橋花子", notes: "新規開拓中", createdAt: "2026-01-10" },
];

// Deals with various statuses
export const mockDeals = [
  { id: "d1", clientId: "c1", clientName: "株式会社テクノロジーパートナーズ", title: "DX推進コンサルティング", status: "active", monthlyAmount: 800000, contractStartDate: "2025-07-01", contractEndDate: "2026-06-30", renewalReminderDays: 30, description: "全社DX推進の戦略策定・実行支援", contractSummary: "DX推進に関するコンサルティング業務" },
  { id: "d2", clientId: "c1", clientName: "株式会社テクノロジーパートナーズ", title: "PMO支援", status: "active", monthlyAmount: 600000, contractStartDate: "2025-10-01", contractEndDate: "2026-03-31", renewalReminderDays: 30, description: "基幹システム刷新プロジェクトのPMO", contractSummary: "PMO支援業務" },
  { id: "d3", clientId: "c2", clientName: "グローバルコンサルティング合同会社", title: "事業戦略策定支援", status: "meeting", monthlyAmount: 1000000, contractStartDate: null, contractEndDate: null, renewalReminderDays: 30, description: "新規事業の戦略策定", contractSummary: null },
  { id: "d4", clientId: "c2", clientName: "グローバルコンサルティング合同会社", title: "組織改革コンサルティング", status: "active", monthlyAmount: 500000, contractStartDate: "2026-01-01", contractEndDate: "2026-12-31", renewalReminderDays: 30, description: "組織設計・人材育成の支援", contractSummary: "組織改革に関するコンサルティング業務" },
  { id: "d5", clientId: "c3", clientName: "ABC商事株式会社", title: "業務効率化コンサルティング", status: "referred", monthlyAmount: null, contractStartDate: null, contractEndDate: null, renewalReminderDays: 30, description: "バックオフィス業務の効率化提案", contractSummary: null },
  { id: "d6", clientId: "c1", clientName: "株式会社テクノロジーパートナーズ", title: "セキュリティ監査支援", status: "lost", monthlyAmount: 400000, contractStartDate: null, contractEndDate: null, renewalReminderDays: 30, description: "情報セキュリティ監査", contractSummary: null },
];

// DealContacts
export const mockContacts = [
  { id: "dc1", dealId: "d1", name: "山田花子", role: "admin", title: "経営企画部 主任", email: "yamada@techpartners.co.jp", phone: "03-1234-5678" },
  { id: "dc2", dealId: "d1", name: "佐藤誠", role: "buyer", title: "取締役 CTO", email: "sato@techpartners.co.jp", phone: "03-1234-5679" },
  { id: "dc3", dealId: "d2", name: "山田花子", role: "admin", title: "経営企画部 主任", email: "yamada@techpartners.co.jp", phone: "03-1234-5678" },
  { id: "dc4", dealId: "d2", name: "伊藤健太", role: "buyer", title: "情報システム部 部長", email: "ito@techpartners.co.jp", phone: null },
  { id: "dc5", dealId: "d4", name: "中村太郎", role: "buyer", title: "代表社員", email: "nakamura@globalconsulting.co.jp", phone: "03-9876-5432" },
];

// Activities
export const mockActivities = [
  { id: "a1", dealId: "d1", type: "meeting", date: "2026-03-20", summary: "月次定例会議。来期のDX計画について議論。AI活用の提案に前向きな反応。" },
  { id: "a2", dealId: "d1", type: "email", date: "2026-03-18", summary: "来期提案書のドラフトを送付。" },
  { id: "a3", dealId: "d2", type: "meeting", date: "2026-03-15", summary: "プロジェクト進捗報告。マイルストーン3完了。" },
  { id: "a4", dealId: "d3", type: "meeting", date: "2026-03-22", summary: "初回打ち合わせ。事業環境のヒアリング実施。提案書を2週間以内に提出予定。" },
  { id: "a5", dealId: "d4", type: "phone", date: "2026-03-19", summary: "組織診断の結果報告の日程調整。来週火曜に設定。" },
  { id: "a6", dealId: "d5", type: "note", date: "2026-03-23", summary: "高橋さんから紹介あり。来週中に初回面談設定予定。" },
];

// Invoices
export const mockInvoices = [
  { id: "i1", dealId: "d1", dealTitle: "DX推進コンサルティング", clientName: "株式会社テクノロジーパートナーズ", year: 2026, month: 1, amount: 800000, dueDate: "2026-01-31", status: "paid", paidAt: "2026-01-28" },
  { id: "i2", dealId: "d1", dealTitle: "DX推進コンサルティング", clientName: "株式会社テクノロジーパートナーズ", year: 2026, month: 2, amount: 800000, dueDate: "2026-02-28", status: "paid", paidAt: "2026-02-25" },
  { id: "i3", dealId: "d1", dealTitle: "DX推進コンサルティング", clientName: "株式会社テクノロジーパートナーズ", year: 2026, month: 3, amount: 800000, dueDate: "2026-03-31", status: "sent", paidAt: null },
  { id: "i4", dealId: "d2", dealTitle: "PMO支援", clientName: "株式会社テクノロジーパートナーズ", year: 2026, month: 1, amount: 600000, dueDate: "2026-01-31", status: "paid", paidAt: "2026-01-30" },
  { id: "i5", dealId: "d2", dealTitle: "PMO支援", clientName: "株式会社テクノロジーパートナーズ", year: 2026, month: 2, amount: 600000, dueDate: "2026-02-28", status: "paid", paidAt: "2026-02-27" },
  { id: "i6", dealId: "d2", dealTitle: "PMO支援", clientName: "株式会社テクノロジーパートナーズ", year: 2026, month: 3, amount: 600000, dueDate: "2026-03-31", status: "sent", paidAt: null },
  { id: "i7", dealId: "d4", dealTitle: "組織改革コンサルティング", clientName: "グローバルコンサルティング合同会社", year: 2026, month: 1, amount: 500000, dueDate: "2026-01-31", status: "paid", paidAt: "2026-02-03" },
  { id: "i8", dealId: "d4", dealTitle: "組織改革コンサルティング", clientName: "グローバルコンサルティング合同会社", year: 2026, month: 2, amount: 500000, dueDate: "2026-02-28", status: "paid", paidAt: "2026-02-28" },
  { id: "i9", dealId: "d4", dealTitle: "組織改革コンサルティング", clientName: "グローバルコンサルティング合同会社", year: 2026, month: 3, amount: 500000, dueDate: "2026-03-31", status: "overdue", paidAt: null },
];

// Reminders
export const mockReminders = [
  { id: "r1", dealId: "d2", dealTitle: "PMO支援", type: "renewal", title: "PMO支援 契約更新", dueDate: "2026-03-31", status: "pending" },
  { id: "r2", dealId: "d1", dealTitle: "DX推進コンサルティング", type: "report", title: "DX推進 3月度報告書提出", dueDate: "2026-03-28", status: "reminded" },
  { id: "r3", dealId: "d4", dealTitle: "組織改革コンサルティング", type: "invoice", title: "組織改革 3月請求書発行", dueDate: "2026-03-25", status: "pending" },
  { id: "r4", dealId: null, dealTitle: null, type: "payment", title: "給与支払い", dueDate: "2026-03-25", status: "pending" },
  { id: "r5", dealId: null, dealTitle: null, type: "payment", title: "業務委託料支払い", dueDate: "2026-03-31", status: "pending" },
];

// Monthly revenue data for charts (last 12 months)
export const mockMonthlyRevenue = [
  { month: "2025-04", revenue: 800000 },
  { month: "2025-05", revenue: 800000 },
  { month: "2025-06", revenue: 800000 },
  { month: "2025-07", revenue: 1400000 },
  { month: "2025-08", revenue: 1400000 },
  { month: "2025-09", revenue: 1400000 },
  { month: "2025-10", revenue: 1900000 },
  { month: "2025-11", revenue: 1900000 },
  { month: "2025-12", revenue: 1900000 },
  { month: "2026-01", revenue: 1900000 },
  { month: "2026-02", revenue: 1900000 },
  { month: "2026-03", revenue: 1900000 },
];

// Client revenue data for pie chart
export const mockClientRevenue = [
  { name: "テクノロジーパートナーズ", revenue: 16800000 },
  { name: "グローバルコンサルティング", revenue: 5000000 },
];

// Pipeline summary
export const mockPipeline = [
  { status: "referred", label: "紹介", count: 1, amount: 0 },
  { status: "meeting", label: "打ち合わせ", count: 1, amount: 1000000 },
  { status: "active", label: "稼働中", count: 3, amount: 1900000 },
  { status: "lost", label: "失注", count: 1, amount: 400000 },
];
