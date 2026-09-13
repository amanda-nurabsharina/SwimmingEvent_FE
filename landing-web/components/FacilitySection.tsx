import { Layers, CheckCircle2 } from "lucide-react";

interface Facility {
  id: number;
  title: string;
  tag_text?: string;
  description?: string;
  specs_text?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

interface FacilitySectionProps {
  facilities?: Facility[];
  facilityConfig?: {
    badge_text?: string;
    title?: string;
    subtitle?: string;
  };
}

export default function FacilitySection({ facilities, facilityConfig }: FacilitySectionProps) {
  const badgeText = facilityConfig?.badge_text || "FASILITAS & STANDAR KOLAM";
  const sectionTitle =
    facilityConfig?.title || "Infrastruktur Kolam Renang Standar Internasional";
  const sectionSubtitle =
    facilityConfig?.subtitle ||
    "Lingkungan latihan yang higienis, aman, dan dirancang khusus untuk kenyamanan murid dari usia balita hingga atlet profesional.";

  // Default fallback facilities matching user's exact screenshot
  const defaultFacilities: Facility[] = [
    {
      id: 1,
      title: "Olympic Competition Pool (50m)",
      tag_text: "50m x 25m",
      description:
        "Kolam standar FINA 50 meter dengan 8 lintasan, depth 2.0m, timing sensor pads ready, dan overflow gutters.",
      specs_text: "50m x 25m | 8 Lintasan | Kedalaman 2.0m",
      image_url:
        "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800&auto=format&fit=crop&q=80",
    },
    {
      id: 2,
      title: "Semi-Indoor Heated Training Pool (25m)",
      tag_text: "25m x 12m",
      description:
        "Kolam latihan semi-indoor dengan atap kanopi pelindung UV, sistem filter garam (saltwater) tanpa klorin menyengat.",
      specs_text: "25m x 12m | Suhu 29°C – 31°C | Ramah Kulit Sensitif",
      image_url:
        "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=800&auto=format&fit=crop&q=80",
    },
    {
      id: 3,
      title: "Dryland Conditioning & Gym Center",
      tag_text: "Cardio & Strength Equipment",
      description:
        "Area latihan darat khusus perenang yang dilengkapi pull benches, resistance bands, dan plyometric stations.",
      specs_text: "Cardio & Strength Equipment | Yoga Mats | Core Trainer",
      image_url:
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80",
    },
  ];

  const facilityList =
    facilities && facilities.length > 0
      ? facilities.filter((f) => f.is_active !== false)
      : defaultFacilities;

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 via-white to-blue-50/20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* HEADER SECTION */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          {/* BADGE PILL */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black tracking-wider uppercase border border-blue-200/70 shadow-sm">
            <Layers className="w-3.5 h-3.5" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {facilityList.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* IMAGE CONTAINER WITH FLOATING TAG */}
                <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {item.tag_text && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3.5 py-1.5 bg-white/90 backdrop-blur-md text-blue-900 text-[11px] font-black rounded-full border border-white/60 shadow-md">
                        {item.tag_text}
                      </span>
                    </div>
                  )}
                </div>

                {/* CARD BODY */}
                <div className="p-6 space-y-3">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* BOTTOM SPECS BADGE PILL */}
              {item.specs_text && (
                <div className="px-6 pb-6 pt-2">
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-blue-50/70 text-blue-700 font-bold text-[11px] rounded-full border border-blue-100 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="truncate">{item.specs_text}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
