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
  matcher: [
    "/((?!api/auth|api/cron|api/external|_next/static|_next/image|favicon.ico).*)",
  ],
};
