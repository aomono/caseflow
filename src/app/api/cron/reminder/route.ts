import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSlackMessage } from "@/lib/slack";
import { sendEmail } from "@/lib/email";
import { shouldSendReminder, buildReminderMessage } from "@/lib/reminder";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Step 1: Auto-generate renewal reminders for deals approaching contractEndDate
  let renewalsCreated = 0;

  const activeDeals = await prisma.deal.findMany({
    where: {
      status: { in: ["active", "renewal"] },
      contractEndDate: { not: null },
    },
  });

  for (const deal of activeDeals) {
    if (!deal.contractEndDate) continue;

    const reminderDueDate = new Date(deal.contractEndDate);
    const reminderCheckDate = new Date(deal.contractEndDate);
    reminderCheckDate.setDate(reminderCheckDate.getDate() - deal.renewalReminderDays);

    if (today >= reminderCheckDate) {
      try {
        await prisma.reminder.create({
          data: {
            dealId: deal.id,
            title: `契約更新: ${deal.title}`,
            type: "renewal",
            dueDate: reminderDueDate,
            reminderDaysBefore: deal.renewalReminderDays,
            status: "pending",
          },
        });
        renewalsCreated++;
      } catch {
        // @@unique constraint violation means reminder already exists — skip
      }
    }
  }

  // Step 2: Auto-detect overdue invoices
  const overdueResult = await prisma.invoice.updateMany({
    where: {
      status: "sent",
      dueDate: { lt: today },
    },
    data: {
      status: "overdue",
    },
  });
  const overdueMarked = overdueResult.count;

  // Step 3: Send notifications for pending reminders in window
  let sent = 0;

  const reminders = await prisma.reminder.findMany({
    where: {
      status: { in: ["pending", "reminded"] },
    },
    include: {
      deal: true,
    },
  });

  const settings = await prisma.appSettings.findFirst();

  for (const reminder of reminders) {
    if (!shouldSendReminder(reminder.dueDate, today, reminder.reminderDaysBefore)) {
      continue;
    }

    const message = buildReminderMessage(
      reminder.title,
      reminder.deal?.title ?? null,
      reminder.dueDate,
      today,
    );

    const slackChannel = reminder.slackChannel ?? settings?.defaultSlackChannel;
    const emailTo = reminder.emailTo ?? settings?.defaultEmailTo;

    if (slackChannel) {
      try {
        await sendSlackMessage(slackChannel, message);
        await prisma.notificationLog.create({
          data: {
            reminderId: reminder.id,
            channel: "slack",
            message,
          },
        });
      } catch {
        // Log failure silently to avoid breaking the cron
      }
    }

    if (emailTo) {
      try {
        await sendEmail(emailTo, message, message);
        await prisma.notificationLog.create({
          data: {
            reminderId: reminder.id,
            channel: "email",
            message,
          },
        });
      } catch {
        // Log failure silently to avoid breaking the cron
      }
    }

    if (slackChannel || emailTo) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "reminded" },
      });
      sent++;
    }
  }

  return NextResponse.json({ sent, renewalsCreated, overdueMarked });
}
