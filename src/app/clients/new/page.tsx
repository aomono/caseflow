"use client";

import ClientForm from "@/components/clients/client-form";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <ClientForm mode="create" />
    </div>
  );
}
