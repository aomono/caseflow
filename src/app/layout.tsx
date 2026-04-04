import type { Metadata } from "next";
import { DM_Sans, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SessionProvider } from "@/components/providers/session-provider";
import { ToastProvider } from "@/components/ui/toast";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CaseFlow",
  description: "CRM for consulting business management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${dmSans.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-screen bg-slate-50">
        <SessionProvider>
          <ToastProvider>
            <Sidebar />
            <div className="flex flex-1 flex-col lg:ml-[260px]">
              <Header />
              <main className="flex-1 overflow-auto p-4 pt-16 sm:p-6 sm:pt-16 lg:p-8 lg:pt-4 animate-fade-in">
                <div className="mx-auto max-w-[1360px]">{children}</div>
              </main>
            </div>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
