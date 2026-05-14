import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExitIQ — Birdeye-Powered Position Risk Copilot",
  description:
    "A Solana position risk copilot that turns Birdeye price, liquidity, OHLCV, security, and trade data into HOLD, WATCH, TRIM, or EXIT verdicts.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
