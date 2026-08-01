import Anthropic from "@anthropic-ai/sdk";

/**
 * 貼り付け一括更新（C-1）の提案づくり。
 *
 * ここは**読むだけ**。DBには一切書かない。AIの提案は必ず確認画面を挟んでから
 * apply 側で適用する（受け入れ基準5「無確認の自動書き込みが存在しない」）。
 * この分離を崩さないために、このファイルは prisma を import しない。
 */

const MODEL = process.env.BULK_UPDATE_MODEL ?? "claude-sonnet-5";
const MAX_TOKENS = 4096;

export const DEAL_STATUSES = [
  "lead",
  "discussion",
  "expected",
  "active",
  "renewal",
  "closed",
  "lost",
] as const;
export const PROBABILITIES = ["high", "mid", "low"] as const;

export type SuggestionKind =
  | "status"
  | "probability"
  | "nextAction"
  | "activity"
  | "newDeal";

export type Suggestion = {
  kind: SuggestionKind;
  /** 対象の案件。**照合できなければ null**＝確認画面でユーザーに選ばせる */
  dealId: string | null;
  /** 照合の手がかり（null のときに何を指していたか）。画面に出す */
  mentioned?: string;
  /** status / probability の値 */
  value?: string;
  /** nextAction の内容と期日 */
  action?: string;
  date?: string;
  /** activity の要約、newDeal の案件名・クライアント名 */
  summary?: string;
  title?: string;
  clientName?: string;
  /** なぜそう判断したか。ユーザーが取捨選択するのに要る */
  reason?: string;
};

export type DealBrief = {
  id: string;
  title: string;
  status: string;
  clientName: string;
};

function buildPrompt(text: string, deals: DealBrief[]): string {
  const list = deals
    .map(
      (d) =>
        `- id=${d.id} / クライアント=${d.clientName} / 案件=${d.title} / 現在のステータス=${d.status}`,
    )
    .join("\n");

  return `あなたは商談パイプラインの更新を補助するアシスタントです。
会議メモやチャットの抜粋を読み、既存の案件に対する更新の**提案**を作ってください。
あなたの出力はそのまま反映されるのではなく、人が確認してから反映されます。

# 既存の案件一覧
${list || "(案件がありません)"}

# 入力テキスト
${text}

# 出力の規則
JSONのみを返してください。説明文は書かないでください。

{"suggestions": [
  {"kind": "status", "dealId": "...", "value": "discussion", "reason": "..."},
  {"kind": "probability", "dealId": "...", "value": "high", "reason": "..."},
  {"kind": "nextAction", "dealId": "...", "action": "見積書を送る", "date": "2026-08-10", "reason": "..."},
  {"kind": "activity", "dealId": "...", "summary": "定例。予算感を確認", "reason": "..."},
  {"kind": "newDeal", "clientName": "...", "title": "...", "reason": "..."}
]}

- kind は status / probability / nextAction / activity / newDeal のいずれか
- status は ${DEAL_STATUSES.join(" / ")} のいずれか
- probability は ${PROBABILITIES.join(" / ")} のいずれか
- date は YYYY-MM-DD 形式。分からなければ省く
- **どの案件の話か確信が持てないときは dealId を null にし、mentioned に
  テキスト中の呼び名をそのまま入れてください。** 推測で紐付けないでください。
  誤って紐付けると台帳が壊れます。分からないことは分からないと出すのが正しい
- テキストに書かれていないことを補わないでください。推測で確度や期日を作らない
- 更新すべきことが無ければ {"suggestions": []} を返してください`;
}

/** モデルの返事からJSONを取り出す。前後に説明文が付いても拾えるようにする */
export function parseSuggestions(raw: string): Suggestion[] {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  const list = (parsed as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) return [];

  const out: Suggestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const kind = String(s.kind ?? "");
    if (!["status", "probability", "nextAction", "activity", "newDeal"].includes(kind)) {
      continue;
    }
    // 値の妥当性はここで落とす。画面に出す前に弾いておけば、ユーザーが
    // 「反映」を押しても不正な値がAPIまで届かない
    if (kind === "status" && !DEAL_STATUSES.includes(s.value as never)) continue;
    if (kind === "probability" && !PROBABILITIES.includes(s.value as never)) continue;
    if (kind === "newDeal" && !(s.title && s.clientName)) continue;
    if (kind === "activity" && !s.summary) continue;
    if (kind === "nextAction" && !s.action) continue;

    out.push({
      kind: kind as SuggestionKind,
      dealId: typeof s.dealId === "string" && s.dealId ? s.dealId : null,
      mentioned: typeof s.mentioned === "string" ? s.mentioned : undefined,
      value: typeof s.value === "string" ? s.value : undefined,
      action: typeof s.action === "string" ? s.action : undefined,
      date: typeof s.date === "string" ? s.date : undefined,
      summary: typeof s.summary === "string" ? s.summary : undefined,
      title: typeof s.title === "string" ? s.title : undefined,
      clientName: typeof s.clientName === "string" ? s.clientName : undefined,
      reason: typeof s.reason === "string" ? s.reason : undefined,
    });
  }
  return out;
}

/**
 * 提案が実在の案件を指しているかを確かめる。
 *
 * モデルが実在しないIDを返すことがある。画面に出す前に null に落として
 * 「不明」扱いにする——存在しないIDのまま反映を押させない。
 */
export function resolveDealIds(
  suggestions: Suggestion[],
  deals: DealBrief[],
): Suggestion[] {
  const known = new Set(deals.map((d) => d.id));
  return suggestions.map((s) =>
    s.dealId && known.has(s.dealId) ? s : { ...s, dealId: null },
  );
}

export async function analyzeText(
  text: string,
  deals: DealBrief[],
): Promise<Suggestion[]> {
  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: buildPrompt(text, deals) }],
  });
  const raw = message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  return resolveDealIds(parseSuggestions(raw), deals);
}
