import { Breadcrumb } from "@/components/ui/breadcrumb";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClientEditForm from "./client-edit-form";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
  });

  if (!client) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <Breadcrumb items={[{ label: "クライアント", href: "/clients" }, { label: client.name, href: `/clients/${id}` }, { label: "編集" }]} />
      <ClientEditForm
        initialData={{
          id: client.id,
          name: client.name,
          industry: client.industry,
          referredBy: client.referredBy,
          notes: client.notes,
        }}
      />
    </div>
  );
}
