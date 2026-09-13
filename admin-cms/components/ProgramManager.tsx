"use client";

import { useState, useEffect } from "react";
import {
  fetchAdminTrainingPrograms,
  saveAdminTrainingProgram,
  deleteAdminTrainingProgram,
  fetchAdminProgramSectionConfig,
  saveAdminProgramSectionConfig,
  uploadImage,
} from "../lib/api-admin";
import {
  GraduationCap,
  Trash2,
  Edit2,
  Save,
  Upload,
  Check,
  MessageCircle,
  Sparkles,
} from "lucide-react";

export default function ProgramManager({ onRefresh }: { onRefresh: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<"programs" | "section">("programs");
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Section Config State
  const [badgeText, setBadgeText] = useState("KURIKULUM BERJENJANG & TERSTRUKTUR");
  const [title, setTitle] = useState("Program Pelatihan Renang Unggulan");
  const [subtitle, setSubtitle] = useState(
    "Dirancang secara ilmiah untuk membentuk fondasi renang yang kuat, aman, dan berorientasi prestasi untuk segala rentang usia."
  );
  const [assessmentTitle, setAssessmentTitle] = useState("Bingung Memilih Kelas yang Tepat untuk Anak Anda?");
  const [assessmentSubtitle, setAssessmentSubtitle] = useState(
    "Ikuti sesi Free Water Assessment (Uji Kemampuan Air) selama 20 menit bersama Head Coach kami untuk menentukan level penempatan yang optimal."
  );
  const [assessmentButtonText, setAssessmentButtonText] = useState("Jadwalkan Free Assessment ->");
  const [assessmentWATemplate, setAssessmentWATemplate] = useState(
    "Halo Admin, saya ingin mendaftar sesi Free Water Assessment (Uji Kemampuan Air) 20 menit untuk anak saya."
  );
  const [savingSection, setSavingSection] = useState(false);

  // Program Form State
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [formCategory, setFormCategory] = useState("Anak & Balita");
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formAgeBadge, setFormAgeBadge] = useState("");
  const [formPopularBadge, setFormPopularBadge] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFeatures, setFormFeatures] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formWATemplate, setFormWATemplate] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const progRes = await fetchAdminTrainingPrograms();
    if (progRes.success && progRes.data) {
      setPrograms(progRes.data);
    }
    const secRes = await fetchAdminProgramSectionConfig();
    if (secRes.success && secRes.data) {
      const d = secRes.data;
      if (d.badge_text) setBadgeText(d.badge_text);
      if (d.title) setTitle(d.title);
      if (d.subtitle) setSubtitle(d.subtitle);
      if (d.assessment_title) setAssessmentTitle(d.assessment_title);
      if (d.assessment_subtitle) setAssessmentSubtitle(d.assessment_subtitle);
      if (d.assessment_button_text) setAssessmentButtonText(d.assessment_button_text);
      if (d.assessment_wa_template) setAssessmentWATemplate(d.assessment_wa_template);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection(true);
    const payload = {
      badge_text: badgeText,
      title,
      subtitle,
      assessment_title: assessmentTitle,
      assessment_subtitle: assessmentSubtitle,
      assessment_button_text: assessmentButtonText,
      assessment_wa_template: assessmentWATemplate,
    };
    const res = await saveAdminProgramSectionConfig(payload);
    setSavingSection(false);
    if (res.success) {
      alert("Pengaturan Seksi Program Pelatihan berhasil diperbarui!");
      onRefresh();
    } else {
      alert("Gagal menyimpan pengaturan: " + (res.message || "Error"));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const res = await uploadImage(file);
    setUploadingImage(false);
    if (res.success && res.url) {
      setFormImageUrl(res.url);
    } else {
      alert("Gagal mengunggah foto: " + (res.message || "Error"));
    }
  };

  const handleEditProgram = (prog: any) => {
    setEditingProgram(prog);
    setFormCategory(prog.category || "Anak & Balita");
    setFormTitle(prog.title || "");
    setFormSubtitle(prog.subtitle || "");
    setFormAgeBadge(prog.age_badge || "");
    setFormPopularBadge(prog.popular_badge || "");
    setFormDescription(prog.description || "");
    setFormFeatures(prog.features || "");
    setFormPrice(prog.price || "");
    setFormImageUrl(prog.image_url || "");
    setFormWATemplate(prog.wa_template || "");
    setFormSortOrder(prog.sort_order || 1);
    setFormIsActive(prog.is_active !== false);
  };

  const resetForm = () => {
    setEditingProgram(null);
    setFormCategory("Anak & Balita");
    setFormTitle("");
    setFormSubtitle("");
    setFormAgeBadge("");
    setFormPopularBadge("");
    setFormDescription("");
    setFormFeatures("");
    setFormPrice("");
    setFormImageUrl("");
    setFormWATemplate("");
    setFormSortOrder(programs.length + 1);
    setFormIsActive(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formCategory) {
      alert("Judul program dan Kategori wajib diisi!");
      return;
    }

    setSavingProgram(true);
    const payload = {
      id: editingProgram ? editingProgram.id : 0,
      category: formCategory,
      title: formTitle,
      subtitle: formSubtitle,
      age_badge: formAgeBadge,
      popular_badge: formPopularBadge,
      description: formDescription,
      features: formFeatures,
      price: formPrice,
      image_url: formImageUrl || "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&auto=format&fit=crop&q=80",
      wa_template: formWATemplate || `Halo Admin, saya ingin mendaftar program *${formTitle}*. Mohon informasi ketersediaan slot kelas.`,
      sort_order: formSortOrder,
      is_active: formIsActive,
    };

    const res = await saveAdminTrainingProgram(payload);
    setSavingProgram(false);
    if (res.success) {
      alert(`Program "${formTitle}" berhasil disimpan!`);
      resetForm();
      loadData();
      onRefresh();
    } else {
      alert("Gagal menyimpan program: " + (res.message || "Error"));
    }
  };

  const handleDeleteProgram = async (id: number, titleStr: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus program "${titleStr}"?`)) return;
    const res = await deleteAdminTrainingProgram(id);
    if (res.success) {
      alert("Program berhasil dihapus!");
      loadData();
      onRefresh();
    } else {
      alert("Gagal menghapus program: " + (res.message || "Error"));
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Kelola Program Pelatihan Unggulan
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Atur kartu program renang, harga, deskripsi, dan template pesan WhatsApp otomatis
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1 self-stretch md:self-auto">
          <button
            onClick={() => setActiveSubTab("programs")}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === "programs"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 Daftar & Form Program
          </button>
          <button
            onClick={() => setActiveSubTab("section")}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === "section"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⚙️ Header & Banner Assessment
          </button>
        </div>
      </div>

      {activeSubTab === "programs" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: FORM PROGRAM (NEW / EDIT) */}
          <div className="lg:col-span-6 space-y-6">
            <form
              onSubmit={handleSaveProgram}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  {editingProgram ? `Edit Program #${editingProgram.id}` : "Tambah Program Baru"}
                </h2>
                {editingProgram && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    + Tambah Baru
                  </button>
                )}
              </div>

              {/* Kategori & Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kategori Program *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  >
                    <option value="Anak & Balita">Anak & Balita</option>
                    <option value="Prestasi & Squad">Prestasi & Squad</option>
                    <option value="Privat & Dewasa">Privat & Dewasa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Badge Usia / Kelas
                  </label>
                  <input
                    type="text"
                    value={formAgeBadge}
                    onChange={(e) => setFormAgeBadge(e.target.value)}
                    placeholder="e.g. 4 - 12 Thn atau KU 5 s/d KU 1"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Judul & Subtitle */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Judul Utama Program *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Kids Learn to Swim (Reguler)"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Label Subtitle Atas
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="e.g. ANAK-ANAK (4 - 12 TAHUN)"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Badge Spesial (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formPopularBadge}
                    onChange={(e) => setFormPopularBadge(e.target.value)}
                    placeholder="e.g. PALING POPULER"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Deskripsi & Harga */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Deskripsi Singkat Program
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Penjelasan singkat mengenai program pelatihan ini..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Poin Fitur (Tiap baris baru = 1 centang biru)
                </label>
                <textarea
                  rows={3}
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  placeholder="Maksimal 4 anak per kelas&#10;Evaluasi kenaikan level tiap 3 bulan&#10;Penguasaan 4 gaya kompetisi"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium shadow-sm focus:border-sky-600 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Biaya / Harga Kursus
                  </label>
                  <input
                    type="text"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. Rp 750.000 / bln"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Foto Card Program */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Foto Kartu Program
                </label>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-16 h-12 rounded-xl bg-slate-200 border overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                    {formImageUrl ? (
                      <img src={formImageUrl} alt="Program" className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-lg cursor-pointer shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-sky-600" />
                      <span>{uploadingImage ? "Mengunggah..." : "Upload Berkas Foto"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                    <input
                      type="text"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="Atau masukkan URL Foto HD..."
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-md text-[10px] text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Template WhatsApp Message */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <label className="block text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  Template Pesan WhatsApp (Otomatis saat tombol "Daftar" diklik)
                </label>
                <textarea
                  rows={2}
                  value={formWATemplate}
                  onChange={(e) => setFormWATemplate(e.target.value)}
                  placeholder="e.g. Halo Admin, saya ingin mendaftar program..."
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-emerald-600 focus:outline-none"
                />
                <p className="text-[10px] text-emerald-700 font-medium">
                  Pengguna akan langsung diarahkan ke nomor WhatsApp utama dengan isi pesan ini ketika menekan tombol "Daftar".
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                {editingProgram && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingProgram}
                  className="flex-1 py-3 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingProgram ? "Menyimpan..." : editingProgram ? "Simpan Perubahan Program" : "+ Tambah ke Daftar Program"}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: DAFTAR KARTU PROGRAM CURRENTLY IN DB */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Daftar Program Terpasang ({programs.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">Memuat data program...</div>
            ) : programs.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs font-semibold text-slate-400">
                Belum ada program pelatihan disetup. Gunakan form di sebelah kiri untuk menambah program pertama.
              </div>
            ) : (
              <div className="space-y-3 max-h-[900px] overflow-y-auto pr-1">
                {programs.map((prog) => (
                  <div
                    key={prog.id}
                    className={`p-4 rounded-2xl bg-white border transition-all flex items-start gap-4 shadow-sm hover:shadow-md ${
                      editingProgram?.id === prog.id ? "border-sky-500 ring-2 ring-sky-500/20" : "border-slate-200"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-200 relative">
                      <img src={prog.image_url} alt={prog.title} className="w-full h-full object-cover" />
                      {prog.popular_badge && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600 text-white font-black text-[8px] rounded uppercase">
                          POPULER
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-extrabold rounded-md border border-sky-200">
                          {prog.category}
                        </span>
                        {prog.age_badge && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                            {prog.age_badge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-slate-900 truncate">{prog.title}</h3>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2">{prog.description}</p>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-xs font-black text-sky-600">{prog.price}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditProgram(prog)}
                            className="p-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-600 text-slate-700 rounded-lg transition-all text-xs flex items-center gap-1 font-bold"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProgram(prog.id, prog.title)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all text-xs"
                            title="Hapus Program"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SECTION HEADER & ASSESSMENT BANNER CONFIG */}
      {activeSubTab === "section" && (
        <form onSubmit={handleSaveSection} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 max-w-4xl">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-600" />
              Pengaturan Header & Banner Assessment Seksi Program
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Atur judul seksi, subtitle, dan teks banner biru "Free Water Assessment"
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider text-sky-700">
              1. Header Seksi Utama
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Badge Atas Seksi</label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Judul Seksi Utama</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Subtitle Seksi Utama</label>
              <textarea
                rows={2}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider text-blue-700">
              2. Banner Biru Bawah (Free Water Assessment)
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Judul Banner Assessment</label>
              <input
                type="text"
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Deskripsi Banner Assessment</label>
              <textarea
                rows={2}
                value={assessmentSubtitle}
                onChange={(e) => setAssessmentSubtitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Teks Tombol Assessment</label>
                <input
                  type="text"
                  value={assessmentButtonText}
                  onChange={(e) => setAssessmentButtonText(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Template WhatsApp Assessment
                </label>
                <input
                  type="text"
                  value={assessmentWATemplate}
                  onChange={(e) => setAssessmentWATemplate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSection}
            className="w-full py-3.5 bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {savingSection ? "Menyimpan Pengaturan Seksi..." : "Simpan Perubahan Header & Banner"}
          </button>
        </form>
      )}
    </div>
  );
}
