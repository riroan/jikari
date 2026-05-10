import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { FuriganaBoundary } from "@/components/FuriganaBoundary";
import { HydrationBoundary } from "@/components/HydrationBoundary";
import { ThemeApplier } from "@/components/ThemeApplier";
import "./globals.css";

/**
 * Pre-paint theme script. Reads the localStorage hint set by ThemeApplier
 * and applies data-theme before the first paint to avoid a light→dark flash.
 * No hint = no attr → globals.css's prefers-color-scheme media query handles it.
 */
const themeBootScript = `(function(){try{var t=localStorage.getItem('jikari-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

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
  viewportFit: "cover",
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
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeApplier />
        <HydrationBoundary>
          <FuriganaBoundary>{children}</FuriganaBoundary>
        </HydrationBoundary>
      </body>
    </html>
  );
}
