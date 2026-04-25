import type { Metadata } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { AppProviders } from "@/components/providers/app-providers";
import { getWagmiConfig } from "@/lib/web3/wagmi-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Null Loss Trade",
  description: "Loss-to-LP perpetual futures interface for Monad.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(
    getWagmiConfig(),
    (await headers()).get("cookie"),
  );

  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <AppProviders initialState={initialState}>{children}</AppProviders>
      </body>
    </html>
  );
}
