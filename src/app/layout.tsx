import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "京橋の民セット麻雀記録ツール",
  description: "セット麻雀の卓組・点数・ランキングを記録するアプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4f46e5",
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
