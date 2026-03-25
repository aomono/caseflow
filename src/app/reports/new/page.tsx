"use client";

import { useState } from "react";
import { mockDeals } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const activeDeals = mockDeals.filter((d) => d.status === "active");

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export default function ReportNewPage() {
  const [selectedDealId, setSelectedDealId] = useState<string>(
    activeDeals[0]?.id || ""
  );
  const [period, setPeriod] = useState("2026年3月");
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState<number>(
    activeDeals[0]?.monthlyAmount || 0
  );

  const selectedDeal = activeDeals.find((d) => d.id === selectedDealId);
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleDealChange = (value: string) => {
    setSelectedDealId(value);
    const deal = activeDeals.find((d) => d.id === value);
    if (deal?.monthlyAmount) {
      setAmount(deal.monthlyAmount);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">報告書 新規作成</h1>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>報告書情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">案件選択</label>
            <Select value={selectedDealId} onValueChange={handleDealChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="案件を選択" />
              </SelectTrigger>
              <SelectContent>
                {activeDeals.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id}>
                    {deal.clientName} - {deal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">対象期間</label>
            <Input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="例: 2026年3月"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">作業内容</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="コンサルティング業務"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">金額</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>プレビュー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold">株式会社Asterio</h2>
              </div>
              <div className="text-sm text-muted-foreground">
                発行日: {today}
              </div>
            </div>

            <Separator />

            <div className="text-sm">
              <p className="font-medium">
                {selectedDeal?.clientName || "（クライアント未選択）"} 御中
              </p>
            </div>

            <h3 className="text-center text-lg font-bold">業務完了報告書</h3>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-medium text-muted-foreground">
                  対象期間
                </span>
                <span>{period || "-"}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-medium text-muted-foreground">
                  作業内容
                </span>
                <span>{content || "コンサルティング業務"}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-medium text-muted-foreground">金額</span>
                <span className="font-bold">{formatAmount(amount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>PDF生成</Button>
      </div>
    </div>
  );
}
