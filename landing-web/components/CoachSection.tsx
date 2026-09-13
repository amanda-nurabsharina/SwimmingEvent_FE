"use client";

import { Award, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";

interface CoachSectionProps {
  coaches: any[];
  sectionConfig?: any;
}

export default function CoachSection({ coaches, sectionConfig }: CoachSectionProps) {
  // Default fallbacks matching user screenshot
  const badgeText = sectionConfig?.badge_text || "TIM KEPELATIHAN PROFESIONAL";
  const title = sectionConfig?.title || "Didampingi Pelatih Bersertifikasi Nasional & FINA";
  const subtitle =
    sectionConfig?.subtitle ||
    "Setiap pelatih di MASC Swim memiliki lisensi resmi, pengalaman kepelatihan bertahun-tahun, serta dedikasi tinggi dalam membimbing setiap perenang secara terukur dan aman.";

  if (!coaches || coaches.length === 0) return null;

  return (
    <section id="coaches" className="py-16 sm:py-24 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sky-100/80 border border-sky-200 text-sky-700 rounded-full text-xs font-black tracking-wider uppercase shadow-sm">
            <Award className="w-3.5 h-3.5 text-sky-600" />
            <span>{badgeText}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            {title}
          </h2>

          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Coaches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {coaches.map((coach) => (
            <div
              key={coach.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
            >
              <div>
                {/* Photo Area with License Badge Overlay */}
                <div className="relative h-72 w-full overflow-hidden bg-slate-900">
                  <img
                    src={coach.photo_url}
                    alt={coach.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/10 to-transparent" />

                  {/* License Badge Overlay Bottom-Left */}
                  {coach.license_badge && (
                    <div className="absolute bottom-3 left-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md text-slate-900 text-[10px] sm:text-[11px] font-extrabold rounded-xl shadow-md border border-white max-w-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="truncate">{coach.license_badge}</span>
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-3">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                    {coach.name}
                  </h3>

                  {coach.role_title && (
                    <p className="text-xs font-black text-blue-600 leading-tight">
                      {coach.role_title}
                    </p>
                  )}

                  {coach.experience && (
                    <div className="flex items-start gap-1.5 text-[11px] font-bold text-slate-500 pt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">{coach.experience}</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 font-medium leading-relaxed pt-1 line-clamp-3">
                    {coach.description}
                  </p>
                </div>
              </div>

              {/* Bottom Verification Pill */}
              <div className="p-6 pt-0 mt-2">
                <div className="w-full py-2.5 bg-emerald-50/80 border border-emerald-200 text-emerald-700 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{coach.verification_text || "Verified Coach PB PRSI"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
