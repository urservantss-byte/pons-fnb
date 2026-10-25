import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/lib/toast";
import { StoreProvider } from "@/lib/store";
import { fetchStoreMeta } from "@/lib/store-meta";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const store = await fetchStoreMeta();
  return {
    title: `${store.store_name} — ${store.tagline}`,
    description: `Aplikasi kasir & dashboard admin ${store.store_name}.`,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <ToastProvider>
          <StoreProvider>{children}</StoreProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
