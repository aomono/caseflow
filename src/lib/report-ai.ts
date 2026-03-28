import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export interface ReportAIInput {
  clientName: string;
  dealTitle: string;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractSummary: string | null;
  description: string | null;
}

export interface ReportAIOutput {
  workDescriptionItems: string[];
  deliverables: string[];
  nextActions: string[];
}

export async function generateReportContent(input: ReportAIInput): Promise<ReportAIOutput> {
  const context = [
    `クライアント名: ${input.clientName}`,
    `案件名: ${input.dealTitle}`,
    input.contractStartDate ? `契約開始: ${input.contractStartDate}` : null,
    input.contractEndDate ? `契約終了: ${input.contractEndDate}` : null,
    input.contractSummary ? `契約概要: ${input.contractSummary}` : null,
    input.description ? `案件詳細: ${input.description}` : null,
  ].filter(Boolean).join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `あなたはコンサルティング会社（株式会社アステリオストラテジーパートナーズ）の業務完了報告書の内容を作成するアシスタントです。

以下の案件情報から、業務完了報告書に記載する3つのセクションを生成してください。

${context}

以下のJSON形式で回答してください。各項目は「・」で始まる箇条書きの配列です。
実施業務内容の最初の行は「契約に基づき、以下の業務を完了しました。」としてください。
案件名やクライアント名から推測して、もっともらしいコンサルティング業務の内容を記載してください。

{
  "workDescriptionItems": ["契約に基づき、以下の業務を完了しました。", "・具体的な業務項目1", "・業務項目2", ...],
  "deliverables": ["・成果物1", "・成果物2", ...],
  "nextActions": ["・今後のアクション1", ...]
}

JSONのみを返してください。説明は不要です。`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]) as ReportAIOutput;
    return {
      workDescriptionItems: parsed.workDescriptionItems ?? ["契約に基づき、以下の業務を完了しました。", "・コンサルティング業務の実施"],
      deliverables: parsed.deliverables ?? ["・業務報告書"],
      nextActions: parsed.nextActions ?? ["・次期対応については別途協議"],
    };
  } catch {
    return {
      workDescriptionItems: ["契約に基づき、以下の業務を完了しました。", "・コンサルティング業務の実施"],
      deliverables: ["・業務報告書"],
      nextActions: ["・次期対応については別途協議"],
    };
  }
}
