import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalThemeToggle } from "@/components/GlobalThemeToggle";

export const metadata: Metadata = {
  title: "VOC Review Insight Dashboard",
  description: "智能硬件 VOC 问题洞察看板"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <GlobalThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
