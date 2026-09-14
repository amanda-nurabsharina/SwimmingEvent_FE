"use client";

import { useState, useEffect } from "react";
import {
  fetchPageSections,
  batchSavePageSections,
  resetPageSections,
} from "../lib/api-admin";
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  RefreshCw,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  Image as ImageIcon,
  GraduationCap,
  UserCheck,
  Building2,
  Award,
  MessageSquareQuote,
  Calendar,
  Search,
} from "lucide-react";

interface PageSectionItem {
  id: number;
  page_slug: string;
  section_code: string;
  badge_text: string;
  title: string;
  description: string;
  sort_order: number;
  is_published: boolean;
}

// Icon and color mapper per section code
const SECTION_METADATA: Record<
  string,
  { icon: any; color: string; badgeColor: string; defaultTitle: string; defaultDesc: string }
> = {
  hero: {
    icon: ImageIcon,
    color: "bg-blue-500 text-white",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    defaultTitle: "Banner Utama & Header Hero",
    defaultDesc: "Slider foto kegiatan, judul headline hero, tombol registrasi, dan counter statistik prestasi.",
  },
  programs: {
    icon: GraduationCap,
    color: "bg-emerald-500 text-white",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    defaultTitle: "Program Pelatihan Renang Unggulan",
    defaultDesc: "Daftar kurikulum renang berjenjang dari kelas anak & balita, privat dewasa, hingga skuad prestasi.",
  },
  coaches: {
    icon: UserCheck,
    color: "bg-indigo-500 text-white",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    defaultTitle: "Tim Kepelatihan Profesional",
    defaultDesc: "Profil head coach dan pelatih renang bersertifikasi resmi PB PRSI / Akuatik Indonesia & FINA.",
  },
  facilities: {
    icon: Building2,
    color: "bg-cyan-500 text-white",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    defaultTitle: "Fasilitas & Standar Kolam",
    defaultDesc: "Infrastruktur kolam ukuran olimpiade 50m, kolam air hangat, tribun penonton, dan sistem filtrasi modern.",
  },
  achievements: {
    icon: Award,
    color: "bg-amber-500 text-white",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    defaultTitle: "Rekam Jejak Prestasi & Medali",
    defaultDesc: "Koleksi medali emas, perak, dan perunggu yang diraih atlet pada kejuaraan renang tingkat nasional & daerah.",
  },
  testimonials: {
    icon: MessageSquareQuote,
    color: "bg-rose-500 text-white",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    defaultTitle: "Testimoni Orang Tua & Klub",
    defaultDesc: "Ulasan kepuasan dan pengalaman nyata dari wali atlet dan manajer klub renang mitra.",
  },
  events: {
    icon: Calendar,
    color: "bg-sky-500 text-white",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    defaultTitle: "Jadwal & Nomor Acara Kejuaraan",
    defaultDesc: "Daftar nomor lomba kejuaraan yang sedang dibuka pendaftarannya lengkap dengan jadwal acara.",
  },
  status_checker: {
    icon: Search,
    color: "bg-purple-500 text-white",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    defaultTitle: "Cek Status & Validasi Pendaftaran",
    defaultDesc: "Form pelacakan resi pendaftaran peserta secara publik untuk mengecek status verifikasi dan nomor heat.",
  },
};

