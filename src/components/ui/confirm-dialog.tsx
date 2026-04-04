"use client";

import { useState } from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  children: React.ReactNode;
}

export function ConfirmDialog({ title, message, confirmLabel = "削除", onConfirm, children }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative rounded-xl bg-white p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-[13px] text-slate-500">{message}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "処理中..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
