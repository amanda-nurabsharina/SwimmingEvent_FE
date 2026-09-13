"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Waves } from "lucide-react";

export default function Header({
  siteConfig,
  onOpenRegisterModal,
}: {
  siteConfig?: any;
  onOpenRegisterModal?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const appName = siteConfig?.app_name || "AKUATIK TANGERANG";
  const appTagline = siteConfig?.app_tagline || "TIME TRIAL CHAMPIONSHIP 2025";
  const logoUrl = siteConfig?.logo_url || "";

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md py-1 border-b border-slate-200"
          : "bg-white/80 backdrop-blur-sm py-2 border-b border-slate-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link href="/" className="flex items-center gap-3">
            {logoUrl ? (
              <div className="h-10 sm:h-12 w-auto overflow-hidden flex items-center justify-center">
                <img src={logoUrl} alt={appName} className="max-h-full object-contain" />
              </div>
            ) : (
              <div className="p-2.5 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl shadow-md text-white">
                <Waves className="w-6 h-6 animate-pulse" />
              </div>
            )}
            <div>
              <span className="text-lg sm:text-xl font-black tracking-wider text-slate-900">
                {appName}
              </span>
              <p className="text-[10px] sm:text-xs text-sky-600 font-bold tracking-wide">{appTagline}</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href="/" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-sky-600 transition-colors">
              Beranda
            </Link>
            <Link href="/#programs" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-sky-600 transition-colors">
              Program Pelatihan
            </Link>
            <Link href="/#coaches" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-sky-600 transition-colors">
              Tim Pelatih
            </Link>
            <Link href="/#facilities" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-sky-600 transition-colors">
              Fasilitas
            </Link>
            <Link href="/#achievements" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-sky-600 transition-colors">
              Prestasi
            </Link>
            <Link href="/#events" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-sky-600 transition-colors">
              Nomor Lomba
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenRegisterModal}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs sm:text-sm font-black rounded-xl shadow-md shadow-sky-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              Form Pendaftaran
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
