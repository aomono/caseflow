"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ClientDeleteButton({ clientId }: { clientId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "削除に失敗しました");
    }
    router.push("/clients");
    router.refresh();
  };

  return (
    <ConfirmDialog
      title="クライアントを削除"
      message="このクライアントを削除しますか？紐づく案件もすべて削除されます。この操作は元に戻せません。"
      onConfirm={handleDelete}
    >
      <Button variant="outline" className="rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50">削除</Button>
    </ConfirmDialog>
  );
}
