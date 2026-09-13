"use client";

import { useState } from "react";
import { Check, Sparkles, HelpCircle, ArrowRight, CheckCircle2 } from "lucide-react";

interface ProgramSectionProps {
  programs: any[];
  sectionConfig?: any;
  siteConfig?: any;
}

export default function ProgramSection({ programs, sectionConfig, siteConfig }: ProgramSectionProps) {
  const [activeCategory, setActiveCategory] = useState("Semua Program");

  const categories = ["Semua Program", "Anak & Balita", "Prestasi & Squad", "Privat & Dewasa"];

  // Default values matching user's screenshot
  const badgeText = sectionConfig?.badge_text || "KURIKULUM BERJENJANG & TERSTRUKTUR";
  const title = sectionConfig?.title || "Program Pelatihan Renang Unggulan";
  const subtitle =
    sectionConfig?.subtitle ||
    "Dirancang secara ilmiah untuk membentuk fondasi renang yang kuat, aman, dan berorientasi prestasi untuk segala rentang usia.";

  const assessmentTitle = sectionConfig?.assessment_title || "Bingung Memilih Kelas yang Tepat untuk Anak Anda?";
  const assessmentSubtitle =
    sectionConfig?.assessment_subtitle ||
    "Ikuti sesi Free Water Assessment (Uji Kemampuan Air) selama 20 menit bersama Head Coach kami untuk menentukan level penempatan yang optimal.";
  const assessmentButtonText = sectionConfig?.assessment_button_text || "Jadwalkan Free Assessment ->";
  const assessmentWATemplate =
    sectionConfig?.assessment_wa_template ||
    "Halo Admin, saya ingin mendaftar sesi Free Water Assessment (Uji Kemampuan Air) 20 menit untuk anak saya.";

  const waNumber = siteConfig?.wa_number || "6281234567890";

  // Filter programs by category
  const filteredPrograms =
    activeCategory === "Semua Program"
      ? programs
      : programs.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase());

  // Function to create WhatsApp link with encoded text message
  const getWALink = (templateText?: string, defaultTitle?: string) => {
    const rawMsg =
      templateText ||
      `Halo Admin Akuatik Tangerang, saya tertarik mendaftar program *${defaultTitle || "Renang"}*. Mohon informasi ketersediaan jadwal kelas.`;
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(rawMsg)}`;
  };

  return (
    <section id="programs" className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 via-sky-50/30 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sky-100/80 border border-sky-200 text-sky-700 rounded-full text-xs font-black tracking-wider uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>{badgeText}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
            {title}
          </h2>

          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            {subtitle}
          </p>

          {/* Category Filter Tabs */}
          <div className="pt-4 flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all transform hover:-translate-y-0.5 ${
                  activeCategory === cat
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Program Cards Grid */}
        {filteredPrograms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-400 font-bold text-sm">
            Belum ada program pelatihan pada kategori ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredPrograms.map((prog) => {
              const featureList = prog.features
                ? prog.features.split("\n").filter((f: string) => f.trim().length > 0)
                : [];

              return (
                <div
                  key={prog.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
                >
                  <div>
                    {/* Image Area with Overlay Badges */}
                    <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                      <img
                        src={prog.image_url}
                        alt={prog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                      {/* Age Badge Bottom-Left */}
                      {prog.age_badge && (
                        <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-md text-slate-900 font-extrabold text-[11px] rounded-lg shadow-md border border-white">
                          {prog.age_badge}
                        </div>
                      )}

                      {/* Popular Badge Top-Right */}
                      {prog.popular_badge && (
                        <div className="absolute top-3 right-3 px-3 py-1 bg-blue-600 text-white font-black text-[10px] rounded-lg tracking-wider uppercase shadow-md animate-pulse">
                          {prog.popular_badge}
                        </div>
                      )}
                    </div>

                    {/* Card Content Body */}
                    <div className="p-6 space-y-4">
                      {/* Subtitle / Category Header */}
                      {prog.subtitle && (
                        <span className="block text-[10px] font-black uppercase tracking-wider text-sky-600">
                          {prog.subtitle}
                        </span>
                      )}

                      {/* Title */}
                      <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                        {prog.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">
                        {prog.description}
                      </p>

                      <hr className="border-slate-100" />

                      {/* Checklist Features */}
                      <div className="space-y-2">
                        {featureList.map((feat: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                            <Check className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                            <span className="leading-snug">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Price & WhatsApp Button */}
                  <div className="p-6 pt-0 mt-2">
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                          BIAYA KURSUS
                        </span>
                        <span className="text-xs sm:text-sm font-black text-blue-600">
                          {prog.price || "Hubungi Admin"}
                        </span>
                      </div>

                      {/* WhatsApp Button - Direct Chat */}
                      <a
                        href={getWALink(prog.wa_template, prog.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2 bg-white hover:bg-sky-50 border-2 border-sky-500 text-sky-600 hover:text-sky-700 text-xs font-black rounded-xl shadow-sm transition-all transform hover:scale-105 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                        Daftar
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Blue Banner: Free Water Assessment */}
        <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-700 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-4 z-10">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl flex-shrink-0 text-white shadow-inner">
              <HelpCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-black tracking-tight">{assessmentTitle}</h3>
              <p className="text-xs sm:text-sm font-medium text-sky-100 leading-relaxed max-w-2xl">
                {assessmentSubtitle}
              </p>
            </div>
          </div>

          {/* Right Button -> Direct WhatsApp Assessment Schedule */}
          <a
            href={getWALink(assessmentWATemplate, "Free Water Assessment")}
            target="_blank"
            rel="noopener noreferrer"
            className="z-10 px-6 py-3.5 bg-white text-blue-600 hover:bg-sky-50 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-2 flex-shrink-0"
          >
            <span>{assessmentButtonText}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
