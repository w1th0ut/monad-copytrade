import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "nolosstrade",
  description: "No-Loss Copy Trade Perp DEX on Monad.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
