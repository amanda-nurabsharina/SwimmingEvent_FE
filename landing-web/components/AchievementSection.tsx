import { Trophy, Award, User } from "lucide-react";

interface Achievement {
  id: number;
  title: string;
  year?: string;
  medal_type?: string;
  event_name?: string;
  winner_name?: string;
  sort_order?: number;
  is_active?: boolean;
}

interface AchievementSectionProps {
  achievements?: Achievement[];
  sectionConfig?: {
    badge_text?: string;
    title?: string;
    subtitle?: string;
  };
}

export default function AchievementSection({
  achievements,
  sectionConfig,
}: AchievementSectionProps) {
  const badgeText = sectionConfig?.badge_text || "REKAM JEJAK PRESTASI";
  const sectionTitle = sectionConfig?.title || "Pencapaian Medali & Kejuaraan Resmi";
  const sectionSubtitle =
    sectionConfig?.subtitle ||
    "Komitmen kami dalam pembinaan atlet terbukti dengan raihan medali di berbagai kejuaraan renang tingkat daerah maupun nasional.";

  // Default fallback data matching screenshot
  const defaultAchievements: Achievement[] = [
    {
      id: 1,
      title: "Juara Umum 1 Kejurnas Renang Pelajar",
      year: "2026",
      medal_type: "gold",
      event_name: "Kejurnas Antar Perkumpulan Renang 2026",
      winner_name: "Tim Prestasi MASC Swim Club",
    },
    {
      id: 2,
      title: "Emas 50m & 100m Gaya Bebas KU 3 Putra",
      year: "2025",
      medal_type: "gold",
      event_name: "Jakarta Open Swimming Championship",
      winner_name: "Rayhan Al Fatih",
    },
    {
      id: 3,
      title: "Perak 4x50m Estafet Gaya Ganti Putri",
      year: "2025",
      medal_type: "silver",
      event_name: "Piala Gubernur Aquatic Cup",
      winner_name: "Tim Estafet Putri MASC",
    },
    {
      id: 4,
      title: "Best Swimmer KU 4 Putri Nasional",
      year: "2025",
      medal_type: "gold",
      event_name: "Bandung Sprint Fest 2025",
      winner_name: "Aisyah Putri Azzahra",
    },
  ];

  const achievementList =
    achievements && achievements.length > 0
      ? achievements.filter((a) => a.is_active !== false)
      : defaultAchievements;

  return (
    <section id="achievements" className="py-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* HEADER SECTION */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          {/* BADGE PILL */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black tracking-wider uppercase border border-blue-200/70 shadow-sm">
            <Trophy className="w-3.5 h-3.5" />
            <span>{badgeText}</span>
          </div>

          {/* MAIN TITLE */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {sectionTitle}
          </h2>

          {/* SUBTITLE */}
          <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl mx-auto">
            {sectionSubtitle}
          </p>
        </div>

        {/* CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {achievementList.map((item) => {
            const isGold = item.medal_type === "gold";
            const isSilver = item.medal_type === "silver";

            return (
              <div
                key={item.id}
                className="group bg-white rounded-3xl border border-blue-100/80 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* TOP ROW: YEAR PILL & MEDAL BADGE */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black border border-blue-100">
                      {item.year || "2025"}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center border shadow-sm ${
                        isGold
                          ? "bg-amber-100/80 text-amber-600 border-amber-300"
                          : isSilver
                          ? "bg-slate-100 text-slate-600 border-slate-300"
                          : "bg-amber-900/10 text-amber-800 border-amber-700/30"
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </div>
                  </div>

                  {/* TITLE */}
                  <h3 className="text-base font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>

                  {/* EVENT NAME */}
                  {item.event_name && (
                    <div className="flex items-start gap-2 text-xs text-slate-500 font-medium">
                      <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{item.event_name}</span>
                    </div>
                  )}
                </div>

                {/* WINNER NAME */}
                {item.winner_name && (
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-sky-600">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.winner_name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
