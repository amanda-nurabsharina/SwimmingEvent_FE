import "./globals.css";
import type { Metadata } from "next";
import { ToastProvider } from "../components/Toast";

export const metadata: Metadata = {
  title: "Kejuaraan Renang Time Trial 2025 | Akuatik Indonesia Kota Tangerang",
  description: "Portal resmi pendaftaran lomba renang time trial, buku acara, starting list, dan hasil kejuaraan renang.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
