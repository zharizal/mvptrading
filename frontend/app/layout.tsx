import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Terminal MVP",
  description: "AI trading terminal MVP scaffold",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
