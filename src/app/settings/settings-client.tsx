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

type FeedbackMessage = {
  type: "success" | "error";
  text: string;
} | null;

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
  const [saveMessage, setSaveMessage] = useState<FeedbackMessage>(null);
  const [slackMessage, setSlackMessage] = useState<FeedbackMessage>(null);
  const [emailMessage, setEmailMessage] = useState<FeedbackMessage>(null);

  const clearMessageAfterDelay = (
    setter: React.Dispatch<React.SetStateAction<FeedbackMessage>>
  ) => {
    setTimeout(() => setter(null), 3000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveMessage(null);
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
        setSaveMessage({ type: "success", text: "設定を保存しました" });
      } else {
        setSaveMessage({ type: "error", text: "保存に失敗しました" });
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      setSaveMessage({ type: "error", text: "保存に失敗しました" });
    } finally {
      setSaving(false);
      clearMessageAfterDelay(setSaveMessage);
    }
  };

  const handleTestSlack = async () => {
    if (!slackChannel) {
      setSlackMessage({ type: "error", text: "Slackチャンネルを入力してください" });
      clearMessageAfterDelay(setSlackMessage);
      return;
    }
    setTestingSlack(true);
    setSlackMessage(null);
    try {
      const res = await fetch("/api/settings/test-slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: slackChannel }),
      });
      const data = await res.json();
      if (res.ok) {
        setSlackMessage({ type: "success", text: "Slackテスト送信に成功しました" });
      } else {
        setSlackMessage({ type: "error", text: `Slackテスト送信に失敗しました: ${data.error}` });
      }
    } catch (err) {
      console.error("Failed to test Slack:", err);
      setSlackMessage({ type: "error", text: "Slackテスト送信に失敗しました" });
    } finally {
      setTestingSlack(false);
      clearMessageAfterDelay(setSlackMessage);
    }
  };

  const handleTestEmail = async () => {
    if (!emailTo) {
      setEmailMessage({ type: "error", text: "メールアドレスを入力してください" });
      clearMessageAfterDelay(setEmailMessage);
      return;
    }
    setTestingEmail(true);
    setEmailMessage(null);
    try {
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailMessage({ type: "success", text: "メールテスト送信に成功しました" });
      } else {
        setEmailMessage({ type: "error", text: `メールテスト送信に失敗しました: ${data.error}` });
      }
    } catch (err) {
      console.error("Failed to test email:", err);
      setEmailMessage({ type: "error", text: "メールテスト送信に失敗しました" });
    } finally {
      setTestingEmail(false);
      clearMessageAfterDelay(setEmailMessage);
    }
  };

  const FeedbackInline = ({ message }: { message: FeedbackMessage }) => {
    if (!message) return null;
    return (
      <p
        className={`text-[12px] font-medium ${
          message.type === "success" ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {message.text}
      </p>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-[22px] font-bold tracking-tight text-slate-900">設定</h1>
        <p className="mt-1 text-[13px] text-slate-400">アプリケーションの設定を管理</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Slack Integration */}
        <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">Slack連携</CardTitle>
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
              <label className="text-[12px] font-medium text-slate-500">デフォルトチャンネル</label>
              <Input
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                placeholder="#general"
                className="rounded-lg border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <button
                onClick={handleTestSlack}
                disabled={testingSlack || !slackConfigured}
                className="rounded-lg border border-slate-200 px-5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {testingSlack ? "送信中..." : "Slackテスト送信"}
              </button>
              <FeedbackInline message={slackMessage} />
            </div>
          </CardContent>
        </Card>

        {/* Email Notification */}
        <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">メール通知</CardTitle>
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
              <label className="text-[12px] font-medium text-slate-500">デフォルト送信先</label>
              <Input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="user@example.com"
                className="rounded-lg border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <button
                onClick={handleTestEmail}
                disabled={testingEmail || !emailConfigured}
                className="rounded-lg border border-slate-200 px-5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {testingEmail ? "送信中..." : "メールテスト送信"}
              </button>
              <FeedbackInline message={emailMessage} />
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">会社情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-slate-500">会社名</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="rounded-lg border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <FeedbackInline message={saveMessage} />
            </div>
          </CardContent>
        </Card>

        {/* Allowed Users */}
        <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">許可ユーザー</CardTitle>
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
              <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
                <p className="text-[13px] font-medium text-slate-400">
                  許可ユーザー未設定
                </p>
                <p className="mt-1 text-[12px] text-slate-300">
                  ALLOWED_EMAILS環境変数で設定してください
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
