"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DealDeleteButton({ dealId }: { dealId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    const res = await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "削除に失敗しました");
    }
    router.push("/deals");
    router.refresh();
  };

  return (
    <ConfirmDialog
      title="案件を削除"
      message="この案件を削除しますか？関連する連絡先、やりとり、請求データもすべて削除されます。この操作は元に戻せません。"
      onConfirm={handleDelete}
    >
      <Button variant="outline" className="rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50">削除</Button>
    </ConfirmDialog>
  );
}
