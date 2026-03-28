"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Deal {
  id: string;
  title: string;
  status: string;
  monthlyAmount: number | null;
  billingType: string;
  contractAmount: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractSummary: string | null;
  client: {
    name: string;
  };
}

interface ExistingReport {
  id: string;
  dealId: string;
  docxUrl: string | null;
  pdfUrl: string | null;
}

function formatJPY(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

export default function ReportNewPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="skeleton h-8 w-48 rounded-lg" /><div className="skeleton h-64 w-full rounded-xl" /></div>}>
      <ReportNewContent />
    </Suspense>
  );
}

function ReportNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editReportId = searchParams.get("reportId");

  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [savedReportId, setSavedReportId] = useState<string | null>(editReportId);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [uploadingDocx, setUploadingDocx] = useState(false);
  const [docxUploaded, setDocxUploaded] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const isEditMode = !!editReportId;

  useEffect(() => {
    const init = async () => {
      try {
        // Fetch deals
        const dealsRes = await fetch("/api/deals?status=active");
        const dealsData: Deal[] = await dealsRes.json();
        setDeals(dealsData);

        // If editing, load existing report and set deal
        if (editReportId) {
          const reportRes = await fetch(`/api/reports/${editReportId}`);
          if (reportRes.ok) {
            const report: ExistingReport = await reportRes.json();
            setSelectedDealId(report.dealId);
            setSavedReportId(report.id);
            if (report.docxUrl) setDocxUploaded(true);
            if (report.pdfUrl) setPdfUrl(report.pdfUrl);
          }
        } else if (dealsData.length > 0) {
          setSelectedDealId(dealsData[0].id);
        }
      } catch (err) {
        console.error("Failed to initialize:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [editReportId]);

  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  const handleDealChange = (value: string | null) => {
    if (value === null) return;
    setSelectedDealId(value);
    setSavedReportId(null);
    setDocxUploaded(false);
    setPdfUrl(null);
  };

  // Step 1: Save report + generate docx
  const handleGenerateDocx = async () => {
    if (!selectedDeal) return;

    setGeneratingDocx(true);
    try {
      let reportId = savedReportId;
      if (!reportId) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const amount = selectedDeal.billingType === "lumpsum"
          ? (selectedDeal.contractAmount ?? 0)
          : (selectedDeal.monthlyAmount ?? 0);

        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dealId: selectedDeal.id,
            year,
            month,
            period: `${year}年${month}月`,
            workDescription: selectedDeal.contractSummary || "コンサルティング業務",
            amount,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          alert(`保存に失敗しました: ${err.error}`);
          return;
        }

        const report = await res.json();
        reportId = report.id;
        setSavedReportId(reportId);
      }

      // Generate and download docx
      const res = await fetch(`/api/reports/${reportId}/docx`);
      if (!res.ok) {
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          alert(`Word生成に失敗しました: ${err.error}`);
        } catch {
          alert("Word生成に失敗しました");
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDeal.client.name}_ASP業務完了報告書_${selectedDeal.title}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Failed to generate docx:", err);
      alert("Word生成に失敗しました");
    } finally {
      setGeneratingDocx(false);
    }
  };

  // Step 2: Upload edited docx
  const handleUploadDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !savedReportId) return;

    setUploadingDocx(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/reports/${savedReportId}/docx`, {
        method: "PUT",
        body: formData,
      });
      if (res.ok) {
        setDocxUploaded(true);
      } else {
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          alert(`アップロードに失敗しました: ${err.error}`);
        } catch {
          alert("アップロードに失敗しました");
        }
      }
    } catch (err) {
      console.error("Failed to upload docx:", err);
      alert("アップロードに失敗しました");
    } finally {
      setUploadingDocx(false);
      e.target.value = "";
    }
  };

  // Step 3: Upload PDF (user converts Word→PDF locally)
  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !savedReportId) return;

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/reports/${savedReportId}/pdf`, {
        method: "PUT",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pdfUrl) {
          setPdfUrl(data.pdfUrl);
        }
      } else {
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          alert(`PDFアップロードに失敗しました: ${err.error}`);
        } catch {
          alert("PDFアップロードに失敗しました");
        }
      }
    } catch (err) {
      console.error("Failed to upload PDF:", err);
      alert("PDFアップロードに失敗しました");
    } finally {
      setUploadingPdf(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  const dealAmount = selectedDeal
    ? (selectedDeal.billingType === "lumpsum" ? selectedDeal.contractAmount : selectedDeal.monthlyAmount) ?? 0
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-[22px] font-bold tracking-tight text-slate-900">
          {isEditMode ? "報告書 編集" : "報告書 新規作成"}
        </h1>
        <p className="mt-0.5 text-[13px] text-slate-400">
          {isEditMode ? "既存の報告書を編集" : "案件を選択してWord報告書を生成"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Deal Selection + Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">案件選択</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedDealId} onValueChange={handleDealChange}>
                <SelectTrigger className="w-full rounded-lg border-slate-200">
                  <SelectValue placeholder="案件を選択">
                    {selectedDeal ? `${selectedDeal.client.name} - ${selectedDeal.title}` : "案件を選択"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.client.name} - {deal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedDeal && (
            <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">契約情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">クライアント</p>
                  <p className="text-[13px] font-medium text-slate-800 mt-0.5">{selectedDeal.client.name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">案件名</p>
                  <p className="text-[13px] font-medium text-slate-800 mt-0.5">{selectedDeal.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">契約開始</p>
                    <p className="text-[13px] tabular-nums text-slate-700 mt-0.5">{formatDate(selectedDeal.contractStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">契約終了</p>
                    <p className="text-[13px] tabular-nums text-slate-700 mt-0.5">{formatDate(selectedDeal.contractEndDate)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">請求タイプ</p>
                    <p className="text-[13px] text-slate-700 mt-0.5">
                      {selectedDeal.billingType === "lumpsum" ? "一括" : selectedDeal.billingType === "prorated" ? "日割り" : "月額"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">金額</p>
                    <p className="text-[13px] font-semibold tabular-nums text-slate-800 mt-0.5">{formatJPY(dealAmount)}</p>
                  </div>
                </div>
                {selectedDeal.contractSummary && (
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">契約概要</p>
                    <p className="text-[13px] text-slate-700 mt-0.5 whitespace-pre-line">{selectedDeal.contractSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Workflow Steps */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border-slate-200/60 bg-white shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-[14px] font-semibold text-slate-800">報告書作成フロー</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {/* Step 1 */}
              <div className="flex gap-4 py-5 border-b border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-700 shrink-0">1</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-slate-800">Word報告書を生成</p>
                    {savedReportId && <Badge className="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200" variant="secondary">完了</Badge>}
                  </div>
                  <p className="text-[12px] text-slate-400 mt-0.5">テンプレートに契約情報を自動入力して.docxを生成します</p>
                  <button
                    onClick={handleGenerateDocx}
                    disabled={generatingDocx || !selectedDeal}
                    className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-2 text-[13px] font-medium text-indigo-700 transition-colors duration-150 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    {generatingDocx ? "生成中..." : savedReportId ? "Word再生成・ダウンロード" : "Word生成・ダウンロード"}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`flex gap-4 py-5 border-b border-slate-100 ${!savedReportId ? "opacity-40" : ""}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-700 shrink-0">2</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-slate-800">修正したWordをアップロード</p>
                    {docxUploaded && <Badge className="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200" variant="secondary">完了</Badge>}
                  </div>
                  <p className="text-[12px] text-slate-400 mt-0.5">ダウンロードしたWordを手元で修正し、アップロードしてください</p>
                  <label className={`mt-3 inline-flex cursor-pointer rounded-lg border border-slate-200 px-5 py-2 text-[13px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 ${!savedReportId ? "pointer-events-none" : ""}`}>
                    {uploadingDocx ? "アップロード中..." : "修正版Wordをアップロード"}
                    <input type="file" accept=".docx" onChange={handleUploadDocx} className="hidden" disabled={uploadingDocx || !savedReportId} />
                  </label>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`flex gap-4 py-5 border-b border-slate-100 ${!docxUploaded ? "opacity-40" : ""}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-700 shrink-0">3</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-slate-800">PDFをアップロード</p>
                    {pdfUrl && <Badge className="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200" variant="secondary">完了</Badge>}
                  </div>
                  <p className="text-[12px] text-slate-400 mt-0.5">Wordから書き出したPDFをアップロードしてください</p>
                  <label className={`mt-3 inline-flex cursor-pointer rounded-lg bg-indigo-600 px-5 py-2 text-[13px] font-medium text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700 ${!docxUploaded ? "pointer-events-none opacity-50" : ""}`}>
                    {uploadingPdf ? "アップロード中..." : "PDFアップロード"}
                    <input type="file" accept=".pdf" onChange={handleUploadPdf} className="hidden" disabled={uploadingPdf || !docxUploaded} />
                  </label>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`flex gap-4 py-5 ${!pdfUrl ? "opacity-40" : ""}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-700 shrink-0">4</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800">プレビュー・ダウンロード</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">PDFを確認してダウンロード</p>
                  <div className="mt-3 flex gap-3">
                    {pdfUrl && (
                      <>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-slate-200 px-5 py-2 text-[13px] font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                        >
                          プレビュー
                        </a>
                        <a
                          href={pdfUrl}
                          download
                          className="rounded-lg bg-emerald-600 px-5 py-2 text-[13px] font-medium text-white shadow-sm transition-colors duration-150 hover:bg-emerald-700"
                        >
                          PDFダウンロード
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {pdfUrl && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => router.push("/reports")}
                className="rounded-lg bg-slate-900 px-6 py-2.5 text-[13px] font-medium text-white shadow-sm transition-colors duration-150 hover:bg-slate-800"
              >
                報告書一覧に戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
