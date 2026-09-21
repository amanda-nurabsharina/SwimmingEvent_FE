"use client";

import { useEffect, useState } from "react";
import {
  saveBanner,
  deleteBanner,
  uploadImage,
  fetchAdminHeroConfig,
  saveAdminHeroConfig,
  fetchAdminHeroStats,
  saveAdminHeroStats,
  batchSaveBanners,
} from "../lib/api-admin";
import {
  Plus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Upload,
  Check,
  RefreshCw,
  FileText,
  BarChart2,
  Layers,
  X,
} from "lucide-react";

export default function BannerManager({
  banners,
  onRefresh,
}: {
  banners: any[];
  onRefresh: () => void;
}) {
  const [activeSubTab, setActiveSubTab] = useState<"kotak1" | "kotak2" | "kotak3">("kotak1");

  // -------------------------------------------------------------------------
  // KOTAK 1 STATE: Text, Features, Buttons & Badges
  // -------------------------------------------------------------------------
  const [badgeText, setBadgeText] = useState("Official PRSI Certified Swim Academy & Event Partner");
  const [titlePrefix, setTitlePrefix] = useState("Akademi Renang Profesional &");
  const [titleHighlight, setTitleHighlight] = useState("Platform Kejuaraan Terintegrasi");
  const [subtitle, setSubtitle] = useState(
    "Kurikulum renang berstandar internasional dari usia balita hingga atlet nasional, didukung sistem manajemen kompetisi renang digital modern."
  );
  const [feature1, setFeature1] = useState("Pelatih Berlisensi Resmi PRSI / FINA");
  const [feature2, setFeature2] = useState("Kolam Standar Olimpiade & Air Hangat");
  const [feature3, setFeature3] = useState("Registrasi & Bagan Lomba Online (Bebas Login)");
  const [feature4, setFeature4] = useState("Live Scoreboard & E-Sertifikat Instan");

  const [ctaPrimaryText, setCtaPrimaryText] = useState("Daftar Kejuaraan");
  const [ctaPrimaryUrl, setCtaPrimaryUrl] = useState("#register");
  const [ctaSecondaryText, setCtaSecondaryText] = useState("Lihat Bagan (Heat Sheet)");
  const [ctaSecondaryUrl, setCtaSecondaryUrl] = useState("/buku-acara");

  const [noteText, setNoteText] = useState(
    "Tamu & Penonton: Bebas melihat bagan lomba, jadwal, & pendaftaran langsung tanpa login."
  );
  const [trustText1, setTrustText1] = useState("Terdaftar & Diakui PRSI");
  const [trustText2, setTrustText2] = useState("35+ Klub Renang Bergabung");

  const [savingKotak1, setSavingKotak1] = useState(false);

  // -------------------------------------------------------------------------
  // KOTAK 2 STATE: Slider Single & Multiple Upload
  // -------------------------------------------------------------------------
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [slideTitle, setSlideTitle] = useState("");
  const [slideImageUrl, setSlideImageUrl] = useState("/banner.jpg");
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [slideStatus, setSlideStatus] = useState<string>("published");
  const [uploading, setUploading] = useState(false);
  const [uploadingSingle, setUploadingSingle] = useState(false);

  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSingle(true);
    const res = await uploadImage(file);
    if (res && res.success && res.url) {
      setSlideImageUrl(res.url);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSlideImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    setUploadingSingle(false);
  };

  // -------------------------------------------------------------------------
  // KOTAK 3 STATE: Stats Counters
  // -------------------------------------------------------------------------
  const [stats, setStats] = useState<any[]>([
    { value: "1,850+", label: "Murid Aktif" },
    { value: "45+", label: "Pelatih Berlisensi" },
    { value: "320+", label: "Medali Kejuaraan" },
    { value: "28+", label: "Kompetisi Terselenggara" },
  ]);
  const [savingKotak3, setSavingKotak3] = useState(false);

  // Quick preset HD images for Kotak 2
  const quickImages = [
    { label: "🏊 Kolam Renang Olympic", url: "https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=1600&auto=format&fit=crop" },
    { label: "⏱️ Touchpad & Start Block", url: "https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=1600&auto=format&fit=crop" },
    { label: "🥇 Medali & Perenang", url: "https://images.unsplash.com/photo-1560090995-01632a28895b?q=80&w=1600&auto=format&fit=crop" },
    { label: "🌊 Water Splash Dynamic", url: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=1600&auto=format&fit=crop" },
  ];

  // Load Hero Config & Stats from API
  const loadHeroConfigData = async () => {
    const cfgRes = await fetchAdminHeroConfig();
    if (cfgRes && cfgRes.success && cfgRes.data) {
      const d = cfgRes.data;
      if (d.badge_text) setBadgeText(d.badge_text);
      if (d.title_prefix) setTitlePrefix(d.title_prefix);
      if (d.title_highlight) setTitleHighlight(d.title_highlight);
      if (d.subtitle) setSubtitle(d.subtitle);
      if (d.feature_1) setFeature1(d.feature_1);
      if (d.feature_2) setFeature2(d.feature_2);
      if (d.feature_3) setFeature3(d.feature_3);
      if (d.feature_4) setFeature4(d.feature_4);
      if (d.cta_primary_text) setCtaPrimaryText(d.cta_primary_text);
      if (d.cta_primary_url) setCtaPrimaryUrl(d.cta_primary_url);
      if (d.cta_secondary_text) setCtaSecondaryText(d.cta_secondary_text);
      if (d.cta_secondary_url) setCtaSecondaryUrl(d.cta_secondary_url);
      if (d.note_text) setNoteText(d.note_text);
      if (d.trust_text_1) setTrustText1(d.trust_text_1);
      if (d.trust_text_2) setTrustText2(d.trust_text_2);
    }

    const statRes = await fetchAdminHeroStats();
    if (statRes && statRes.success && statRes.data && statRes.data.length > 0) {
      setStats(statRes.data);
    }
  };

  useEffect(() => {
    loadHeroConfigData();
  }, []);

  // Save Kotak 1 Handler
  const handleSaveKotak1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKotak1(true);
    const payload = {
      badge_text: badgeText,
      title_prefix: titlePrefix,
      title_highlight: titleHighlight,
      subtitle,
      feature_1: feature1,
      feature_2: feature2,
      feature_3: feature3,
      feature_4: feature4,
      cta_primary_text: ctaPrimaryText,
      cta_primary_url: ctaPrimaryUrl,
      cta_secondary_text: ctaSecondaryText,
      cta_secondary_url: ctaSecondaryUrl,
      cta_tertiary_text: "",
      cta_tertiary_url: "",
      note_text: noteText,
      trust_text_1: trustText1,
      trust_text_2: trustText2,
    };

    const res = await saveAdminHeroConfig(payload);
    setSavingKotak1(false);
    if (res.success) {
      alert("Kotak 1 (Teks & Tombol Hero) berhasil diperbarui!");
      onRefresh();
    } else {
      alert("Gagal menyimpan Kotak 1: " + (res.message || "Unknown error"));
    }
  };

  // Save Kotak 3 Handler
  const handleSaveKotak3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKotak3(true);
    const res = await saveAdminHeroStats(stats);
    setSavingKotak3(false);
    if (res.success) {
      alert("Kotak 3 (Counter Statistik) berhasil diperbarui!");
      onRefresh();
    } else {
      alert("Gagal menyimpan Kotak 3: " + (res.message || "Unknown error"));
    }
  };

  // Upload Multiple Files Handler (Kotak 2)
  const handleMultipleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newBanners: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const res = await uploadImage(file);
      let imgUrl = "";

      if (res.success && res.url) {
        imgUrl = res.url;
      } else {
        imgUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.readAsDataURL(file);
        });
      }

      if (imgUrl) {
        newBanners.push({
          id: 0,
          title: file.name.replace(/\.[^/.]+$/, ""),
          badge_text: "HERO SLIDER",
          description: "Gambar slide kejuaraan renang",
          image_url: imgUrl,
          sort_order: banners.length + i + 1,
          status: "published",
        });
      }
    }

    if (newBanners.length > 0) {
      const batchRes = await batchSaveBanners(newBanners);
      if (batchRes.success) {
        alert(`Berhasil mengunggah & menambahkan ${newBanners.length} gambar baru ke Slider Kotak 2!`);
        onRefresh();
      }
    }
    setUploading(false);
  };

  // Save Individual Banner Slide
  const handleSaveSingleBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: editingBanner ? editingBanner.id : 0,
      title: slideTitle || "Hero Slide Banner",
      badge_text: "HERO SLIDER",
      description: "Gambar slide kejuaraan renang",
      image_url: slideImageUrl,
      sort_order: Number(sortOrder),
      status: slideStatus,
    };

    const res = await saveBanner(payload);
    if (res.success) {
      setEditingBanner(null);
      setSlideTitle("");
      setSlideImageUrl("/banner.jpg");
      setSortOrder(banners.length + 1);
      onRefresh();
    } else {
      alert("Gagal menyimpan gambar slide: " + (res.message || "Unknown error"));
    }
  };

  const handleDeleteBanner = async (id: number) => {
    if (confirm("Hapus gambar slider ini?")) {
      const res = await deleteBanner(id);
      if (res.success) {
        onRefresh();
      }
    }
  };

  const handleEditSelect = (b: any) => {
    setEditingBanner(b);
    setSlideTitle(b.title || "");
    setSlideImageUrl(b.image_url || "");
    setSortOrder(b.sort_order || 1);
    setSlideStatus(b.status || "published");
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* 1. TOP SUB-NAV TABS BAR */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab("kotak1")}
          className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeSubTab === "kotak1"
              ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Kotak 1: Teks, Fitur & Tombol Hero
        </button>

        <button
          onClick={() => setActiveSubTab("kotak2")}
          className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeSubTab === "kotak2"
              ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Kotak 2: Slider Gambar ({banners.length}) & Multiple Upload
        </button>

        <button
          onClick={() => setActiveSubTab("kotak3")}
          className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeSubTab === "kotak3"
              ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Kotak 3: Counter Statistik ({stats.length})
        </button>
      </div>

      {/* 2. SUB-TAB CONTENT PANELS */}
      
      {/* TAB 1: KOTAK 1 FORM (FULL WIDTH CLEAN PANEL) */}
      {activeSubTab === "kotak1" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-5xl">
          <form onSubmit={handleSaveKotak1} className="space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" />
                Edit Konten Kotak 1 (Hero Left Side)
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Atur Judul, Subjudul, 4 Poin Fitur, 3 Tombol Aksi, dan Teks Pengenalan
              </p>
            </div>

            {/* Badge Text */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Badge Atas Header</label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="Official PRSI Certified Swim Academy & Event Partner"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
              />
            </div>

            {/* Title Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Judul Utama (Prefix)</label>
                <input
                  type="text"
                  value={titlePrefix}
                  onChange={(e) => setTitlePrefix(e.target.value)}
                  placeholder="Akademi Renang Profesional &"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Judul Highlight (Wavy/Blue)</label>
                <input
                  type="text"
                  value={titleHighlight}
                  onChange={(e) => setTitleHighlight(e.target.value)}
                  placeholder="Platform Kejuaraan Terintegrasi"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sky-700 text-xs font-black shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Subjudul / Deskripsi Singkat</label>
              <textarea
                rows={3}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Kurikulum renang berstandar internasional..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
              />
            </div>

            {/* 4 Feature Bullet Points */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                4 Poin Fitur Utama (Centang Biru):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-600">Fitur 1</span>
                  <input
                    type="text"
                    value={feature1}
                    onChange={(e) => setFeature1(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-600">Fitur 2</span>
                  <input
                    type="text"
                    value={feature2}
                    onChange={(e) => setFeature2(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-600">Fitur 3</span>
                  <input
                    type="text"
                    value={feature3}
                    onChange={(e) => setFeature3(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-600">Fitur 4</span>
                  <input
                    type="text"
                    value={feature4}
                    onChange={(e) => setFeature4(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3 Action Buttons Config */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                3 Tombol Aksi (CTA Buttons):
              </label>

              {/* Button 1 */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-sky-50/80 border border-sky-200">
                <div>
                  <label className="block text-[10px] font-bold text-sky-900">Tombol 1 (Utama Blue)</label>
                  <input
                    type="text"
                    value={ctaPrimaryText}
                    onChange={(e) => setCtaPrimaryText(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-sky-300 rounded-lg text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-sky-900">Link Target 1</label>
                  <input
                    type="text"
                    value={ctaPrimaryUrl}
                    onChange={(e) => setCtaPrimaryUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-sky-300 rounded-lg text-slate-900 text-xs font-mono font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Button 2 */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-100/70 border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-800">Tombol 2 (Bagan/Heat Sheet)</label>
                  <input
                    type="text"
                    value={ctaSecondaryText}
                    onChange={(e) => setCtaSecondaryText(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-800">Link Target 2</label>
                  <input
                    type="text"
                    value={ctaSecondaryUrl}
                    onChange={(e) => setCtaSecondaryUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Note Text & Trust Indicators */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Catatan Tambahan (Bawah Tombol)</label>
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Badge Kepercayaan 1</label>
                  <input
                    type="text"
                    value={trustText1}
                    onChange={(e) => setTrustText1(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Badge Kepercayaan 2</label>
                  <input
                    type="text"
                    value={trustText2}
                    onChange={(e) => setTrustText2(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button Kotak 1 */}
            <button
              type="submit"
              disabled={savingKotak1}
              className="w-full py-3.5 bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-700/20 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {savingKotak1 ? "Menyimpan Kotak 1..." : "Simpan Perubahan Kotak 1"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: KOTAK 2 FORM & DAFTAR SLIDE AKTIF */}
      {activeSubTab === "kotak2" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: UPLOAD & FORM (7 COLS) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="pb-3 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-sky-600" />
                  Kelola Slider Gambar (Kotak 2)
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Unggah/edit gambar slider dan atur urutan tampilan banner
                </p>
              </div>
            </div>

            {/* MULTIPLE IMAGE UPLOAD DROPZONE */}
            <div className="p-5 rounded-2xl bg-sky-50/70 border-2 border-dashed border-sky-300 text-center space-y-3">
              <Upload className="w-8 h-8 text-sky-600 mx-auto" />
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase">
                  Unggah Banyak Gambar Sekaligus (Multiple Upload)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Pilih beberapa file gambar sekaligus untuk langsung dijadikan slide banner baru
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-md transition-all">
                <Upload className="w-4 h-4" />
                <span>{uploading ? "Mengunggah Banyak Berkas..." : "📁 Pilih Beberapa Gambar Sekaligus"}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleMultipleFileUpload}
                />
              </label>
            </div>

            {/* Single Slide Form */}
            <form onSubmit={handleSaveSingleBanner} className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {editingBanner ? "Edit Slide Selected" : "Tambah Gambar Slide Manual / Single"}
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Judul / Label Slide</label>
                <input
                  type="text"
                  value={slideTitle}
                  onChange={(e) => setSlideTitle(e.target.value)}
                  placeholder="Contoh: Kolam Renang Olympic 50m"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>

              {/* FILE UPLOADER FOR SINGLE SLIDE */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Unggah File Gambar Slide *
                </label>

                <div className="p-4 rounded-2xl bg-sky-50/60 border-2 border-dashed border-sky-300 flex flex-col sm:flex-row items-center gap-4">
                  {/* Thumbnail Preview with Red X Delete Button */}
                  <div className="w-24 h-16 rounded-xl bg-slate-900 overflow-visible border border-slate-300 flex-shrink-0 flex items-center justify-center shadow-inner relative group">
                    {slideImageUrl ? (
                      <>
                        <img src={slideImageUrl} alt="Pratinjau Slide" className="w-full h-full object-cover rounded-xl" />
                        <button
                          type="button"
                          onClick={() => setSlideImageUrl("")}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-10"
                          title="Hapus / Hapus Gambar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  {/* Upload File Button */}
                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-sm transition-all">
                      <Upload className="w-4 h-4" />
                      <span>{uploadingSingle ? "Mengunggah Berkas..." : "📁 Pilih Berkas Gambar Komputer"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleSingleFileUpload}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 font-medium">Format berkas: JPG, PNG, WEBP</p>
                  </div>
                </div>
              </div>

              {/* Preset HD buttons */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Pilih Foto HD Renang Cepat:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickImages.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSlideImageUrl(q.url)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        slideImageUrl === q.url
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Urutan Slider</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Status Slide</label>
                  <select
                    value={slideStatus}
                    onChange={(e) => setSlideStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  >
                    <option value="published">Aktif (Tayang)</option>
                    <option value="draft">Draft (Sembunyikan)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editingBanner && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBanner(null);
                      setSlideTitle("");
                      setSlideImageUrl("/banner.jpg");
                    }}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl shadow-md transition-all"
                >
                  + {editingBanner ? "Update Slide Gambar" : "Tambah ke Slider Kotak 2"}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: ACTIVE BANNERS GALLERY LIST (5 COLS) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" /> Daftar Slide Aktif ({banners.length})
              </h3>
              <button onClick={onRefresh} className="text-[10px] font-bold text-sky-600 hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {banners.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium border border-dashed rounded-2xl">
                  Belum ada slide banner. Unggah gambar baru menggunakan form di sebelah kiri.
                </div>
              ) : (
                banners.map((b, idx) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 hover:bg-white transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-12 rounded-xl overflow-hidden relative flex-shrink-0 bg-slate-900 border border-slate-200 shadow-xs">
                        <img src={b.image_url || "/banner.jpg"} alt={b.title} className="w-full h-full object-cover" />
                        <span className="absolute top-0.5 left-0.5 px-1.5 py-0.5 bg-slate-900/80 text-white text-[8px] font-black rounded">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate">{b.title || `Slide ${idx + 1}`}</h4>
                        <span className="text-[10px] font-bold text-emerald-600 block">Status: {b.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleEditSelect(b)}
                        className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl border border-sky-100 transition-all"
                        title="Edit Slide"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(b.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl border border-red-100 transition-all"
                        title="Hapus Slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KOTAK 3 FORM (STATS COUNTERS) */}
      {activeSubTab === "kotak3" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-5xl">
          <form onSubmit={handleSaveKotak3} className="space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-sky-600" />
                Edit Kotak 3 (Counter Statistik)
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Atur angka pencapaian dan label pada grid bawah hero banner
              </p>
            </div>

            <div className="space-y-3">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 grid grid-cols-12 gap-3 items-center"
                >
                  <div className="col-span-1 text-center font-black text-slate-500 text-sm">#{idx + 1}</div>
                  <div className="col-span-5">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Angka / Nilai</label>
                    <input
                      type="text"
                      value={stat.value}
                      onChange={(e) => {
                        const updated = [...stats];
                        updated[idx].value = e.target.value;
                        setStats(updated);
                      }}
                      placeholder="e.g. 1,850+"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-sky-700 shadow-sm focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-6">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Keterangan / Label</label>
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => {
                        const updated = [...stats];
                        updated[idx].label = e.target.value;
                        setStats(updated);
                      }}
                      placeholder="e.g. Murid Aktif"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 shadow-sm focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={savingKotak3}
              className="w-full py-3.5 bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-700/20 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {savingKotak3 ? "Menyimpan Kotak 3..." : "Simpan Perubahan Kotak 3"}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
