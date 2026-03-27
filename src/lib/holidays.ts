/**
 * 日本の国民の祝日データ（2024〜2030年）
 * 振替休日対応済み
 */

// 春分の日の簡易計算（1900〜2099年）
function vernalEquinox(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

// 秋分の日の簡易計算（1900〜2099年）
function autumnalEquinox(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 第N月曜日を求める
function nthMonday(year: number, month: number, n: number): number {
  const first = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const firstMonday = first <= 1 ? 2 - first : 9 - first;
  return firstMonday + (n - 1) * 7;
}

function getHolidaysForYear(year: number): Set<string> {
  const holidays = new Set<string>();

  // 固定祝日
  holidays.add(toKey(year, 1, 1));   // 元日
  holidays.add(toKey(year, 2, 11));  // 建国記念の日
  holidays.add(toKey(year, 2, 23));  // 天皇誕生日
  holidays.add(toKey(year, 4, 29));  // 昭和の日
  holidays.add(toKey(year, 5, 3));   // 憲法記念日
  holidays.add(toKey(year, 5, 4));   // みどりの日
  holidays.add(toKey(year, 5, 5));   // こどもの日
  holidays.add(toKey(year, 8, 11));  // 山の日
  holidays.add(toKey(year, 11, 3));  // 文化の日
  holidays.add(toKey(year, 11, 23)); // 勤労感謝の日

  // ハッピーマンデー
  holidays.add(toKey(year, 1, nthMonday(year, 1, 2)));   // 成人の日
  holidays.add(toKey(year, 7, nthMonday(year, 7, 3)));   // 海の日
  holidays.add(toKey(year, 9, nthMonday(year, 9, 3)));   // 敬老の日
  holidays.add(toKey(year, 10, nthMonday(year, 10, 2))); // スポーツの日

  // 春分・秋分
  const vernal = vernalEquinox(year);
  holidays.add(toKey(year, 3, vernal));
  const autumnal = autumnalEquinox(year);
  holidays.add(toKey(year, 9, autumnal));

  // 振替休日: 祝日が日曜の場合、翌月曜が振替休日
  const holidayList = Array.from(holidays).sort();
  for (const h of holidayList) {
    const d = new Date(h + "T00:00:00");
    if (d.getDay() === 0) { // 日曜日
      // 翌日が既に祝日なら更にその翌日
      let substitute = new Date(d);
      substitute.setDate(substitute.getDate() + 1);
      while (holidays.has(toKey(substitute.getFullYear(), substitute.getMonth() + 1, substitute.getDate()))) {
        substitute.setDate(substitute.getDate() + 1);
      }
      holidays.add(toKey(substitute.getFullYear(), substitute.getMonth() + 1, substitute.getDate()));
    }
  }

  // 国民の休日: 祝日に挟まれた平日
  const sorted = Array.from(holidays).sort();
  for (let i = 0; i < sorted.length - 1; i++) {
    const d1 = new Date(sorted[i] + "T00:00:00");
    const d2 = new Date(sorted[i + 1] + "T00:00:00");
    const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 2) {
      const between = new Date(d1);
      between.setDate(between.getDate() + 1);
      if (between.getDay() !== 0 && between.getDay() !== 6) {
        holidays.add(toKey(between.getFullYear(), between.getMonth() + 1, between.getDate()));
      }
    }
  }

  return holidays;
}

// キャッシュ
const cache = new Map<number, Set<string>>();

export function isJapaneseHoliday(date: Date): boolean {
  const year = date.getFullYear();
  if (!cache.has(year)) {
    cache.set(year, getHolidaysForYear(year));
  }
  const key = toKey(year, date.getMonth() + 1, date.getDate());
  return cache.get(year)!.has(key);
}

export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // 土日
  return !isJapaneseHoliday(date);
}
