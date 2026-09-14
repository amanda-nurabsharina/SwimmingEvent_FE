import { MessageSquareQuote, Star, User } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role_title?: string;
  content?: string;
  rating?: number;
  avatar_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

interface TestimonialSectionProps {
  testimonials?: Testimonial[];
  sectionConfig?: {
    badge_text?: string;
    title?: string;
    subtitle?: string;
  };
}

export default function TestimonialSection({
  testimonials,
  sectionConfig,
}: TestimonialSectionProps) {
  const badgeText = sectionConfig?.badge_text || "KEPUASAN ORANG TUA & OFFICIAL KLUB";
  const sectionTitle = sectionConfig?.title || "Apa Kata Mereka Tentang MASC Swim?";
  const sectionSubtitle =
    sectionConfig?.subtitle ||
    "Pengalaman nyata orang tua murid dan pengurus klub yang merasakan manfaat kurikulum renang serta kemudahan sistem turnamen digital.";

  // Default fallback data matching screenshot
  const defaultTestimonials: Testimonial[] = [
    {
      id: 1,
      name: "Bapak Hendra Wijaya",
      role_title: "Orang Tua Atlet (Rayhan, KU 3)",
      content:
        '"Sistem pendaftaran kompetisi di MASC Swim sangat cepat dan transparan! Dari registrasi nomor lomba, pembayaran QRIS otomatis langsung lunas, hingga bagan dan live time di venue terintegrasi mulus."',
      rating: 5,
      avatar_url:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: 2,
      name: "Ibu Ratna Dewi",
      role_title: "Orang Tua Murid Kids Class",
      content:
        '"Pelatihnya sangat telaten dan sabar menghadapi anak yang awalnya takut air. Dalam 2 bulan anak saya sudah percaya diri mengapung dan berenang gaya dada dengan benar."',
      rating: 5,
      avatar_url:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    },
    {
      id: 3,
      name: "Coach Dedy Kurniawan",
      role_title: "Manajer Klub Millennium Aquatic",
      content:
        '"Fitur input waktu lomba lewat tablet dan modul bagan otomatisnya sangat memudahkan panitia di lapangan. Hasil lomba langsung tayang di layar venue dan sertifikat langsung bisa diunduh mandiri."',
      rating: 5,
      avatar_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    },
  ];

  const testimonialList =
    testimonials && testimonials.length > 0
      ? testimonials.filter((t) => t.is_active !== false)
      : defaultTestimonials;

  return (
    <section id="testimonials" className="py-20 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* HEADER SECTION */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          {/* BADGE PILL */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black tracking-wider uppercase border border-blue-200/70 shadow-sm">
            <MessageSquareQuote className="w-3.5 h-3.5" />
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
          {testimonialList.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* RATING STARS */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: item.rating || 5 }).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* QUOTE CONTENT */}
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed italic">
                  {item.content?.startsWith('"') ? item.content : `"${item.content}"`}
                </p>
              </div>

              {/* USER PROFILE */}
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                  {item.avatar_url ? (
                    <img
                      src={item.avatar_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">{item.name}</h3>
                  <p className="text-xs font-bold text-sky-600 leading-tight mt-0.5">
                    {item.role_title}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
