import { describe, it, expect } from "vitest";
import { parseSuggestions, resolveDealIds } from "@/lib/bulk-update";

const DEALS = [
  { id: "d1", title: "商談A", status: "discussion", clientName: "クライアントA" },
];

function wrap(suggestions: unknown): string {
  return JSON.stringify({ suggestions });
}

describe("parseSuggestions", () => {
  it("正しい提案を読み取る", () => {
    const got = parseSuggestions(
      wrap([
        { kind: "status", dealId: "d1", value: "expected", reason: "受注確度up" },
        { kind: "activity", dealId: "d1", summary: "定例" },
      ]),
    );
    expect(got).toHaveLength(2);
    expect(got[0].value).toBe("expected");
  });

  it("前後に説明文が付いていても拾う", () => {
    const got = parseSuggestions(
      `以下が提案です。\n${wrap([{ kind: "activity", dealId: "d1", summary: "x" }])}\n以上です。`,
    );
    expect(got).toHaveLength(1);
  });

  it("不正な値の提案は落とす（画面に出す前に弾く）", () => {
    const got = parseSuggestions(
      wrap([
        { kind: "status", dealId: "d1", value: "unknown" },
        { kind: "probability", dealId: "d1", value: "maybe" },
        { kind: "activity", dealId: "d1" }, // summary が無い
        { kind: "nextAction", dealId: "d1" }, // action が無い
        { kind: "newDeal", title: "案件だけ" }, // clientName が無い
        { kind: "delete", dealId: "d1" }, // 知らない種別
      ]),
    );
    expect(got).toEqual([]);
  });

  it("JSONでない返事は空にする（例外にしない）", () => {
    expect(parseSuggestions("すみません、分かりません")).toEqual([]);
    expect(parseSuggestions("{壊れた")).toEqual([]);
    expect(parseSuggestions("")).toEqual([]);
  });

  it("dealId が無い提案は null のまま残す（不明として画面で選ばせる）", () => {
    const got = parseSuggestions(
      wrap([{ kind: "status", value: "active", mentioned: "例の件" }]),
    );
    expect(got[0].dealId).toBeNull();
    expect(got[0].mentioned).toBe("例の件");
  });
});

describe("resolveDealIds", () => {
  it("実在する案件はそのまま", () => {
    const got = resolveDealIds(
      [{ kind: "status", dealId: "d1", value: "active" }],
      DEALS,
    );
    expect(got[0].dealId).toBe("d1");
  });

  it("実在しないIDは不明に落とす", () => {
    // モデルが実在しないIDを返すことがある。そのまま反映させない
    const got = resolveDealIds(
      [{ kind: "status", dealId: "ghost", value: "active" }],
      DEALS,
    );
    expect(got[0].dealId).toBeNull();
  });
});
