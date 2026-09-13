import "./globals.css";

export const metadata = {
  title: "Admin CMS | Kejuaraan Renang Time Trial 2025",
  description: "Dashboard Manajemen Pendaftaran & Buku Acara Kejuaraan Renang Kota Tangerang.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
