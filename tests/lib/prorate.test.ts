import { describe, it, expect } from "vitest";
import { calculateProrate, isWithinContract } from "@/lib/prorate";

describe("calculateProrate", () => {
  describe("fixed30 base", () => {
    // BCGケース: 月額660万、3/16〜7/3、30日固定
    const monthlyAmount = 6600000;
    const contractStart = new Date("2026-03-16");
    const contractEnd = new Date("2026-07-03");

    it("should prorate start month (March: 16 days)", () => {
      const result = calculateProrate({
        monthlyAmount,
        year: 2026,
        month: 3,
        contractStartDate: contractStart,
        contractEndDate: contractEnd,
        prorateBase: "fixed30",
      });

      expect(result.workingDays).toBe(16); // 3/16〜3/31
      expect(result.baseDays).toBe(30);
      expect(result.amount).toBe(Math.round(6600000 * 16 / 30)); // 3,520,000
    });

    it("should return full amount for middle months (April)", () => {
      const result = calculateProrate({
        monthlyAmount,
        year: 2026,
        month: 4,
        contractStartDate: contractStart,
        contractEndDate: contractEnd,
        prorateBase: "fixed30",
      });

      expect(result.workingDays).toBe(30);
      expect(result.baseDays).toBe(30);
      expect(result.amount).toBe(6600000);
    });

    it("should return full amount for middle months (May)", () => {
      const result = calculateProrate({
        monthlyAmount,
        year: 2026,
        month: 5,
        contractStartDate: contractStart,
        contractEndDate: contractEnd,
        prorateBase: "fixed30",
      });

      expect(result.amount).toBe(6600000);
    });

    it("should return full amount for middle months (June)", () => {
      const result = calculateProrate({
        monthlyAmount,
        year: 2026,
        month: 6,
        contractStartDate: contractStart,
        contractEndDate: contractEnd,
        prorateBase: "fixed30",
      });

      expect(result.amount).toBe(6600000);
    });

    it("should prorate end month (July: 3 days)", () => {
      const result = calculateProrate({
        monthlyAmount,
        year: 2026,
        month: 7,
        contractStartDate: contractStart,
        contractEndDate: contractEnd,
        prorateBase: "fixed30",
      });

      expect(result.workingDays).toBe(3); // 7/1〜7/3
      expect(result.baseDays).toBe(30);
      expect(result.amount).toBe(Math.round(6600000 * 3 / 30)); // 660,000
    });
  });

  describe("calendar base", () => {
    it("should use actual days in month as base", () => {
      const result = calculateProrate({
        monthlyAmount: 1000000,
        year: 2026,
        month: 2, // Feb has 28 days in 2026
        contractStartDate: new Date("2026-02-15"),
        contractEndDate: new Date("2026-04-30"),
        prorateBase: "calendar",
      });

      expect(result.baseDays).toBe(28);
      expect(result.workingDays).toBe(14); // 2/15〜2/28
      expect(result.amount).toBe(Math.round(1000000 * 14 / 28)); // 500,000
    });
  });

  describe("business base", () => {
    it("should exclude weekends and holidays", () => {
      const result = calculateProrate({
        monthlyAmount: 1000000,
        year: 2026,
        month: 5, // May 2026 has GW holidays
        contractStartDate: new Date("2026-05-01"),
        contractEndDate: new Date("2026-05-31"),
        prorateBase: "business",
      });

      // May 2026: full month, so should return full amount
      expect(result.workingDays).toBe(result.baseDays);
      expect(result.amount).toBe(1000000);
    });

    it("should prorate business days for partial month", () => {
      const result = calculateProrate({
        monthlyAmount: 1000000,
        year: 2026,
        month: 3,
        contractStartDate: new Date("2026-03-16"),
        contractEndDate: new Date("2026-04-30"),
        prorateBase: "business",
      });

      // March 16-31 business days (excluding weekends and holidays)
      expect(result.workingDays).toBeGreaterThan(0);
      expect(result.workingDays).toBeLessThan(result.baseDays);
      expect(result.amount).toBeLessThan(1000000);
    });
  });

  describe("contract where start and end are same month", () => {
    it("should handle same-month contract", () => {
      const result = calculateProrate({
        monthlyAmount: 1000000,
        year: 2026,
        month: 3,
        contractStartDate: new Date("2026-03-10"),
        contractEndDate: new Date("2026-03-20"),
        prorateBase: "fixed30",
      });

      expect(result.workingDays).toBe(11); // 3/10〜3/20
      expect(result.baseDays).toBe(30);
      expect(result.amount).toBe(Math.round(1000000 * 11 / 30));
    });
  });
});

describe("isWithinContract", () => {
  const start = new Date("2026-03-16");
  const end = new Date("2026-07-03");

  it("should return true for months within contract", () => {
    expect(isWithinContract(2026, 3, start, end)).toBe(true);
    expect(isWithinContract(2026, 5, start, end)).toBe(true);
    expect(isWithinContract(2026, 7, start, end)).toBe(true);
  });

  it("should return false for months outside contract", () => {
    expect(isWithinContract(2026, 2, start, end)).toBe(false);
    expect(isWithinContract(2026, 8, start, end)).toBe(false);
  });
});
