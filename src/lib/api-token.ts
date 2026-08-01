import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * 外部APIのアクセストークン（C-2）。
 *
 * booklib は同型の仕組みをファイル(0600)で持っているが、こちらは DB に入る。
 * **平文は保存しない**——DBのダンプが漏れてもトークンが使えないようにする。
 * 発行時に一度だけ本人へ渡し、以降は照合にハッシュを使う。
 */

const PREFIX = "cf_";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 発行する。平文はこの戻り値でしか手に入らない */
export async function issueToken(name: string): Promise<string> {
  const token = PREFIX + randomBytes(32).toString("base64url");
  await prisma.apiToken.create({
    data: { name, tokenHash: hashToken(token) },
  });
  return token;
}

export async function revokeToken(id: string): Promise<void> {
  await prisma.apiToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

/**
 * Authorization ヘッダを検証して、利用者名を返す。通らなければ null。
 *
 * 失効済みは通さない。最終利用時刻を残すのは「誰がどれだけ使ったか」を
 * 追えるようにするため（トークンを個別に配る意味がそこにある）。
 */
export async function verifyToken(
  header: string | null,
): Promise<{ id: string; name: string } | null> {
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !value) return null;

  const token = value.trim();
  if (!token) return null;

  const found = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, name: true, tokenHash: true, revokedAt: true },
  });
  if (!found || found.revokedAt) return null;

  // ハッシュ一致はDBの一意検索で取れているが、比較自体も定数時間で行う
  const a = Buffer.from(found.tokenHash, "hex");
  const b = Buffer.from(hashToken(token), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  await prisma.apiToken.update({
    where: { id: found.id },
    data: { lastUsedAt: new Date() },
  });
  return { id: found.id, name: found.name };
}
