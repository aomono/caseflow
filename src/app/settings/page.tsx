"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const allowedEmails = [
  "sakurai@asterio.co.jp",
  "yamamoto@asterio.co.jp",
  "tanaka@asterio.co.jp",
  "suzuki@asterio.co.jp",
  "watanabe@asterio.co.jp",
];

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("株式会社Asterio");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Slack Integration */}
        <Card>
          <CardHeader>
            <CardTitle>Slack連携</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">ステータス:</span>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                未設定
              </Badge>
            </div>
            <Button variant="outline">Slackテスト送信</Button>
          </CardContent>
        </Card>

        {/* Email Notification */}
        <Card>
          <CardHeader>
            <CardTitle>メール通知</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">ステータス:</span>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                未設定
              </Badge>
            </div>
            <Button variant="outline">メールテスト送信</Button>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle>会社情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">会社名</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Allowed Users */}
        <Card>
          <CardHeader>
            <CardTitle>許可ユーザー</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {allowedEmails.map((email) => (
                <li
                  key={email}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  {email}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
