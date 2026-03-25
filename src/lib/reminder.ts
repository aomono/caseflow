export function shouldSendReminder(dueDate: Date, today: Date, reminderDaysBefore: number): boolean {
  const reminderStart = new Date(dueDate);
  reminderStart.setDate(reminderStart.getDate() - reminderDaysBefore);
  return today >= reminderStart;
}

export function buildReminderMessage(title: string, dealTitle: string | null, dueDate: Date, today: Date): string {
  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const target = dealTitle ? `${dealTitle}: ${title}` : title;
  const dateStr = `${dueDate.getMonth() + 1}/${dueDate.getDate()}`;

  if (diffDays < 0) return `【期限超過】${target} 期限: ${dateStr}（${Math.abs(diffDays)}日超過）`;
  if (diffDays === 0) return `【本日期限！】${target} 期限: ${dateStr}`;
  return `【リマインド】${target} 期限: ${dateStr}（あと${diffDays}日）`;
}
