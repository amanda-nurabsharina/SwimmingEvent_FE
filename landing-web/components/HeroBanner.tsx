"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Trophy, Users, ShieldCheck, Lightbulb } from "lucide-react";

interface Banner {
  id: number;
  title: string;
  badge_text: string;
  description: string;
  image_url: string;
  cta_primary_text: string;
  cta_primary_url: string;
  cta_secondary_text: string;
  cta_secondary_url: string;
}

interface HeroConfigData {
  badge_text?: string;
  title_prefix?: string;
  title_highlight?: string;
  subtitle?: string;
  feature_1?: string;
  feature_2?: string;
  feature_3?: string;
  feature_4?: string;
  cta_primary_text?: string;
  cta_primary_url?: string;
  cta_secondary_text?: string;
  cta_secondary_url?: string;
  cta_tertiary_text?: string;
  cta_tertiary_url?: string;
  note_text?: string;
  trust_text_1?: string;
  trust_text_2?: string;
}

interface HeroStatData {
  id?: number;
  value: string;
  label: string;
}

export default function HeroBanner({
  banners,
  heroConfig,
  heroStats,
  onOpenRegisterModal,
}: {
  banners?: Banner[];
  heroConfig?: HeroConfigData;
  heroStats?: HeroStatData[];
  onOpenRegisterModal?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Default fallback image slides for Kotak 2
  const defaultBanners: Banner[] = [
    {
      id: 1,
      title: "Kolam Standard Olimpiade 50m",
      badge_text: "AKUATIK INDONESIA",
      description: "Lintasan renang standar kompetisi nasional.",
      image_url: "https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=1600&auto=format&fit=crop",
      cta_primary_text: "Daftar Kejuaraan",
      cta_primary_url: "#register",
      cta_secondary_text: "Lihat Bagan",
      cta_secondary_url: "/buku-acara",
    },
    {
      id: 2,
      title: "Pencatatan Waktu Digital Presisi",
      badge_text: "TIME TRIAL 2025",
      description: "Sensors & Touchpads terintegrasi secara otomatis.",
      image_url: "https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=1600&auto=format&fit=crop",
      cta_primary_text: "Daftar Kejuaraan",
      cta_primary_url: "#register",
      cta_secondary_text: "Lihat Bagan",
      cta_secondary_url: "/buku-acara",
    },
    {
      id: 3,
      title: "Akademi Renang Berlisensi",
      badge_text: "PRSI / FINA",
      description: "Melatih bibit perenang muda berprestasi.",
      image_url: "https://images.unsplash.com/photo-1560090995-01632a28895b?q=80&w=1600&auto=format&fit=crop",
      cta_primary_text: "Daftar Kejuaraan",
      cta_primary_url: "#register",
      cta_secondary_text: "Lihat Bagan",
      cta_secondary_url: "/buku-acara",
    },
  ];

  const activeBanners = banners && banners.length > 0 ? banners : defaultBanners;

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  // Config values with fallbacks matching user screenshot (Kotak 1)
  const badge = heroConfig?.badge_text || "Official PRSI Certified Swim Academy & Event Partner";
  const titlePrefix = heroConfig?.title_prefix || "Akademi Renang Profesional &";
  const titleHighlight = heroConfig?.title_highlight || "Platform Kejuaraan Terintegrasi";
  const subtitle =
    heroConfig?.subtitle ||
    "Kurikulum renang berstandar internasional dari usia balita hingga atlet nasional, didukung sistem manajemen kompetisi renang digital modern.";

  const feature1 = heroConfig?.feature_1 || "Pelatih Berlisensi Resmi PRSI / FINA";
  const feature2 = heroConfig?.feature_2 || "Kolam Standar Olimpiade & Air Hangat";
  const feature3 = heroConfig?.feature_3 || "Registrasi & Bagan Lomba Online (Bebas Login)";
  const feature4 = heroConfig?.feature_4 || "Live Scoreboard & E-Sertifikat Instan";

  const ctaPrimaryText = heroConfig?.cta_primary_text || "Daftar Kejuaraan";
  const ctaPrimaryUrl = heroConfig?.cta_primary_url || "#register";
  const ctaSecondaryText = heroConfig?.cta_secondary_text || "Lihat Bagan (Heat Sheet)";
  const ctaSecondaryUrl = heroConfig?.cta_secondary_url || "/buku-acara";

  const noteText =
    heroConfig?.note_text || "Tamu & Penonton: Bebas melihat bagan lomba, jadwal, & pendaftaran langsung tanpa login.";
  const trust1 = heroConfig?.trust_text_1 || "Terdaftar & Diakui PRSI";
  const trust2 = heroConfig?.trust_text_2 || "35+ Klub Renang Bergabung";

  // Stats values with fallbacks (Kotak 3)
  const defaultStats: HeroStatData[] = [
    { value: "1,850+", label: "Murid Aktif" },
    { value: "45+", label: "Pelatih Berlisensi" },
    { value: "320+", label: "Medali Kejuaraan" },
    { value: "28+", label: "Kompetisi Terselenggara" },
  ];
  const activeStats = heroStats && heroStats.length > 0 ? heroStats : defaultStats;

  return (
    <section className="relative pt-8 pb-14 bg-gradient-to-b from-sky-50/50 via-white to-sky-50/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* TOP SECTION: Kotak 1 (Left) & Kotak 2 (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* KOTAK 1: Left Content Area */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100/80 border border-sky-200 text-sky-900 text-xs sm:text-sm font-extrabold shadow-sm">
              <span className="text-amber-500">🏆</span>
              <span>{badge}</span>
            </div>

            {/* Title with highlighted text */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight tracking-tight">
              {titlePrefix}{" "}
              <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent underline decoration-sky-400 decoration-wavy underline-offset-8">
                {titleHighlight}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed max-w-2xl">
              {subtitle}
            </p>

            {/* 4 Feature Checkpoints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-700">{feature1}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-700">{feature2}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-700">{feature3}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-700">{feature4}</span>
              </div>
            </div>

            {/* 2 Action CTA Buttons */}
            <div className="flex flex-wrap gap-3 pt-3">
              <button
                onClick={onOpenRegisterModal}
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                {ctaPrimaryText}
                <span className="text-xs">&rarr;</span>
              </button>

              <a
                href={ctaSecondaryUrl}
                className="px-6 py-3.5 bg-white hover:bg-slate-50 text-sky-700 font-extrabold text-xs sm:text-sm rounded-xl border border-sky-200 shadow-sm transition-all flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                {ctaSecondaryText}
              </a>
            </div>

            {/* Extra Info Note & Trust Badges */}
            <div className="space-y-2 pt-2 text-xs font-semibold text-slate-500 border-t border-slate-100">
              <p className="flex items-center gap-1.5 text-slate-600">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>{noteText}</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 text-slate-600 font-bold pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> {trust1}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-sky-600" /> {trust2}
                </span>
              </div>
            </div>
          </div>

          {/* KOTAK 2: Right Image Slider Area (NO Kotak 4 Overlay, full clean image slider!) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-900 aspect-[4/3] group">
              
              {/* Image Carousel Slide */}
              {activeBanners.map((banner, idx) => (
                <div
                  key={banner.id || idx}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    idx === currentIndex ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <img
                    src={banner.image_url || "https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=1600&auto=format&fit=crop"}
                    alt={banner.title || "Hero Banner"}
                    className="w-full h-full object-cover"
                  />
                  {/* Gentle gradient overlay for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-black/20" />
                </div>
              ))}

              {/* Slider Left Arrow Control */}
              {activeBanners.length > 1 && (
                <button
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-sm transition-all transform hover:scale-110 shadow-md border border-white/10"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Slider Right Arrow Control */}
              {activeBanners.length > 1 && (
                <button
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-sm transition-all transform hover:scale-110 shadow-md border border-white/10"
                  aria-label="Next Slide"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Dot Indicators at Bottom */}
              {activeBanners.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-950/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                  {activeBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentIndex ? "w-6 bg-sky-400" : "w-2 bg-white/50 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* KOTAK 3: Bottom Statistics Horizontal Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {activeStats.map((stat, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-sky-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all text-center"
            >
              <div className="text-2xl sm:text-3xl font-black text-sky-600 tracking-tight">{stat.value}</div>
              <div className="text-xs sm:text-sm font-bold text-slate-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
