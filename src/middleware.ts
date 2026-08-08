import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  // api/external は Bearer トークンで守る（外部エージェント連携・C-2）。
  // 既存の /api/deals を外へ開くと社内UIの保護まで外れるので、パスを分けて
  // ここだけ NextAuth の対象から外す
  // アイコン類は認証の外に出す。favicon.ico だけ除外していたので icon.png と
  // apple-icon.png が 307 でログインへ飛び、未ログインの画面（＝ログイン画面
  // そのもの）でアイコンが出なかった。画像に秘密は無いので外してよい
  // matcher は定数でないとビルド時に静的解析されず無視される（文字列連結は不可）
  matcher: [
    "/((?!api/auth|api/cron|api/external|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)",
  ],
};