export default function SectionOrderManager({ onRefresh }: { onRefresh?: () => void }) {
  const [sections, setSections] = useState<PageSectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Load section ordering from Backend
  const loadSections = async () => {
    setLoading(true);
    const res = await fetchPageSections("homepage");
    if (res.success && res.data && res.data.length > 0) {
      // Sort by sort_order ascending
      const sorted = [...res.data].sort((a, b) => a.sort_order - b.sort_order);
      setSections(sorted);
    } else {
      // Fallback default list if DB was empty
      const defaultCodes = [
        "hero",
        "programs",
        "coaches",
        "facilities",
        "achievements",
        "testimonials",
        "events",
        "status_checker",
      ];
      const defaults: PageSectionItem[] = defaultCodes.map((code, idx) => ({
        id: idx + 1,
        page_slug: "homepage",
        section_code: code,
        badge_text: SECTION_METADATA[code]?.defaultTitle || code,
        title: SECTION_METADATA[code]?.defaultTitle || code,
        description: SECTION_METADATA[code]?.defaultDesc || "",
        sort_order: idx + 1,
        is_published: true,
      }));
      setSections(defaults);
    }
    setLoading(false);
    setHasChanges(false);
  };

  useEffect(() => {
    loadSections();
  }, []);

  // Move Section Up
  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = [...sections];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;

    // Recalculate sort_order (1-based index)
    const reordered = newItems.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));
    setSections(reordered);
    setHasChanges(true);
  };

  // Move Section Down
  const moveDown = (index: number) => {
    if (index >= sections.length - 1) return;
    const newItems = [...sections];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;

    // Recalculate sort_order (1-based index)
    const reordered = newItems.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));
    setSections(reordered);
    setHasChanges(true);
  };

  // Toggle Visibility
  const toggleVisibility = (index: number) => {
    const newItems = [...sections];
    newItems[index] = {
      ...newItems[index],
      is_published: !newItems[index].is_published,
    };
    setSections(newItems);
    setHasChanges(true);
  };

  // Save changes to backend
  const handleSave = async () => {
    setSaving(true);
    const res = await batchSavePageSections(sections);
    setSaving(false);

    if (res.success) {
      setSaveSuccess(true);
      setHasChanges(false);
      if (res.data) {
        const sorted = [...res.data].sort((a, b) => a.sort_order - b.sort_order);
        setSections(sorted);
      }
      if (onRefresh) onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert("Gagal menyimpan urutan: " + (res.message || "Unknown error"));
    }
  };

  // Reset to default ordering
  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 5000);
      return;
    }
    setConfirmReset(false);
    setSaving(true);
    const res = await resetPageSections("homepage");
    setSaving(false);

    if (res.success && res.data) {
      const sorted = [...res.data].sort((a, b) => a.sort_order - b.sort_order);
      setSections(sorted);
      setHasChanges(false);
      setSaveSuccess(true);
      if (onRefresh) onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert("Gagal mereset urutan: " + (res.message || "Unknown error"));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-black border border-sky-200 mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>TATA LETAK LANDING PAGE</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Urutan Menu Konten Landing Page
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Sesuaikan urutan susunan bagian-bagian (*sections*) di halaman depan website pengunjung.
            Gunakan tombol panah <strong>Naik (▲)</strong> dan <strong>Turun (▼)</strong> untuk mengubah urutan, serta aktifkan/nonaktifkan tombol sakelar visibilitas.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {confirmReset ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <button
                onClick={handleReset}
                disabled={saving}
                className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/20 animate-pulse"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yakin Reset?</span>
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={handleReset}
              disabled={saving || loading}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              title="Kembalikan ke susunan bawaan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>
          )}

          <button
            onClick={loadSections}
            disabled={saving || loading}
            className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading || !hasChanges}
            className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              hasChanges
                ? "bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white shadow-blue-500/20"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Menyimpan..." : "Simpan Perubahan Urutan"}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold shadow-sm transition-all animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Susunan urutan konten landing page berhasil disimpan dan langsung diterapkan ke halaman pengunjung!</span>
        </div>
      )}

      {/* Unsaved Changes Warning Badge */}
      {hasChanges && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-800 text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Terdapat perubahan urutan yang belum disimpan. Klik tombol <strong>&quot;Simpan Perubahan Urutan&quot;</strong> di atas untuk menerapkan.</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-black cursor-pointer transition-all ml-2 shrink-0"
          >
            Simpan Sekarang
          </button>
        </div>
      )}

      {/* Interactive Sequence Flow Ribbon Preview */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Alur Urutan Tampilan (Atas ke Bawah):
          </span>
          <span className="text-[11px] text-slate-400 font-bold">
            Total {sections.length} Bagian ({sections.filter((s) => s.is_published).length} Aktif)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {sections.map((sec, idx) => {
            const meta = SECTION_METADATA[sec.section_code] || {
              badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
              defaultTitle: sec.title || sec.section_code,
            };
            return (
              <div key={sec.section_code || idx} className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
                    sec.is_published
                      ? meta.badgeColor
                      : "bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-900/10 flex items-center justify-center text-[9px] font-black">
                    {idx + 1}
                  </span>
                  <span>{sec.title || meta.defaultTitle}</span>
                </span>
                {idx < sections.length - 1 && (
                  <span className="text-slate-300 font-black text-xs">→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reorderable Section Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Memuat konfigurasi urutan bagian...</p>
          </div>
        ) : (
          sections.map((sec, index) => {
            const meta = SECTION_METADATA[sec.section_code] || {
              icon: Layers,
              color: "bg-slate-700 text-white",
              badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
              defaultTitle: sec.title || sec.section_code,
              defaultDesc: sec.description || "",
            };
            const IconComponent = meta.icon;
            const isFirst = index === 0;
            const isLast = index === sections.length - 1;

            return (
              <div
                key={sec.section_code || sec.id}
                className={`bg-white rounded-3xl border p-4 sm:p-5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  sec.is_published
                    ? "border-slate-200 shadow-sm hover:border-sky-300 hover:shadow-md"
                    : "border-slate-200/80 bg-slate-50/60 opacity-60"
                }`}
              >
                {/* Left Side: Drag Grip + Position Number + Icon + Titles */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="p-1 text-slate-300 hover:text-slate-500 cursor-grab shrink-0">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Position Badge */}
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                    #{index + 1}
                  </div>

                  {/* Section Theme Icon */}
                  <div
                    className={`w-10 h-10 rounded-2xl ${meta.color} flex items-center justify-center shadow-sm shrink-0`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Content Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-slate-900 truncate">
                        {sec.title || meta.defaultTitle}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {sec.section_code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5 max-w-xl">
                      {sec.description || meta.defaultDesc}
                    </p>
                  </div>
                </div>

                {/* Right Side: Reorder Arrows & Visibility Toggle */}
                <div className="flex items-center gap-3 justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Visibility Switch */}
                  <button
                    type="button"
                    onClick={() => toggleVisibility(index)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      sec.is_published
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                    }`}
                    title={sec.is_published ? "Klik untuk sembunyikan" : "Klik untuk tampilkan"}
                  >
                    {sec.is_published ? (
                      <>
                        <Eye className="w-4 h-4 text-emerald-600" />
                        <span>Tampil</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 text-slate-400" />
                        <span>Disembunyikan</span>
                      </>
                    )}
                  </button>

                  {/* Move Controls */}
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveUp(index)}
                      className={`p-2 rounded-xl transition-all ${
                        isFirst
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-700 hover:bg-white hover:text-sky-600 hover:shadow-sm cursor-pointer"
                      }`}
                      title="Geser Naik (Posisi lebih atas)"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveDown(index)}
                      className={`p-2 rounded-xl transition-all ${
                        isLast
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-700 hover:bg-white hover:text-sky-600 hover:shadow-sm cursor-pointer"
                      }`}
                      title="Geser Turun (Posisi lebih bawah)"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Save Footer Bar when changes made */}
      {hasChanges && (
        <div className="sticky bottom-6 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 sm:p-5 rounded-3xl shadow-2xl border border-white/10 flex items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-black">
              Perubahan urutan belum disimpan ke database.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSections}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-500/30"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saving ? "Menyimpan..." : "Simpan Urutan"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
