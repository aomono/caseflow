import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.appSettings.findFirst();

  const slackConfigured = !!process.env.SLACK_BOT_TOKEN;
  const emailConfigured = !!process.env.RESEND_API_KEY;
  const allowedEmails = process.env.ALLOWED_EMAILS
    ? process.env.ALLOWED_EMAILS.split(",").map((e) => e.trim())
    : [];

  return (
    <SettingsClient
      initialCompanyName={settings?.companyName ?? ""}
      initialSlackChannel={settings?.defaultSlackChannel ?? ""}
      initialEmailTo={settings?.defaultEmailTo ?? ""}
      slackConfigured={slackConfigured}
      emailConfigured={emailConfigured}
      allowedEmails={allowedEmails}
    />
  );
}
