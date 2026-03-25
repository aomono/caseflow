"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { mockClients, mockDeals } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export default function ClientsPage() {
  const dealCountByClient = mockDeals.reduce<Record<string, number>>(
    (acc, deal) => {
      acc[deal.clientId] = (acc[deal.clientId] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">クライアント一覧</h1>
        <Button>新規作成</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>業種</TableHead>
            <TableHead>紹介元</TableHead>
            <TableHead>案件数</TableHead>
            <TableHead>登録日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <Link
                  href={`/clients/${client.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {client.name}
                </Link>
              </TableCell>
              <TableCell>{client.industry}</TableCell>
              <TableCell>{client.referredBy}</TableCell>
              <TableCell>{dealCountByClient[client.id] || 0}</TableCell>
              <TableCell>{client.createdAt}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
