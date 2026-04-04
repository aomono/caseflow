"use client";

import DealForm from "@/components/deals/deal-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default function NewDealPage() {
  return (
    <div className="max-w-2xl">
      <Breadcrumb items={[{ label: "案件", href: "/deals" }, { label: "新規作成" }]} />
      <DealForm mode="create" />
    </div>
  );
}
