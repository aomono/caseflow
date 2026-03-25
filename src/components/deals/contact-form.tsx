"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type ContactFormProps = {
  dealId: string;
};

const roleOptions = [
  { value: "admin", label: "管理者" },
  { value: "buyer", label: "決裁者" },
  { value: "other", label: "その他" },
];

export default function ContactForm({ dealId }: ContactFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("other");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setName("");
    setRole("other");
    setTitle("");
    setEmail("");
    setPhone("");
    setNotes("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          title: title.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存に失敗しました");
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>追加</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>関係者を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {error && (
              <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="contact-name" className="text-sm font-medium">
                名前 <span className="text-red-500">*</span>
              </label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="山田太郎"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="contact-role" className="text-sm font-medium">
                役割
              </label>
              <select
                id="contact-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="contact-title" className="text-sm font-medium">
                肩書
              </label>
              <Input
                id="contact-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="部長"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="contact-email" className="text-sm font-medium">
                メール
              </label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yamada@example.com"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="contact-phone" className="text-sm font-medium">
                電話
              </label>
              <Input
                id="contact-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03-1234-5678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "保存中..." : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
