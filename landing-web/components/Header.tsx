"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Waves } from "lucide-react";

const NAV_ITEM_MAP: Record<string, { label: string; href: string }> = {
  hero: { label: "Beranda", href: "/" },
  programs: { label: "Program Pelatihan", href: "/#programs" },
  coaches: { label: "Tim Pelatih", href: "/#coaches" },
  facilities: { label: "Fasilitas", href: "/#facilities" },
  achievements: { label: "Prestasi", href: "/#achievements" },
  testimonials: { label: "Testimoni", href: "/#testimonials" },
  events: { label: "Nomor Lomba", href: "/#events" },
};

export default function Header({
  siteConfig,
  pageSections,
  onOpenRegisterModal,
}: {
  siteConfig?: any;
  pageSections?: any[];
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

  // Generate dynamic nav items based on pageSections if available
  const navLinks =
    pageSections && pageSections.length > 0
      ? [...pageSections]
          .sort((a, b) => a.sort_order - b.sort_order)
          .filter((s) => s.is_published !== false && NAV_ITEM_MAP[s.section_code])
          .map((s) => ({
            code: s.section_code,
            ...NAV_ITEM_MAP[s.section_code],
          }))
      : [
          { code: "hero", label: "Beranda", href: "/" },
          { code: "programs", label: "Program Pelatihan", href: "/#programs" },
          { code: "coaches", label: "Tim Pelatih", href: "/#coaches" },
          { code: "facilities", label: "Fasilitas", href: "/#facilities" },
          { code: "achievements", label: "Prestasi", href: "/#achievements" },
          { code: "events", label: "Nomor Lomba", href: "/#events" },
        ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md py-1 border-b border-slate-200"
          : "bg-white/80 backdrop-blur-sm py-2 border-b border-slate-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 max-w-[200px] sm:max-w-xs md:max-w-sm min-w-0 group">
            {logoUrl ? (
              <div className="h-10 sm:h-12 w-auto max-w-[100px] sm:max-w-[130px] overflow-hidden flex items-center justify-center shrink-0">
                <img src={logoUrl} alt={appName} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="p-2 sm:p-2.5 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl shadow-md text-white shrink-0">
                <Waves className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-base sm:text-lg lg:text-xl font-black tracking-wider text-slate-900 truncate block leading-tight" title={appName}>
                {appName}
              </span>
              <p className="text-[10px] sm:text-xs text-sky-600 font-bold tracking-wide truncate block leading-tight mt-0.5" title={appTagline}>
                {appTagline}
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center justify-center gap-3 lg:gap-5 xl:gap-7 shrink-0">
            {navLinks.map((item) => (
              <Link
                key={item.code}
                href={item.href}
                className="text-xs lg:text-sm font-bold text-slate-700 hover:text-sky-600 transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={onOpenRegisterModal}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs sm:text-sm font-black rounded-xl shadow-md shadow-sky-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              Form Pendaftaran
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
