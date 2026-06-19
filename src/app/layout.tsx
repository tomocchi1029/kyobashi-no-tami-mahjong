import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

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
          <Nav />
          <main className="flex-1 px-4 pb-20 pt-4">{children}</main>
          <footer className="px-4 pb-6 text-center text-xs text-stone-400">
            京橋の民セット麻雀記録ツール ・ データはこの端末に保存されます
          </footer>
        </div>
      </body>
    </html>
  );
}
