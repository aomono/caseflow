import { isBusinessDay } from "./holidays";

export type ProrateBaseType = "fixed30" | "calendar" | "business";

export interface ProrateResult {
  workingDays: number;
  baseDays: number;
  amount: number;
}

/**
 * 当月の基準日数を計算
 */
function getBaseDays(year: number, month: number, prorateBase: ProrateBaseType): number {
  switch (prorateBase) {
    case "fixed30":
      return 30;
    case "calendar":
      return new Date(year, month, 0).getDate(); // 当月の暦日数
    case "business": {
      let count = 0;
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        if (isBusinessDay(new Date(year, month - 1, d))) {
          count++;
        }
      }
      return count;
    }
  }
}

/**
 * 指定期間の稼働日数をカウント（startDay〜endDay、1-indexed）
 */
function countDays(
  year: number,
  month: number,
  startDay: number,
  endDay: number,
  prorateBase: ProrateBaseType,
): number {
  if (prorateBase === "business") {
    let count = 0;
    for (let d = startDay; d <= endDay; d++) {
      if (isBusinessDay(new Date(year, month - 1, d))) {
        count++;
      }
    }
    return count;
  }
  // fixed30 / calendar: 暦日数をそのままカウント
  return endDay - startDay + 1;
}

/**
 * 日割り計算
 */
export function calculateProrate(params: {
  monthlyAmount: number;
  year: number;
  month: number;
  contractStartDate: Date;
  contractEndDate: Date;
  prorateBase: ProrateBaseType;
}): ProrateResult {
  const { monthlyAmount, year, month, contractStartDate, contractEndDate, prorateBase } = params;

  const daysInMonth = new Date(year, month, 0).getDate();
  const baseDays = getBaseDays(year, month, prorateBase);

  const startYear = contractStartDate.getFullYear();
  const startMonth = contractStartDate.getMonth() + 1;
  const startDay = contractStartDate.getDate();

  const endYear = contractEndDate.getFullYear();
  const endMonth = contractEndDate.getMonth() + 1;
  const endDay = contractEndDate.getDate();

  const isStartMonth = year === startYear && month === startMonth;
  const isEndMonth = year === endYear && month === endMonth;

  let firstDay = 1;
  let lastDay = daysInMonth;

  if (isStartMonth) {
    firstDay = startDay;
  }
  if (isEndMonth) {
    lastDay = endDay;
  }

  // 丸1ヶ月かどうか判定（初月でも最終月でもない）
  const isFullMonth = !isStartMonth && !isEndMonth;

  if (isFullMonth) {
    // 満額
    return { workingDays: baseDays, baseDays, amount: monthlyAmount };
  }

  const workingDays = countDays(year, month, firstDay, lastDay, prorateBase);

  const amount = Math.round(monthlyAmount * workingDays / baseDays);

  return { workingDays, baseDays, amount };
}

/**
 * 当月が契約期間内かチェック
 */
export function isWithinContract(
  year: number,
  month: number,
  contractStartDate: Date,
  contractEndDate: Date,
): boolean {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  return contractStartDate <= monthEnd && contractEndDate >= monthStart;
}
