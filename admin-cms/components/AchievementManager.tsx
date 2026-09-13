"use client";

import { useState, useEffect } from "react";
import {
  fetchAdminAchievements,
  saveAdminAchievement,
  deleteAdminAchievement,
  fetchAdminAchievementSectionConfig,
  saveAdminAchievementSectionConfig,
} from "../lib/api-admin";
import {
  Trophy,
  Plus,
  Trash2,
  Edit2,
  Save,
  Sparkles,
  Award,
  Medal,
  User,
} from "lucide-react";

export default function AchievementManager({ onRefresh }: { onRefresh?: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<"achievements" | "section">("achievements");
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Section Config State
  const [badgeText, setBadgeText] = useState("REKAM JEJAK PRESTASI");
  const [title, setTitle] = useState("Pencapaian Medali & Kejuaraan Resmi");
  const [subtitle, setSubtitle] = useState(
    "Komitmen kami dalam pembinaan atlet terbukti dengan raihan medali di berbagai kejuaraan renang tingkat daerah maupun nasional."
  );
  const [savingSection, setSavingSection] = useState(false);

  // Achievement Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAch, setEditingAch] = useState<any | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formYear, setFormYear] = useState("2026");
  const [formMedalType, setFormMedalType] = useState("gold");
  const [formEventName, setFormEventName] = useState("");
  const [formWinnerName, setFormWinnerName] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [savingAch, setSavingAch] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const achRes = await fetchAdminAchievements();
    if (achRes.success && achRes.data) {
      setAchievements(achRes.data);
    }
    const secRes = await fetchAdminAchievementSectionConfig();
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
    const res = await saveAdminAchievementSectionConfig(payload);
    setSavingSection(false);
    if (res.success) {
      alert("Pengaturan Seksi Prestasi Medali berhasil disimpan!");
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menyimpan: " + res.message);
    }
  };

  const openCreateModal = () => {
    setEditingAch(null);
    setFormTitle("");
    setFormYear(new Date().getFullYear().toString());
    setFormMedalType("gold");
    setFormEventName("");
    setFormWinnerName("");
    setFormSortOrder(achievements.length + 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (ach: any) => {
    setEditingAch(ach);
    setFormTitle(ach.title || "");
    setFormYear(ach.year || "2026");
    setFormMedalType(ach.medal_type || "gold");
    setFormEventName(ach.event_name || "");
    setFormWinnerName(ach.winner_name || "");
    setFormSortOrder(ach.sort_order || 1);
    setFormIsActive(ach.is_active ?? true);
    setIsModalOpen(true);
  };

  const handleSaveAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Judul prestasi wajib diisi");
      return;
    }

    setSavingAch(true);
    const payload = {
      id: editingAch ? editingAch.id : 0,
      title: formTitle,
      year: formYear,
      medal_type: formMedalType,
      event_name: formEventName,
      winner_name: formWinnerName,
      sort_order: Number(formSortOrder),
      is_active: formIsActive,
    };

    const res = await saveAdminAchievement(payload);
    setSavingAch(false);
    if (res.success) {
      setIsModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menyimpan data prestasi: " + res.message);
    }
  };

  const handleDeleteAchievement = async (id: number, achTitle: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data prestasi "${achTitle}"?`)) return;
    const res = await deleteAdminAchievement(id);
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
        Memuat data Prestasi & Medali Kejuaraan...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Kelola Prestasi & Medali Kejuaraan
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Kelola daftar kejuaraan, tahun, kategori medali, nama perenang, dan judul prestasi atlet.
            </p>
          </div>
        </div>

        {/* Sub Navigation Pills */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab("achievements")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeSubTab === "achievements"
                ? "bg-white text-amber-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Daftar Prestasi ({achievements.length})
          </button>
          <button
            onClick={() => setActiveSubTab("section")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeSubTab === "section"
                ? "bg-white text-amber-600 shadow-sm"
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
            <Sparkles className="w-4 h-4 text-amber-600" />
            Pengaturan Header Seksi Prestasi Medali
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
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="REKAM JEJAK PRESTASI"
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
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="Pencapaian Medali & Kejuaraan Resmi"
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
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                placeholder="Komitmen kami dalam pembinaan atlet terbukti..."
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSection}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all"
              >
                <Save className="w-4 h-4" />
                {savingSection ? "Menyimpan..." : "Simpan Judul Seksi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 2: ACHIEVEMENTS LIST & CRUD */}
      {activeSubTab === "achievements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600">
              Total Raihan Medali: <span className="text-amber-600">{achievements.length}</span>
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Tambah Prestasi Baru
            </button>
          </div>

          {/* ACHIEVEMENTS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {achievements.map((ach) => {
              const isGold = ach.medal_type === "gold";
              const isSilver = ach.medal_type === "silver";

              return (
                <div
                  key={ach.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header Pill & Medal Badge */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-md border border-blue-200/60">
                        {ach.year}
                      </span>
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center border shadow-xs ${
                          isGold
                            ? "bg-amber-50 text-amber-500 border-amber-200"
                            : isSilver
                            ? "bg-slate-100 text-slate-500 border-slate-300"
                            : "bg-amber-900/10 text-amber-800 border-amber-700/30"
                        }`}
                      >
                        <Award className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Achievement Title */}
                    <h4 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                      {ach.title}
                    </h4>

                    {/* Event Name */}
                    {ach.event_name && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-500 font-medium">
                        <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{ach.event_name}</span>
                      </div>
                    )}

                    {/* Winner Name */}
                    {ach.winner_name && (
                      <div className="flex items-center gap-1.5 text-[11px] text-sky-600 font-bold pt-1 border-t border-slate-100">
                        <User className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{ach.winner_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">
                      Urutan: #{ach.sort_order}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(ach)}
                        className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                        title="Edit Prestasi"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAchievement(ach.id, ach.title)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Hapus Prestasi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                {editingAch ? "Edit Prestasi Medali" : "Tambah Prestasi Medali Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAchievement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Pencapaian / Medali *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="Contoh: Juara Umum 1 Kejurnas Renang Pelajar"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tahun Kejuaraan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="2026"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Medali
                  </label>
                  <select
                    value={formMedalType}
                    onChange={(e) => setFormMedalType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="gold">Emas (Gold Medal)</option>
                    <option value="silver">Perak (Silver Medal)</option>
                    <option value="bronze">Perunggu (Bronze Medal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kejuaraan / Turnamen
                </label>
                <input
                  type="text"
                  value={formEventName}
                  onChange={(e) => setFormEventName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="Contoh: Kejurnas Antar Perkumpulan Renang 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Perenang / Tim Pemenang
                </label>
                <input
                  type="text"
                  value={formWinnerName}
                  onChange={(e) => setFormWinnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="Contoh: Rayhan Al Fatih / Tim Prestasi MASC"
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
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
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
                  disabled={savingAch}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {savingAch ? "Menyimpan..." : "Simpan Prestasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
