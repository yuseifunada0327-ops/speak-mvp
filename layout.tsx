import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "SpeakUp - 英語学習アプリ",
  description:
    "スピーキング・リスニング・語彙を統合的に強化するAI英語学習アプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div className="mx-auto min-h-screen max-w-md bg-white pb-20 shadow-xl">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
