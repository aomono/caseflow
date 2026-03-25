"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SettingsClientProps {
  initialCompanyName: string;
  initialSlackChannel: string;
  initialEmailTo: string;
  slackConfigured: boolean;
  emailConfigured: boolean;
  allowedEmails: string[];
}

export function SettingsClient({
  initialCompanyName,
  initialSlackChannel,
  initialEmailTo,
  slackConfigured,
  emailConfigured,
  allowedEmails,
}: SettingsClientProps) {
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [slackChannel, setSlackChannel] = useState(initialSlackChannel);
  const [emailTo, setEmailTo] = useState(initialEmailTo);
  const [saving, setSaving] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          defaultSlackChannel: slackChannel || null,
          defaultEmailTo: emailTo || null,
        }),
      });
      if (res.ok) {
        alert("設定を保存しました");
      } else {
        alert("保存に失敗しました");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSlack = async () => {
    if (!slackChannel) {
      alert("Slackチャンネルを入力してください");
      return;
    }
    setTestingSlack(true);
    try {
      const res = await fetch("/api/settings/test-slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: slackChannel }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Slackテスト送信に成功しました");
      } else {
        alert(`Slackテスト送信に失敗しました: ${data.error}`);
      }
    } catch (err) {
      console.error("Failed to test Slack:", err);
      alert("Slackテスト送信に失敗しました");
    } finally {
      setTestingSlack(false);
    }
  };

  const handleTestEmail = async () => {
    if (!emailTo) {
      alert("メールアドレスを入力してください");
      return;
    }
    setTestingEmail(true);
    try {
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("メールテスト送信に成功しました");
      } else {
        alert(`メールテスト送信に失敗しました: ${data.error}`);
      }
    } catch (err) {
      console.error("Failed to test email:", err);
      alert("メールテスト送信に失敗しました");
    } finally {
      setTestingEmail(false);
    }
  };

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
              <Badge
                variant="secondary"
                className={
                  slackConfigured
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }
              >
                {slackConfigured ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">デフォルトチャンネル</label>
              <Input
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                placeholder="#general"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleTestSlack}
              disabled={testingSlack || !slackConfigured}
            >
              {testingSlack ? "送信中..." : "Slackテスト送信"}
            </Button>
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
              <Badge
                variant="secondary"
                className={
                  emailConfigured
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }
              >
                {emailConfigured ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">デフォルト送信先</label>
              <Input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleTestEmail}
              disabled={testingEmail || !emailConfigured}
            >
              {testingEmail ? "送信中..." : "メールテスト送信"}
            </Button>
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
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </CardContent>
        </Card>

        {/* Allowed Users */}
        <Card>
          <CardHeader>
            <CardTitle>許可ユーザー</CardTitle>
          </CardHeader>
          <CardContent>
            {allowedEmails.length > 0 ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">
                ALLOWED_EMAILS環境変数が設定されていません
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
