import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
} from "docx";

export interface ReportDocxData {
  clientName: string;
  dealTitle: string;
  reportDate: string;
  period: string;
  workDescriptionItems: string[];
  deliverables: string[];
  nextActions: string[];
}

// A4 layout constants (in DXA / twentieths of a point)
const PAGE_WIDTH = 11906;
const MARGIN_LEFT = 1800;
const MARGIN_RIGHT = 1800;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const LABEL_WIDTH = 2700;
const VALUE_WIDTH = CONTENT_WIDTH - LABEL_WIDTH;

const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function makeRow(label: string, lines: string[]): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: LABEL_WIDTH, type: WidthType.DXA },
        margins: cellMargins,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [new TextRun({ text: label, font: "MS Mincho", size: 21 })],
          }),
        ],
      }),
      new TableCell({
        borders,
        width: { size: VALUE_WIDTH, type: WidthType.DXA },
        margins: cellMargins,
        verticalAlign: VerticalAlign.CENTER,
        children: lines.map(
          (line) =>
            new Paragraph({
              spacing: { before: 20, after: 20 },
              children: [new TextRun({ text: line, font: "MS Mincho", size: 21 })],
            }),
        ),
      }),
    ],
  });
}

function createDocument(data: ReportDocxData): Document {
  const client = data.clientName || "NTT データ経営研究所";

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 16838 },
            margin: { top: 1800, right: MARGIN_RIGHT, bottom: 1440, left: MARGIN_LEFT },
          },
        },
        children: [
          new Paragraph({ spacing: { after: 400 }, children: [] }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "業務完了報告書",
                bold: true,
                underline: { type: "single" },
                font: "MS Gothic",
                size: 32,
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          // Recipient
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `株式会社 ${client}御中`,
                font: "MS Mincho",
                size: 22,
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 60 }, children: [] }),

          // Sender
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "株式会社アステリオストラテジーパートナーズ", font: "MS Mincho", size: 22 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "\u3012158-0096 東京都世田谷区玉川台2-32-1-1402", font: "MS Mincho", size: 22 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "TEL: 03-3709-0570", font: "MS Mincho", size: 22 }),
            ],
          }),

          // Preamble
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "以下の通り、業務完了をご報告いたします。", font: "MS Mincho", size: 22 }),
            ],
          }),

          // Table
          new Table({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            columnWidths: [LABEL_WIDTH, VALUE_WIDTH],
            rows: [
              makeRow("案件名", [data.dealTitle]),
              makeRow("報告日", [data.reportDate]),
              makeRow("実施期間", [data.period]),
              makeRow("実施業務内容（概要）", data.workDescriptionItems),
              makeRow("成果物（納品物）", data.deliverables),
              makeRow("今後の対応", data.nextActions),
            ],
          }),
        ],
      },
    ],
  });
}

export async function buildReportDocx(data: ReportDocxData): Promise<Buffer> {
  const doc = createDocument(data);
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
