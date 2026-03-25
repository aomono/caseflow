"use client";

import ClientForm from "@/components/clients/client-form";

type Props = {
  initialData: {
    id: string;
    name: string;
    industry: string | null;
    referredBy: string | null;
    notes: string | null;
  };
};

export default function ClientEditForm({ initialData }: Props) {
  return <ClientForm mode="edit" initialData={initialData} />;
}
