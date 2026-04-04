# Docx Report Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 報告書作成画面で案件を選択するとWord(.docx)がテンプレートから生成され、ダウンロード→手元で編集→アップロードで上書き→PDFダウンロードまで完結するワークフローを実装する。

**Architecture:** Skillの `create_report.js` のdocx生成ロジックをTypeScript化して `lib/report-builder.ts` に配置。API Routeで docx生成（バッファ返却）、docxアップロード（Vercel Blob保存）、PDF変換（既存の@react-pdf/rendererは維持し、docxからの変換はlibreoffice-convertで対応）。DBのReportモデルに `docxUrl` フィールドを追加。

**Tech Stack:** `docx` (npm), `@vercel/blob` (既存), Prisma, Next.js API Routes

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/report-builder.ts` | Skillの `createReport()` をTS化。Deal+Client情報からdocxバッファ生成 |
| Create | `src/app/api/reports/[id]/docx/route.ts` | GET: docx生成&ダウンロード, PUT: docxアップロード上書き |
| Modify | `prisma/schema.prisma` | Report に `docxUrl String?` 追加 |
| Modify | `src/app/reports/new/page.tsx` | docxダウンロード・アップロードUI追加 |
| Modify | `src/app/reports/page.tsx` | 一覧にdocxダウンロードリンク追加 |
| Create | `src/lib/__tests__/report-builder.test.ts` | report-builder のユニットテスト |

---

### Task 1: `docx` パッケージ追加 & DB スキーマ更新

**Files:**
- Modify: `package.json` (pnpm add docx)
- Modify: `prisma/schema.prisma:159-174` (Report model)

- [ ] **Step 1: Install docx package**

```bash
cd /workspace/caseflow && pnpm add docx
```

- [ ] **Step 2: Add docxUrl field to Report model**

In `prisma/schema.prisma`, add `docxUrl` after `pdfUrl`:

```prisma
model Report {
  id              String       @id @default(cuid())
  dealId          String
  deal            Deal         @relation(fields: [dealId], references: [id], onDelete: Cascade)
  year            Int
  month           Int
  period          String
  workDescription String       @db.Text
  amount          Int
  pdfUrl          String?
  docxUrl         String?
  status          ReportStatus @default(draft)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@unique([dealId, year, month])
}
```

- [ ] **Step 3: Push schema to database**

```bash
cd /workspace/caseflow && npx prisma db push
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
cd /workspace/caseflow && npx prisma generate
```

- [ ] **Step 5: Verify existing tests still pass**

```bash
cd /workspace/caseflow && npx vitest run
```
Expected: 73 tests pass (no regressions)

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml prisma/schema.prisma src/generated/
git commit -m "feat: add docx package and docxUrl field to Report model"
```

---

### Task 2: `lib/report-builder.ts` — docx 生成ロジック

**Files:**
- Create: `src/lib/report-builder.ts`
- Create: `src/lib/__tests__/report-builder.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/report-builder.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/report-builder.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement report-builder.ts**

Create `src/lib/report-builder.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/report-builder.test.ts
```
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/report-builder.ts src/lib/__tests__/report-builder.test.ts
git commit -m "feat: add report-builder with docx generation from Skill template"
```

---

### Task 3: API Route — docx 生成 & アップロード

**Files:**
- Create: `src/app/api/reports/[id]/docx/route.ts`

- [ ] **Step 1: Create the docx API route**

Create `src/app/api/reports/[id]/docx/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { buildReportDocx } from "@/lib/report-builder";

export const dynamic = "force-dynamic";

// GET: generate docx from report data and return as download
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { deal: { include: { client: true } } },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // If already has a docx stored, redirect to it
  if (report.docxUrl) {
    return NextResponse.redirect(report.docxUrl);
  }

  // Generate from template
  const reportDate = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const buffer = await buildReportDocx({
    clientName: report.deal.client.name,
    dealTitle: report.deal.title,
    reportDate,
    period: report.period,
    workDescriptionItems: report.workDescription.split("\n").filter(Boolean),
    deliverables: ["・成果物は別途納品"],
    nextActions: ["・次期対応は別途協議"],
  });

  // Save to blob
  const filename = `reports/${report.id}_${report.year}-${report.month}.docx`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  // Update DB
  await prisma.report.update({
    where: { id },
    data: { docxUrl: blob.url },
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(report.deal.client.name)}_ASP業務完了報告書_${report.year}-${report.month}.docx"`,
    },
  });
}

// PUT: upload edited docx to overwrite
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Validate docx magic bytes (PK)
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    return NextResponse.json({ error: "Invalid docx file" }, { status: 400 });
  }

  const filename = `reports/${report.id}_${report.year}-${report.month}.docx`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const updated = await prisma.report.update({
    where: { id },
    data: { docxUrl: blob.url },
  });

  return NextResponse.json({ docxUrl: updated.docxUrl });
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```
Expected: all pass (76 with new tests)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/reports/[id]/docx/route.ts
git commit -m "feat: add docx generate/download and upload API routes"
```

