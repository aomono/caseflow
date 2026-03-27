import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DealEditForm from "./deal-edit-form";

export const dynamic = "force-dynamic";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
  });

  if (!deal) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <DealEditForm
        initialData={{
          id: deal.id,
          clientId: deal.clientId,
          title: deal.title,
          status: deal.status,
          monthlyAmount: deal.monthlyAmount,
          billingType: deal.billingType,
          contractAmount: deal.contractAmount,
          prorateBase: deal.prorateBase,
          description: deal.description,
          contractStartDate: deal.contractStartDate
            ? deal.contractStartDate.toISOString().split("T")[0]
            : null,
          contractEndDate: deal.contractEndDate
            ? deal.contractEndDate.toISOString().split("T")[0]
            : null,
          contractSummary: deal.contractSummary,
        }}
      />
    </div>
  );
}
