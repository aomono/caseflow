"use client";

import { useSession, signOut } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();

  const userName = session?.user?.name ?? "ゲスト";
  const initials = userName
    .split(/[\s　]/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
          {initials}
        </div>
        <span className="text-sm font-medium text-slate-700">{userName}</span>
        {session && (
          <button
            onClick={() => signOut()}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
          >
            ログアウト
          </button>
        )}
      </div>
    </header>
  );
}
