"use client";

import React, { useState, useEffect } from "react";
import {
  Waves,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  X,
  ListOrdered,
  Sparkles,
} from "lucide-react";
import {
  getTimeTrialStrokes,
  createTimeTrialStroke,
  updateTimeTrialStroke,
  deleteTimeTrialStroke,
} from "../lib/api-admin";
import { toast } from "./Toast";

export interface TimeTrialStroke {
  id: number;
  event_code: string;
  name: string;
  distance: string;
  stroke: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function TimeTrialStrokeManager() {
  const [strokes, setStrokes] = useState<TimeTrialStroke[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStroke, setEditingStroke] = useState<TimeTrialStroke | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    event_code: "",
    name: "",
    distance: "50 METER",
    stroke: "FREESTYLE",
    sort_order: 1,
    is_active: true,
  });

  const fetchStrokes = async () => {
    setLoading(true);
    const res = await getTimeTrialStrokes();
    if (res.success) {
      setStrokes(res.data || []);
    } else {
      toast.error(res.message || "Gagal memuat master gaya renang TT");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStrokes();
  }, []);

  const openCreateModal = () => {
    setEditingStroke(null);
    const nextCode = `TT-${String(strokes.length + 1).padStart(2, "0")}`;
    setFormData({
      event_code: nextCode,
      name: "",
      distance: "50 METER",
      stroke: "FREESTYLE",
      sort_order: strokes.length + 1,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (stroke: TimeTrialStroke) => {
    setEditingStroke(stroke);
    setFormData({
      event_code: stroke.event_code || "",
      name: stroke.name || "",
      distance: stroke.distance || "50 METER",
      stroke: stroke.stroke || "FREESTYLE",
      sort_order: stroke.sort_order || 1,
      is_active: stroke.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nama nomor gaya wajib diisi!");
      return;
    }

    setFormSubmitting(true);
    let res;
    if (editingStroke) {
      res = await updateTimeTrialStroke(editingStroke.id, formData);
    } else {
      res = await createTimeTrialStroke(formData);
    }
    setFormSubmitting(false);

    if (res.success) {
      toast.success(editingStroke ? "Nomor gaya diperbarui" : "Nomor gaya berhasil ditambahkan");
      setIsModalOpen(false);
      fetchStrokes();
    } else {
      toast.error(res.message || "Gagal menyimpan data gaya");
    }
  };

  const handleDelete = async (stroke: TimeTrialStroke) => {
    if (!confirm(`Hapus nomor gaya "${stroke.name}" (${stroke.event_code})?`)) return;
    const res = await deleteTimeTrialStroke(stroke.id);
    if (res.success) {
      toast.success("Nomor gaya berhasil dihapus");
      fetchStrokes();
    } else {
      toast.error(res.message || "Gagal menghapus nomor gaya");
    }
  };

  const filteredStrokes = strokes.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.event_code.toLowerCase().includes(search.toLowerCase()) ||
      s.stroke.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
            <Waves className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Master Gaya Renang Time Trial</h1>
            <p className="text-xs font-bold text-slate-500">
              Daftar nomor gaya & jarak khusus untuk agenda pengujian kecepatan (Time Trial)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStrokes}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold text-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-600 hover:to-sky-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Tambah Nomor Gaya
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama gaya, kode, atau stroke..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* TABLE DATA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider">
                <th className="p-3.5 pl-5">KODE</th>
                <th className="p-3.5">NAMA NOMOR GAYA</th>
                <th className="p-3.5">JARAK</th>
                <th className="p-3.5">GAYA (STROKE)</th>
                <th className="p-3.5 text-center">URUTAN</th>
                <th className="p-3.5 text-center">STATUS</th>
                <th className="p-3.5 pr-5 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data master gaya...
                  </td>
                </tr>
              ) : filteredStrokes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    Belum ada master nomor gaya time trial.
                  </td>
                </tr>
              ) : (
                filteredStrokes.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 pl-5">
                      <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-lg">
                        {s.event_code}
                      </span>
                    </td>
                    <td className="p-3.5 font-black text-slate-900 uppercase">{s.name}</td>
                    <td className="p-3.5 font-bold text-slate-700">{s.distance}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                        {s.stroke}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-600">{s.sort_order}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          s.is_active
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {s.is_active ? "AKTIF" : "NON-AKTIF"}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 hover:bg-sky-50 text-sky-600 hover:text-sky-700 rounded-lg transition"
                          title="Edit Nomor Gaya"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition"
                          title="Hapus Nomor Gaya"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM TAMBAH / EDIT GAYA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-500/20">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingStroke ? "Edit Nomor Gaya Time Trial" : "Tambah Nomor Gaya Time Trial"}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    Definisikan gaya, jarak, dan kode lomba time trial
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-black text-slate-700 mb-1">KODE ACARA</label>
                  <input
                    type="text"
                    value={formData.event_code}
                    onChange={(e) => setFormData({ ...formData, event_code: e.target.value })}
                    placeholder="TT-01"
                    required
                    className="w-full px-3 py-2 font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-700 mb-1">URUTAN TAMPIL</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1">
                  NAMA NOMOR GAYA <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 50 METER GAYA BEBAS"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 font-black text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-black text-slate-700 mb-1">JARAK</label>
                  <select
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                    className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  >
                    <option value="25 METER">25 METER</option>
                    <option value="50 METER">50 METER</option>
                    <option value="100 METER">100 METER</option>
                    <option value="200 METER">200 METER</option>
                    <option value="400 METER">400 METER</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black text-slate-700 mb-1">GAYA (STROKE)</label>
                  <select
                    value={formData.stroke}
                    onChange={(e) => setFormData({ ...formData, stroke: e.target.value })}
                    className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  >
                    <option value="FREESTYLE">FREESTYLE (Bebas)</option>
                    <option value="BREASTSTROKE">BREASTSTROKE (Dada)</option>
                    <option value="BACKSTROKE">BACKSTROKE (Punggung)</option>
                    <option value="BUTTERFLY">BUTTERFLY (Kupu-kupu)</option>
                    <option value="INDIVIDUAL_MEDLEY">INDIVIDUAL MEDLEY (Ganti)</option>
                    <option value="KICKING_BOARD">KICKING BOARD (Papan)</option>
                    <option value="FREESTYLE_FIN">FREESTYLE FIN</option>
                    <option value="BUTTERFLY_FIN">BUTTERFLY FIN</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="is_active" className="font-bold text-slate-700 cursor-pointer">
                  Aktifkan nomor gaya ini untuk sesi Time Trial
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-600 hover:to-sky-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 transition disabled:opacity-50"
                >
                  {formSubmitting ? "Menyimpan..." : editingStroke ? "Simpan Perubahan" : "Tambah Nomor Gaya"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
