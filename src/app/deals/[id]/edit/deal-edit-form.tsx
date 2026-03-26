"use client";

import DealForm from "@/components/deals/deal-form";

type Props = {
  initialData: {
    id: string;
    clientId: string;
    title: string;
    status: string;
    monthlyAmount: number | null;
    billingType: "monthly" | "lumpsum";
    contractAmount: number | null;
    description: string | null;
    contractStartDate: string | null;
    contractEndDate: string | null;
    contractSummary: string | null;
  };
};

export default function DealEditForm({ initialData }: Props) {
  return <DealForm mode="edit" initialData={initialData} />;
}
