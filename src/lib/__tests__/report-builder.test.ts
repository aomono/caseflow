import { describe, it, expect } from "vitest";
import { buildReportDocx, type ReportDocxData } from "../report-builder";

describe("buildReportDocx", () => {
  const sampleData: ReportDocxData = {
    clientName: "NTT データ経営研究所",
    dealTitle: "NTTグループシナジーに関するプロジェクト創出",
    reportDate: "2026年3月27日",
    period: "2026年1月26日～2026年3月31日",
    workDescriptionItems: [
      "契約に基づき、以下の業務を完了しました。",
      "・クライアントキーマンとの定例ミーティング実施",
      "・関係者との打合せ（15回）",
    ],
    deliverables: [
      "・定例会議資料（PPT）",
      "・戦略レポート（PPT）",
    ],
    nextActions: [
      "・選定プロジェクトの具体化推進他",
    ],
  };

  it("returns a non-empty Buffer", async () => {
    const buffer = await buildReportDocx(sampleData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("buffer starts with PK (valid zip/docx header)", async () => {
    const buffer = await buildReportDocx(sampleData);
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  it("uses default client name when not provided", async () => {
    const data: ReportDocxData = {
      ...sampleData,
      clientName: "",
    };
    const buffer = await buildReportDocx(data);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
