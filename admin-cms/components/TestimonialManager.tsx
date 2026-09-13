"use client";

import { useState, useEffect } from "react";
import {
  fetchAdminTestimonials,
  saveAdminTestimonial,
  deleteAdminTestimonial,
  fetchAdminTestimonialSectionConfig,
  saveAdminTestimonialSectionConfig,
  uploadImage,
} from "../lib/api-admin";
import {
  MessageSquareQuote,
  Plus,
  Trash2,
  Edit2,
  Save,
  Upload,
  Star,
  Sparkles,
  User,
} from "lucide-react";

export default function TestimonialManager({ onRefresh }: { onRefresh?: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<"testimonials" | "section">("testimonials");
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Section Config State
  const [badgeText, setBadgeText] = useState("KEPUASAN ORANG TUA & OFFICIAL KLUB");
  const [title, setTitle] = useState("Apa Kata Mereka Tentang MASC Swim?");
  const [subtitle, setSubtitle] = useState(
    "Pengalaman nyata orang tua murid dan pengurus klub yang merasakan manfaat kurikulum renang serta kemudahan sistem turnamen digital."
  );
  const [savingSection, setSavingSection] = useState(false);

  // Testimonial Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any | null>(null);
  const [formName, setFormName] = useState("");
  const [formRoleTitle, setFormRoleTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingTest, setSavingTest] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const testRes = await fetchAdminTestimonials();
    if (testRes.success && testRes.data) {
      setTestimonials(testRes.data);
    }
    const secRes = await fetchAdminTestimonialSectionConfig();
    if (secRes.success && secRes.data) {
      const d = secRes.data;
      if (d.badge_text) setBadgeText(d.badge_text);
      if (d.title) setTitle(d.title);
      if (d.subtitle) setSubtitle(d.subtitle);
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
    };
    const res = await saveAdminTestimonialSectionConfig(payload);
    setSavingSection(false);
    if (res.success) {
      alert("Pengaturan Seksi Testimoni berhasil disimpan!");
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menyimpan: " + res.message);
    }
  };

  const openCreateModal = () => {
    setEditingTest(null);
    setFormName("");
    setFormRoleTitle("");
    setFormContent("");
    setFormRating(5);
    setFormAvatarUrl("");
    setFormSortOrder(testimonials.length + 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingTest(t);
    setFormName(t.name || "");
    setFormRoleTitle(t.role_title || "");
    setFormContent(t.content || "");
    setFormRating(t.rating || 5);
    setFormAvatarUrl(t.avatar_url || "");
    setFormSortOrder(t.sort_order || 1);
    setFormIsActive(t.is_active ?? true);
    setIsModalOpen(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadImage(file);
      if (res.success && res.url) {
        setFormAvatarUrl(res.url);
      } else {
        alert("Gagal mengunggah foto: " + (res.message || "Unknown error"));
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mengunggah foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formContent.trim()) {
      alert("Nama dan isi ulasan wajib diisi");
      return;
    }

    setSavingTest(true);
    const payload = {
      id: editingTest ? editingTest.id : 0,
      name: formName,
      role_title: formRoleTitle,
      content: formContent,
      rating: Number(formRating),
      avatar_url: formAvatarUrl,
      sort_order: Number(formSortOrder),
      is_active: formIsActive,
    };

    const res = await saveAdminTestimonial(payload);
    setSavingTest(false);
    if (res.success) {
      setIsModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menyimpan testimoni: " + res.message);
    }
  };

  const handleDeleteTestimonial = async (id: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus testimoni dari "${name}"?`)) return;
    const res = await deleteAdminTestimonial(id);
    if (res.success) {
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menghapus: " + res.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        Memuat data Testimoni & Ulasan...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-500/10 rounded-xl text-sky-600">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Kelola Testimoni & Ulasan
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Atur ulasan orang tua murid, official klub, rating bintang 5, foto avatar, dan status pemberi testimoni.
            </p>
          </div>
        </div>

        {/* Sub Navigation Pills */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab("testimonials")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeSubTab === "testimonials"
                ? "bg-white text-sky-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Daftar Ulasan ({testimonials.length})
          </button>
          <button
            onClick={() => setActiveSubTab("section")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeSubTab === "section"
                ? "bg-white text-sky-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Judul & Subtitle Seksi
          </button>
        </div>
      </div>

      {/* SUBTAB 1: SECTION HEADER CONFIG */}
      {activeSubTab === "section" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-3xl">
          <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            Pengaturan Header Seksi Testimoni
          </h3>

          <form onSubmit={handleSaveSection} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Badge / Pill Atas (Teks Biru Kecil)
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="KEPUASAN ORANG TUA & OFFICIAL KLUB"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Judul Utama Seksi
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="Apa Kata Mereka Tentang MASC Swim?"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Subtitle / Deskripsi Seksi
              </label>
              <textarea
                rows={3}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="Pengalaman nyata orang tua murid dan pengurus klub..."
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSection}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all"
              >
                <Save className="w-4 h-4" />
                {savingSection ? "Menyimpan..." : "Simpan Judul Seksi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 2: TESTIMONIALS LIST & CRUD */}
      {activeSubTab === "testimonials" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600">
              Total Ulasan Aktif: <span className="text-sky-600">{testimonials.length}</span>
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Tambah Testimoni Baru
            </button>
          </div>

          {/* TESTIMONIALS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.rating || 5 }).map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Content Quote */}
                  <p className="text-xs text-slate-600 font-medium leading-relaxed italic line-clamp-4">
                    "{t.content}"
                  </p>

                  {/* User Profile */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                      {t.avatar_url ? (
                        <img
                          src={t.avatar_url}
                          alt={t.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-900 leading-tight">{t.name}</h5>
                      <p className="text-[11px] font-bold text-sky-600 leading-tight">
                        {t.role_title}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">
                    Urutan: #{t.sort_order}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                      title="Edit Testimoni"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTestimonial(t.id, t.name)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Hapus Testimoni"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageSquareQuote className="w-5 h-5 text-sky-600" />
                {editingTest ? "Edit Testimoni" : "Tambah Testimoni Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTestimonial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Pemberi Ulasan *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="Contoh: Bapak Hendra Wijaya"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Peran / Status / Nama Anak (Teks Biru Bawah Nama) *
                </label>
                <input
                  type="text"
                  required
                  value={formRoleTitle}
                  onChange={(e) => setFormRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="Contoh: Orang Tua Atlet (Rayhan, KU 3) / Manajer Klub"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi Kutipan Ulasan *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="Sistem pendaftaran kompetisi di MASC Swim sangat cepat dan transparan!..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rating Bintang (1 - 5)
                  </label>
                  <select
                    value={formRating}
                    onChange={(e) => setFormRating(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value={5}>5 Bintang (★★★★★)</option>
                    <option value={4}>4 Bintang (★★★★☆)</option>
                    <option value={3}>3 Bintang (★★★☆☆)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Urutan Tampil (Sort Order)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* AVATAR UPLOAD / URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Foto Avatar Pemberi Ulasan
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formAvatarUrl}
                      onChange={(e) => setFormAvatarUrl(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      placeholder="https://images.unsplash.com/..."
                    />
                    <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 border border-slate-300 transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingAvatar ? "Uploading..." : "Upload File"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingTest || uploadingAvatar}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {savingTest ? "Menyimpan..." : "Simpan Testimoni"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
