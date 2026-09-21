import Link from "next/link";
import { Waves, Phone, Mail, MapPin, Trophy } from "lucide-react";

interface FooterProps {
  siteConfig?: any;
  programs?: any[];
  tournaments?: any[];
}

export default function Footer({ siteConfig, programs, tournaments }: FooterProps) {
  const appName = siteConfig?.app_name || "AKUATIK TANGERANG";
  const logoUrl = siteConfig?.logo_url || "";
  const footerDesc =
    siteConfig?.footer_description ||
    "Membangun Karakter, Mengasah Teknik, Mencetak Juara Renang Masa Depan";
  const address =
    siteConfig?.address || "Aquatic Center Complex, Jl. Pintu Satu Senayan No. 8, Jakarta Pusat";
  const email = siteConfig?.email || "info@akuatik-tangerang.id";
  const rawWa = siteConfig?.wa_number || "6281234567890";

  // Format WA number nicely (e.g. +62 812-3456-7890)
  const formattedWa = rawWa.startsWith("62")
    ? `+62 ${rawWa.slice(2, 5)}-${rawWa.slice(5, 9)}-${rawWa.slice(9)}`
    : rawWa;

  const instagramUrl = siteConfig?.instagram_url || "https://instagram.com";
  const youtubeUrl = siteConfig?.youtube_url || "https://youtube.com";
  const tiktokUrl = siteConfig?.tiktok_url || "https://tiktok.com";

  // Default training programs fallback list
  const programList =
    programs && programs.length > 0
      ? programs
      : [
          { title: "Baby & Toddler Aquatic" },
          { title: "Kids Learn to Swim (Reguler)" },
          { title: "Prestasi & Squad Atlet (Club)" },
          { title: "Private & Adult Master Swim" },
        ];

  // Default tournaments fallback list
  const defaultTournaments = [
    { id: 1, name: "TIME TRIAL 2026 MASC KOTA TANGERANG", is_active: true },
    { id: 2, name: "TURNAMEN RENANG HUT RI 17 2027", is_active: false },
    { id: 3, name: "KEJUARAAN RENANG PELAJAR TERBUKA 2025", is_active: false },
  ];
  const tournamentList =
    tournaments && tournaments.length > 0 ? tournaments.slice(0, 5) : defaultTournaments;

  return (
    <footer className="bg-[#091433] text-slate-300 text-xs py-14 border-t border-blue-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* COLUMN 1: LOGO, BRAND, SLOGAN & SOCIAL MEDIA LINKS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="h-10 w-auto overflow-hidden flex items-center justify-center">
                <img src={logoUrl} alt={appName} className="max-h-full object-contain" />
              </div>
            ) : (
              <div className="p-2 bg-gradient-to-br from-blue-600 to-sky-500 rounded-xl text-white shadow-md">
                <Waves className="w-5 h-5" />
              </div>
            )}
            <span className="text-base sm:text-lg font-black text-white tracking-wider">
              {appName}
            </span>
          </div>

          <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xs">
            {footerDesc}
          </p>

          {/* Social Media Link Buttons (IG, YouTube, TikTok/Facebook) */}
          <div className="flex items-center gap-2 pt-1">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-blue-900/40 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 text-slate-300 hover:text-white border border-blue-800/50 flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-sm"
                title="Instagram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            )}

            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-blue-900/40 hover:bg-red-600 text-slate-300 hover:text-white border border-blue-800/50 flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-sm"
                title="YouTube"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            )}

            {tiktokUrl && (
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-blue-900/40 hover:bg-slate-900 hover:text-cyan-400 text-slate-300 border border-blue-800/50 flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-sm"
                title="TikTok"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.56-1.3 2.56.01 1.01.55 1.97 1.39 2.51.93.61 2.15.65 3.1.13 1.02-.54 1.64-1.64 1.64-2.8.01-4.57.01-9.14.01-13.71z"/>
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* COLUMN 2: PROGRAM RENANG */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-white">
            PROGRAM RENANG
          </h4>
          <ul className="space-y-2.5 font-semibold text-slate-400">
            {programList.map((prog, idx) => (
              <li key={idx}>
                <a
                  href="#programs"
                  className="hover:text-sky-400 transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500/50" />
                  {prog.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* COLUMN 3: TURNAMEN */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            TURNAMEN
          </h4>
          <ul className="space-y-2.5 font-semibold text-slate-400">
            {tournamentList.map((t: any, idx: number) => (
              <li key={t.id || idx}>
                <Link
                  href={`/buku-acara?tournament_id=${t.id}`}
                  className="hover:text-sky-400 transition-colors flex items-center gap-2 group"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      t.is_active ? "bg-emerald-400 ring-2 ring-emerald-400/30" : "bg-cyan-500/50"
                    } shrink-0`}
                  />
                  <span className="truncate group-hover:underline">{t.name}</span>
                  {t.is_active && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      Aktif
                    </span>
                  )}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/buku-acara"
                className="text-[11px] text-sky-400/90 hover:text-sky-300 font-bold flex items-center gap-1 pt-1"
              >
                <span>Lihat Semua Turnamen &rarr;</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* COLUMN 4: KONTAK & LOKASI */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-white">
            KONTAK & LOKASI
          </h4>
          <ul className="space-y-3 font-semibold text-slate-400">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-sky-400 shrink-0" />
              <a href={`https://wa.me/${rawWa}`} target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition-colors">
                {formattedWa}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-sky-400 shrink-0" />
              <a href={`mailto:${email}`} className="hover:text-sky-400 transition-colors">
                {email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Footer Line */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-blue-950/60 text-center text-[11px] text-slate-500 font-bold">
        {siteConfig?.footer_text || `© ${new Date().getFullYear()} ${appName}. All rights reserved.`}
      </div>
    </footer>
  );
}
