"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

const PAGE_LABELS: Record<string, string> = {
  "/": "ダッシュボード",
  "/clients": "クライアント",
  "/deals": "案件",
  "/invoices": "請求管理",
  "/reports": "報告書",
  "/settings": "設定",
};

function getPageLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  for (const [path, label] of Object.entries(PAGE_LABELS)) {
    if (path !== "/" && pathname.startsWith(path)) return label;
  }
  return "";
}

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const userName = session?.user?.name ?? "ゲスト";
  const initials = userName
    .split(/[\s　]/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pageLabel = getPageLabel(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-8 lg:flex hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-slate-400">
        <span>CaseFlow</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-medium text-slate-700">{pageLabel}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="h-6 w-px bg-slate-200" />
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">
            {initials}
          </div>
          <span className="text-[13px] font-medium text-slate-700">{userName}</span>
        </div>
        {session && (
          <button
            onClick={() => signOut()}
            className="rounded-lg px-3 py-1.5 text-[12px] text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600"
          >
            ログアウト
          </button>
        )}
      </div>
    </header>
  );
}
