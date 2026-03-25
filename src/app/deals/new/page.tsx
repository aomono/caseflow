"use client";

import DealForm from "@/components/deals/deal-form";

export default function NewDealPage() {
  return (
    <div className="max-w-2xl">
      <DealForm mode="create" />
    </div>
  );
}
