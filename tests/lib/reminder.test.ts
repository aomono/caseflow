import { describe, it, expect } from "vitest";
import { shouldSendReminder, buildReminderMessage } from "@/lib/reminder";

describe("shouldSendReminder", () => {
  it("should return false when today is before the reminder window", () => {
    const dueDate = new Date("2026-04-10");
    const today = new Date("2026-04-01");
    expect(shouldSendReminder(dueDate, today, 3)).toBe(false);
  });

  it("should return true when today is exactly the start of the reminder window", () => {
    const dueDate = new Date("2026-04-10");
    const today = new Date("2026-04-07");
    expect(shouldSendReminder(dueDate, today, 3)).toBe(true);
  });

  it("should return true when today is within the reminder window", () => {
    const dueDate = new Date("2026-04-10");
    const today = new Date("2026-04-08");
    expect(shouldSendReminder(dueDate, today, 3)).toBe(true);
  });

  it("should return true when today is the due date", () => {
    const dueDate = new Date("2026-04-10");
    const today = new Date("2026-04-10");
    expect(shouldSendReminder(dueDate, today, 3)).toBe(true);
  });

  it("should return true when today is past the due date", () => {
    const dueDate = new Date("2026-04-10");
    const today = new Date("2026-04-12");
    expect(shouldSendReminder(dueDate, today, 3)).toBe(true);
  });

  it("should handle 0 reminderDaysBefore (remind only on/after due date)", () => {
    const dueDate = new Date("2026-04-10");
    expect(shouldSendReminder(dueDate, new Date("2026-04-09"), 0)).toBe(false);
    expect(shouldSendReminder(dueDate, new Date("2026-04-10"), 0)).toBe(true);
  });
});

describe("buildReminderMessage", () => {
  it("should build a reminder message with days remaining", () => {
    const dueDate = new Date("2026-04-10");
    const today = new Date("2026-04-07");
    const result = buildReminderMessage("支払い", "案件A", dueDate, today);
    expect(result).toBe("【リマインド】案件A: 支払い 期限: 4/10（あと3日）");
  });

  it("should build a message for today's deadline", () => {
    const dueDate = new Date("2026-04-10");
    const today = new Date("2026-04-10");
    const result = buildReminderMessage("支払い", "案件A", dueDate, today);
    expect(result).toBe("【本日期限！】案件A: 支払い 期限: 4/10");
  });

  it("should build an overdue message", () => {
    const dueDate = new Date("2026-04-10");
    const today = new Date("2026-04-13");
    const result = buildReminderMessage("支払い", "案件A", dueDate, today);
    expect(result).toBe("【期限超過】案件A: 支払い 期限: 4/10（3日超過）");
  });

  it("should work without a deal title", () => {
    const dueDate = new Date("2026-04-10");
    const today = new Date("2026-04-07");
    const result = buildReminderMessage("カスタムリマインダー", null, dueDate, today);
    expect(result).toBe("【リマインド】カスタムリマインダー 期限: 4/10（あと3日）");
  });
});
