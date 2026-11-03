import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { FuriganaBoundary } from "@/components/FuriganaBoundary";
import { HydrationBoundary } from "@/components/HydrationBoundary";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SyncStatus } from "@/components/SyncStatus";
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
  preload: false, // CJK-only; not needed for first paint (Korean UI is Pretendard)
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-jp-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "jikari · 일본어 공부",
  description: "한국어 화자를 위한 조용한 일본어 학습 도구",
  appleWebApp: { capable: true, title: "jikari", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5EFE4" },
    { media: "(prefers-color-scheme: dark)", color: "#0E141E" },
  ],
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
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* Dynamic-subset variable build: only the glyph slices actually used are fetched. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeApplier />
        <ServiceWorkerRegister />
        <SyncStatus />
        <HydrationBoundary>
          <FuriganaBoundary>{children}</FuriganaBoundary>
        </HydrationBoundary>
      </body>
    </html>
  );
}
