"use client";

import { useState, useEffect } from "react";
import {
  fetchAdminCoaches,
  saveAdminCoach,
  deleteAdminCoach,
  fetchAdminCoachSectionConfig,
  saveAdminCoachSectionConfig,
  uploadImage,
} from "../lib/api-admin";
import {
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Save,
  Upload,
  Check,
  Award,
  Sparkles,
  ShieldCheck,
  Clock,
} from "lucide-react";

export default function CoachManager({ onRefresh }: { onRefresh: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<"coaches" | "section">("coaches");
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Section Config State
  const [badgeText, setBadgeText] = useState("TIM KEPELATIHAN PROFESIONAL");
  const [title, setTitle] = useState("Didampingi Pelatih Bersertifikasi Nasional & FINA");
  const [subtitle, setSubtitle] = useState(
    "Setiap pelatih di MASC Swim memiliki lisensi resmi, pengalaman kepelatihan bertahun-tahun, serta dedikasi tinggi dalam membimbing setiap perenang secara terukur dan aman."
  );
  const [savingSection, setSavingSection] = useState(false);

  // Coach Form State
  const [editingCoach, setEditingCoach] = useState<any | null>(null);
  const [formName, setFormName] = useState("");
  const [formRoleTitle, setFormRoleTitle] = useState("");
  const [formLicenseBadge, setFormLicenseBadge] = useState("");
  const [formExperience, setFormExperience] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formVerificationText, setFormVerificationText] = useState("Verified Coach PB PRSI");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingCoach, setSavingCoach] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const coachRes = await fetchAdminCoaches();
    if (coachRes.success && coachRes.data) {
      setCoaches(coachRes.data);
    }
    const secRes = await fetchAdminCoachSectionConfig();
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
    const res = await saveAdminCoachSectionConfig(payload);
    setSavingSection(false);
    if (res.success) {
      alert("Pengaturan Header Seksi Pelatih berhasil diperbarui!");
      onRefresh();
    } else {
      alert("Gagal menyimpan pengaturan: " + (res.message || "Error"));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const res = await uploadImage(file);
    setUploadingPhoto(false);
    if (res.success && res.url) {
      setFormPhotoUrl(res.url);
    } else {
      alert("Gagal mengunggah foto: " + (res.message || "Error"));
    }
  };

  const handleEditCoach = (coach: any) => {
    setEditingCoach(coach);
    setFormName(coach.name || "");
    setFormRoleTitle(coach.role_title || "");
    setFormLicenseBadge(coach.license_badge || "");
    setFormExperience(coach.experience || "");
    setFormDescription(coach.description || "");
    setFormVerificationText(coach.verification_text || "Verified Coach PB PRSI");
    setFormPhotoUrl(coach.photo_url || "");
    setFormSortOrder(coach.sort_order || 1);
    setFormIsActive(coach.is_active !== false);
  };

  const resetForm = () => {
    setEditingCoach(null);
    setFormName("");
    setFormRoleTitle("");
    setFormLicenseBadge("");
    setFormExperience("");
    setFormDescription("");
    setFormVerificationText("Verified Coach PB PRSI");
    setFormPhotoUrl("");
    setFormSortOrder(coaches.length + 1);
    setFormIsActive(true);
  };

  const handleSaveCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formRoleTitle) {
      alert("Nama Pelatih dan Peran / Spesialisasi wajib diisi!");
      return;
    }

    setSavingCoach(true);
    const payload = {
      id: editingCoach ? editingCoach.id : 0,
      name: formName,
      role_title: formRoleTitle,
      license_badge: formLicenseBadge,
      experience: formExperience,
      description: formDescription,
      verification_text: formVerificationText,
      photo_url: formPhotoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
      sort_order: formSortOrder,
      is_active: formIsActive,
    };

    const res = await saveAdminCoach(payload);
    setSavingCoach(false);
    if (res.success) {
      alert(`Data "${formName}" berhasil disimpan!`);
      resetForm();
      loadData();
      onRefresh();
    } else {
      alert("Gagal menyimpan data pelatih: " + (res.message || "Error"));
    }
  };

  const handleDeleteCoach = async (id: number, nameStr: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data "${nameStr}"?`)) return;
    const res = await deleteAdminCoach(id);
    if (res.success) {
      alert("Data pelatih berhasil dihapus!");
      loadData();
      onRefresh();
    } else {
      alert("Gagal menghapus data pelatih: " + (res.message || "Error"));
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Kelola Tim Kepelatihan Profesional
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Atur daftar pelatih bersertifikasi FINA & PRSI, foto, lisensi, rekam jejak, dan verifikasi
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1 self-stretch md:self-auto">
          <button
            onClick={() => setActiveSubTab("coaches")}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === "coaches"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 Form & Kartu Pelatih
          </button>
          <button
            onClick={() => setActiveSubTab("section")}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === "section"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⚙️ Header Seksi Pelatih
          </button>
        </div>
      </div>

      {activeSubTab === "coaches" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: FORM COACH (NEW / EDIT) */}
          <div className="lg:col-span-6 space-y-6">
            <form
              onSubmit={handleSaveCoach}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <Award className="w-4 h-4 text-sky-600" />
                  {editingCoach ? `Edit Pelatih #${editingCoach.id}` : "Tambah Pelatih Baru"}
                </h2>
                {editingCoach && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    + Tambah Baru
                  </button>
                )}
              </div>

              {/* Nama & Peran */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Lengkap Pelatih & Gelar *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Coach Raditya Pratama, S.Or."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Peran / Spesialisasi Utama (Warna Biru) *
                </label>
                <input
                  type="text"
                  value={formRoleTitle}
                  onChange={(e) => setFormRoleTitle(e.target.value)}
                  placeholder="e.g. Head Coach & Performance Director"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>

              {/* Lisensi Badge & Experience */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Lisensi Resmi (Overlay Foto)
                  </label>
                  <input
                    type="text"
                    value={formLicenseBadge}
                    onChange={(e) => setFormLicenseBadge(e.target.value)}
                    placeholder="e.g. FINA Level 3 & PRSI Level A"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Pengalaman & Rekam Jejak
                  </label>
                  <input
                    type="text"
                    value={formExperience}
                    onChange={(e) => setFormExperience(e.target.value)}
                    placeholder="e.g. Pengalaman: 14+ Tahun Pengalaman"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Deskripsi Singkat */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Deskripsi Rekam Jejak / Keahlian
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Berpengalaman membina atlet Kejurnas dan PON dengan spesialisasi gaya..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>

              {/* Verification Text & Sort Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Pill Verifikasi Hijau Bottom
                  </label>
                  <input
                    type="text"
                    value={formVerificationText}
                    onChange={(e) => setFormVerificationText(e.target.value)}
                    placeholder="Verified Coach PB PRSI"
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

              {/* Foto Pelatih */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Foto Headshot Pelatih
                </label>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 border overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                    {formPhotoUrl ? (
                      <img src={formPhotoUrl} alt="Foto Pelatih" className="w-full h-full object-cover" />
                    ) : (
                      <UserCheck className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-lg cursor-pointer shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-sky-600" />
                      <span>{uploadingPhoto ? "Mengunggah..." : "Upload Berkas Foto"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                    <input
                      type="text"
                      value={formPhotoUrl}
                      onChange={(e) => setFormPhotoUrl(e.target.value)}
                      placeholder="Atau tempel URL Foto HD..."
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-md text-[10px] text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editingCoach && (
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
                  disabled={savingCoach}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingCoach ? "Menyimpan..." : editingCoach ? "Simpan Perubahan Data Pelatih" : "+ Tambah ke Tim Pelatih"}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: DAFTAR KARTU PELATIH CURRENTLY IN DB */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Daftar Pelatih Terpasang ({coaches.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">Memuat data pelatih...</div>
            ) : coaches.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs font-semibold text-slate-400">
                Belum ada pelatih disetup. Gunakan form di sebelah kiri untuk menambah pelatih pertama.
              </div>
            ) : (
              <div className="space-y-3 max-h-[900px] overflow-y-auto pr-1">
                {coaches.map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl bg-white border transition-all flex items-start gap-4 shadow-sm hover:shadow-md ${
                      editingCoach?.id === c.id ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200"
                    }`}
                  >
                    {/* Photo */}
                    <div className="w-20 h-24 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-200 relative">
                      <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {c.license_badge && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold rounded-md border border-blue-200 inline-block">
                          {c.license_badge}
                        </span>
                      )}

                      <h3 className="text-sm font-black text-slate-900 truncate">{c.name}</h3>
                      <p className="text-[11px] font-extrabold text-blue-600 truncate">{c.role_title}</p>
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-2">{c.description}</p>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {c.verification_text || "Verified"}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditCoach(c)}
                            className="p-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-600 text-slate-700 rounded-lg transition-all text-xs flex items-center gap-1 font-bold"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCoach(c.id, c.name)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all text-xs"
                            title="Hapus Data Pelatih"
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

      {/* SUB-TAB 2: SECTION HEADER CONFIG */}
      {activeSubTab === "section" && (
        <form onSubmit={handleSaveSection} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 max-w-4xl">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-600" />
              Pengaturan Header Seksi Tim Kepelatihan
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Atur teks badge atas, judul seksi utama, dan deskripsi subtitle seksi pelatih
            </p>
          </div>

          <div className="space-y-4">
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
                rows={3}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSection}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 hover:from-emerald-600 hover:to-cyan-600 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {savingSection ? "Menyimpan Header..." : "Simpan Perubahan Header Seksi Pelatih"}
          </button>
        </form>
      )}
    </div>
  );
}
