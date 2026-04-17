import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { FuriganaBoundary } from "@/components/FuriganaBoundary";
import "./globals.css";

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-jp-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-jp-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "jikari · 일본어 공부",
  description: "한국어 화자를 위한 조용한 일본어 학습 도구",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F5EFE4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${notoSerifJP.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <FuriganaBoundary>{children}</FuriganaBoundary>
      </body>
    </html>
  );
}
