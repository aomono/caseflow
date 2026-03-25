"use client";

import { useState } from "react";
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
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">設定</h1>
        <p className="mt-1 text-sm text-slate-500">アプリケーションの設定を管理</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Slack Integration */}
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">Slack連携</CardTitle>
            <Badge
              variant="secondary"
              className={`badge-pill ${
                slackConfigured
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-50 text-slate-500 border border-slate-200"
              }`}
            >
              {slackConfigured ? "設定済み" : "未設定"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">デフォルトチャンネル</label>
              <Input
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                placeholder="#general"
                className="rounded-lg border-slate-200"
              />
            </div>
            <button
              onClick={handleTestSlack}
              disabled={testingSlack || !slackConfigured}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50"
            >
              {testingSlack ? "送信中..." : "Slackテスト送信"}
            </button>
          </CardContent>
        </Card>

        {/* Email Notification */}
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">メール通知</CardTitle>
            <Badge
              variant="secondary"
              className={`badge-pill ${
                emailConfigured
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-50 text-slate-500 border border-slate-200"
              }`}
            >
              {emailConfigured ? "設定済み" : "未設定"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">デフォルト送信先</label>
              <Input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="user@example.com"
                className="rounded-lg border-slate-200"
              />
            </div>
            <button
              onClick={handleTestEmail}
              disabled={testingEmail || !emailConfigured}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50"
            >
              {testingEmail ? "送信中..." : "メールテスト送信"}
            </button>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">会社情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">会社名</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="rounded-lg border-slate-200"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </CardContent>
        </Card>

        {/* Allowed Users */}
        <Card className="rounded-xl border-slate-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-base font-semibold tracking-tight text-slate-900">許可ユーザー</CardTitle>
          </CardHeader>
          <CardContent>
            {allowedEmails.length > 0 ? (
              <ul className="space-y-3">
                {allowedEmails.map((email) => (
                  <li
                    key={email}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                    <span className="text-slate-700">{email}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg bg-slate-50 py-8 text-center">
                <p className="text-3xl">🔒</p>
                <p className="mt-2 text-sm text-slate-400">
                  ALLOWED_EMAILS環境変数が設定されていません
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
