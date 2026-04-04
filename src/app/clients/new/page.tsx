"use client";

import ClientForm from "@/components/clients/client-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <Breadcrumb items={[{ label: "クライアント", href: "/clients" }, { label: "新規作成" }]} />
      <ClientForm mode="create" />
    </div>
  );
}
