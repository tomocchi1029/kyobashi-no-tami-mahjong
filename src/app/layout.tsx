import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "京橋の民セット麻雀記録ツール",
  description: "セット麻雀の卓組・点数・ランキングを記録するアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col">
          <ClientLayout>{children}</ClientLayout>
        </div>
      </body>
    </html>
  );
}