---

### Task 4: UI — 報告書作成画面にdocx ワークフロー追加

**Files:**
- Modify: `src/app/reports/new/page.tsx`
- Modify: `src/app/reports/page.tsx`

- [ ] **Step 1: Update reports/new/page.tsx**

Add docx download and upload buttons to the existing report creation form. After saving a report, show:
1. "Word生成" button → calls `GET /api/reports/[id]/docx` → browser downloads .docx
2. "Wordアップロード" file input → calls `PUT /api/reports/[id]/docx` with FormData
3. Keep existing "PDF生成" button

Add these state variables and handlers after the existing `handleGeneratePdf`:

```typescript
const [generatingDocx, setGeneratingDocx] = useState(false);
const [uploadingDocx, setUploadingDocx] = useState(false);
```

Add handler for docx generation:

```typescript
const handleGenerateDocx = async () => {
  let reportId = savedReportId;
  if (!reportId) {
    reportId = await handleSave();
    if (!reportId) return;
  }

  setGeneratingDocx(true);
  try {
    const res = await fetch(`/api/reports/${reportId}/docx`);
    if (!res.ok) {
      const err = await res.json();
      alert(`Word生成に失敗しました: ${err.error}`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `報告書_${year}-${month}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to generate docx:", err);
    alert("Word生成に失敗しました");
  } finally {
    setGeneratingDocx(false);
  }
};
```

Add handler for docx upload:

```typescript
const handleUploadDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reportId = savedReportId;
  if (!reportId) {
    alert("先に報告書を保存してください");
    return;
  }

  setUploadingDocx(true);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/reports/${reportId}/docx`, {
      method: "PUT",
      body: formData,
    });
    if (res.ok) {
      alert("Wordファイルをアップロードしました");
    } else {
      const err = await res.json();
      alert(`アップロードに失敗しました: ${err.error}`);
    }
  } catch (err) {
    console.error("Failed to upload docx:", err);
    alert("アップロードに失敗しました");
  } finally {
    setUploadingDocx(false);
    e.target.value = "";
  }
};
```

Update the button bar at the bottom to add Word buttons between "下書き保存" and "PDF生成":

```tsx
<div className="flex justify-end gap-3">
  <button onClick={handleSaveOnly} disabled={saving}
    className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50">
    {saving ? "保存中..." : "下書き保存"}
  </button>
  <button onClick={handleGenerateDocx} disabled={generatingDocx || saving}
    className="rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-medium text-indigo-700 transition-colors duration-150 hover:bg-indigo-100 disabled:opacity-50">
    {generatingDocx ? "生成中..." : "Word生成"}
  </button>
  {savedReportId && (
    <label className="cursor-pointer rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50">
      {uploadingDocx ? "アップロード中..." : "Wordアップロード"}
      <input type="file" accept=".docx" onChange={handleUploadDocx} className="hidden" disabled={uploadingDocx} />
    </label>
  )}
  <button onClick={handleGeneratePdf} disabled={generatingPdf || saving}
    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700 disabled:opacity-50">
    {generatingPdf ? "PDF生成中..." : "PDF生成"}
  </button>
</div>
```

- [ ] **Step 2: Update reports/page.tsx — add docx column to list**

In the table, add a "Word" column after "PDF":

```tsx
<TableHead>Word</TableHead>
```

And in the row:

```tsx
<TableCell>
  {report.docxUrl ? (
    <a
      href={report.docxUrl}
      className="text-primary hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      ダウンロード
    </a>
  ) : (
    "-"
  )}
</TableCell>
```

- [ ] **Step 3: Run TypeScript check and lint**

```bash
npx tsc --noEmit && npx eslint src/app/reports/
```
Expected: no errors

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/app/reports/
git commit -m "feat: add docx generate/upload workflow to report UI"
```

---

### Task 5: 統合テスト & ビルド確認

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass

- [ ] **Step 2: Run lint**

```bash
npx eslint src/ --max-warnings 0
```

- [ ] **Step 3: Build check**

```bash
npx next build
```
Expected: successful build

- [ ] **Step 4: Final commit and push**

```bash
git push origin main
```

---

## Spec Coverage Review

| Requirement | Task |
|---|---|
| 案件を選ぶ | Task 4 — 既存の案件選択UIを活用 |
| テンプレートからdocx生成 | Task 2 (report-builder) + Task 3 (API GET) |
| ダウンロード | Task 3 (GET → download) + Task 4 (UI button) |
| 書き換えてアップロード | Task 3 (PUT) + Task 4 (file input) |
| 上書き保存 | Task 3 (PUT → Vercel Blob) + Task 1 (docxUrl field) |
| PDFダウンロード | 既存機能 (pdf/route.ts) — 変更不要 |
| Skill準拠テンプレート | Task 2 — create_report.jsのレイアウト完全移植 |
