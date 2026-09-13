"use client";

import { useState, useEffect } from "react";
import {
  fetchAdminFacilities,
  saveAdminFacility,
  deleteAdminFacility,
  fetchAdminFacilitySectionConfig,
  saveAdminFacilitySectionConfig,
  uploadImage,
} from "../lib/api-admin";
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Save,
  Upload,
  Check,
  Sparkles,
  Layers,
  CheckCircle,
  Eye,
} from "lucide-react";

export default function FacilityManager({ onRefresh }: { onRefresh?: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<"facilities" | "section">("facilities");
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Section Config State
  const [badgeText, setBadgeText] = useState("FASILITAS & STANDAR KOLAM");
  const [title, setTitle] = useState("Infrastruktur Kolam Renang Standar Internasional");
  const [subtitle, setSubtitle] = useState(
    "Lingkungan latihan yang higienis, aman, dan dirancang khusus untuk kenyamanan murid dari usia balita hingga atlet profesional."
  );
  const [savingSection, setSavingSection] = useState(false);

  // Facility Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<any | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formTagText, setFormTagText] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSpecsText, setFormSpecsText] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingFacility, setSavingFacility] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const facRes = await fetchAdminFacilities();
    if (facRes.success && facRes.data) {
      setFacilities(facRes.data);
    }
    const secRes = await fetchAdminFacilitySectionConfig();
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
    const res = await saveAdminFacilitySectionConfig(payload);
    setSavingSection(false);
    if (res.success) {
      alert("Pengaturan Seksi Fasilitas berhasil disimpan!");
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menyimpan: " + res.message);
    }
  };

  const openCreateModal = () => {
    setEditingFacility(null);
    setFormTitle("");
    setFormTagText("");
    setFormDescription("");
    setFormSpecsText("");
    setFormImageUrl("");
    setFormSortOrder(facilities.length + 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (fac: any) => {
    setEditingFacility(fac);
    setFormTitle(fac.title || "");
    setFormTagText(fac.tag_text || "");
    setFormDescription(fac.description || "");
    setFormSpecsText(fac.specs_text || "");
    setFormImageUrl(fac.image_url || "");
    setFormSortOrder(fac.sort_order || 1);
    setFormIsActive(fac.is_active ?? true);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadImage(file);
      if (res.success && res.url) {
        setFormImageUrl(res.url);
      } else {
        alert("Gagal mengunggah foto: " + (res.message || "Unknown error"));
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mengunggah foto");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Nama fasilitas wajib diisi");
      return;
    }

    setSavingFacility(true);
    const payload = {
      id: editingFacility ? editingFacility.id : 0,
      title: formTitle,
      tag_text: formTagText,
      description: formDescription,
      specs_text: formSpecsText,
      image_url: formImageUrl,
      sort_order: Number(formSortOrder),
      is_active: formIsActive,
    };

    const res = await saveAdminFacility(payload);
    setSavingFacility(false);
    if (res.success) {
      setIsModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menyimpan data fasilitas: " + res.message);
    }
  };

  const handleDeleteFacility = async (id: number, facTitle: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus fasilitas "${facTitle}"?`)) return;
    const res = await deleteAdminFacility(id);
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
        Memuat data Fasilitas & Standar Kolam...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-500/10 rounded-xl text-sky-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Kelola Infrastruktur & Fasilitas Kolam
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Atur judul seksi, foto arena kolam, tag ukuran, deskripsi, dan spesifikasi fasilitas di Landing Page.
            </p>
          </div>
        </div>

        {/* Sub Navigation Pills */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab("facilities")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeSubTab === "facilities"
                ? "bg-white text-sky-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Daftar Fasilitas ({facilities.length})
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
            Pengaturan Header Seksi Fasilitas
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
                placeholder="FASILITAS & STANDAR KOLAM"
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
                placeholder="Infrastruktur Kolam Renang Standar Internasional"
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
                placeholder="Lingkungan latihan yang higienis, aman, dan dirancang khusus..."
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

      {/* SUBTAB 2: FACILITIES LIST & CRUD */}
      {activeSubTab === "facilities" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600">
              Total Fasilitas Aktif: <span className="text-sky-600">{facilities.length}</span>
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Tambah Fasilitas Baru
            </button>
          </div>

          {/* FACILITY CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {facilities.map((fac) => (
              <div
                key={fac.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Image Container with Floating Tag */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    {fac.image_url ? (
                      <img
                        src={fac.image_url}
                        alt={fac.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Building2 className="w-10 h-10" />
                      </div>
                    )}
                    {fac.tag_text && (
                      <span className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-md text-sky-700 text-[10px] font-black rounded-full shadow-sm">
                        {fac.tag_text}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <h4 className="text-sm font-black text-slate-900 line-clamp-1">{fac.title}</h4>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3">
                      {fac.description}
                    </p>

                    {/* Bottom Specs Badge Pill */}
                    {fac.specs_text && (
                      <div className="flex items-center gap-2 p-2 bg-sky-50 rounded-xl text-sky-800 text-[11px] font-bold border border-sky-100">
                        <CheckCircle className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                        <span className="truncate">{fac.specs_text}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">
                    Urutan: #{fac.sort_order}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(fac)}
                      className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-all"
                      title="Edit Fasilitas"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFacility(fac.id, fac.title)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                      title="Hapus Fasilitas"
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

      {/* FORM MODAL FOR CREATE / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-600" />
                {editingFacility ? "Edit Fasilitas" : "Tambah Fasilitas Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFacility} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Fasilitas *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="Contoh: Olympic Competition Pool (50m)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tag Melayang Foto (Sudut Kanan Atas)
                  </label>
                  <input
                    type="text"
                    value={formTagText}
                    onChange={(e) => setFormTagText(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="Contoh: 50m x 25m"
                  />
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Spesifikasi Ringkas (Teks Pill Bawah dengan Centang)
                </label>
                <input
                  type="text"
                  value={formSpecsText}
                  onChange={(e) => setFormSpecsText(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="Contoh: 50m x 25m | 8 Lintasan | Kedalaman 2.0m"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Lengkap Fasilitas
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="Kolam standar FINA 50 meter dengan 8 lintasan, depth 2.0m..."
                />
              </div>

              {/* IMAGE UPLOAD / URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Foto Arena Fasilitas
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      placeholder="https://images.unsplash.com/..."
                    />
                    <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 border border-slate-300 transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingImage ? "Uploading..." : "Upload File"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  {formImageUrl && (
                    <div className="mt-1 h-32 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-50">
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
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
                  disabled={savingFacility || uploadingImage}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {savingFacility ? "Menyimpan..." : "Simpan Fasilitas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
