"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: "📊" },
  { href: "/clients", label: "クライアント", icon: "👥" },
  { href: "/deals", label: "案件", icon: "💼" },
  { href: "/invoices", label: "請求管理", icon: "🧾" },
  { href: "/reports", label: "報告書", icon: "📄" },
];

const bottomItems = [
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[280px] flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex h-20 items-center px-6 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Asterio Strategy Partners"
            width={160}
            height={40}
            className="brightness-0 invert"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 pt-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              isActive(item.href)
                ? "bg-indigo-600/90 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-800 px-3 py-4">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              isActive(item.href)
                ? "bg-indigo-600/90 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <div className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300">
            CF
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-300">CaseFlow CRM</p>
            <p className="truncate text-xs text-slate-500">v0.1.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
