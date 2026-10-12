"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Waves,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  X,
  UserPlus,
  Layers,
  ArrowRight,
  Shield,
  Activity,
} from "lucide-react";
import {
  getTimeTrialSessions,
  createTimeTrialSession,
  updateTimeTrialSession,
  deleteTimeTrialSession,
  getTimeTrialStrokes,
  getClubMembers,
  getTimeTrialEntries,
  createTimeTrialEntry,
  deleteTimeTrialEntry,
} from "../lib/api-admin";
import { toast } from "./Toast";

export interface TimeTrialSession {
  id: number;
  title: string;
  date: string;
  location: string;
  pool_length: string;
  max_lanes: number;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export default function TimeTrialSessionManager({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: string, sessionId?: number, strokeId?: number) => void;
}) {
  const [sessions, setSessions] = useState<TimeTrialSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(0);
  const [strokes, setStrokes] = useState<any[]>([]);
  const [selectedStrokeId, setSelectedStrokeId] = useState<number>(0);
  const [members, setMembers] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingEntries, setLoadingEntries] = useState<boolean>(false);

  // Sesi Form Modal
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<TimeTrialSession | null>(null);
  const [sessionFormData, setSessionFormData] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    location: "Kolam Renang MASC Swim Club",
    pool_length: "25M",
    max_lanes: 6,
    status: "in_progress",
    notes: "",
  });

  // Assign Member Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [assignFormData, setAssignFormData] = useState({
    member_id: 0,
    stroke_id: 0,
    seed_time: "99.99.99",
  });
  const [assignSubmitting, setAssignSubmitting] = useState<boolean>(false);

  // Search in entries table
  const [entrySearch, setEntrySearch] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    const [sessRes, strokeRes, memRes] = await Promise.all([
      getTimeTrialSessions(),
      getTimeTrialStrokes(),
      getClubMembers({ status: "active" }),
    ]);

    if (sessRes.success) {
      const sessList = sessRes.data || [];
      setSessions(sessList);
      if (sessList.length > 0 && selectedSessionId === 0) {
        setSelectedSessionId(sessList[0].id);
      }
    }
    if (strokeRes.success) {
      const activeStrokes = (strokeRes.data || []).filter((s: any) => s.is_active);
      setStrokes(activeStrokes);
      if (activeStrokes.length > 0 && selectedStrokeId === 0) {
        setSelectedStrokeId(activeStrokes[0].id);
      }
    }
    if (memRes.success) {
      setMembers(memRes.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchEntries = async () => {
    if (selectedSessionId === 0) return;
    setLoadingEntries(true);
    const res = await getTimeTrialEntries(selectedSessionId, selectedStrokeId > 0 ? selectedStrokeId : undefined);
    if (res.success) {
      setEntries(res.data || []);
    } else {
      setEntries([]);
    }
    setLoadingEntries(false);
  };

  useEffect(() => {
    if (selectedSessionId > 0) {
      fetchEntries();
    }
  }, [selectedSessionId, selectedStrokeId]);

  // Session Handlers
  const openCreateSessionModal = () => {
    setEditingSession(null);
    setSessionFormData({
      title: "",
      date: new Date().toISOString().split("T")[0],
      location: "Kolam Renang MASC Swim Club",
      pool_length: "25M",
      max_lanes: 6,
      status: "in_progress",
      notes: "",
    });
    setIsSessionModalOpen(true);
  };

  const openEditSessionModal = (s: TimeTrialSession) => {
    setEditingSession(s);
    setSessionFormData({
      title: s.title,
      date: s.date,
      location: s.location,
      pool_length: s.pool_length || "25M",
      max_lanes: s.max_lanes || 6,
      status: s.status || "in_progress",
      notes: s.notes || "",
    });
    setIsSessionModalOpen(true);
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionFormData.title.trim()) {
      toast.error("Judul sesi wajib diisi");
      return;
    }
    let res;
    if (editingSession) {
      res = await updateTimeTrialSession(editingSession.id, sessionFormData);
    } else {
      res = await createTimeTrialSession(sessionFormData);
    }
    if (res.success) {
      toast.success(editingSession ? "Sesi time trial diperbarui" : "Sesi time trial baru dibuat");
      setIsSessionModalOpen(false);
      fetchData();
    } else {
      toast.error(res.message || "Gagal menyimpan sesi");
    }
  };

  const handleDeleteSession = async (s: TimeTrialSession) => {
    if (!confirm(`Hapus sesi "${s.title}" beserta seluruh data pendaftaran & heat di dalamnya?`)) return;
    const res = await deleteTimeTrialSession(s.id);
    if (res.success) {
      toast.success("Sesi time trial berhasil dihapus");
      setSelectedSessionId(0);
      fetchData();
    } else {
      toast.error(res.message || "Gagal menghapus sesi");
    }
  };

  // Assign Member Handlers
  const openAssignModal = () => {
    if (selectedSessionId === 0) {
      toast.error("Pilih atau buat sesi time trial terlebih dahulu");
      return;
    }
    setAssignFormData({
      member_id: members.length > 0 ? members[0].id : 0,
      stroke_id: selectedStrokeId > 0 ? selectedStrokeId : strokes[0]?.id || 0,
      seed_time: "99.99.99",
    });
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignFormData.member_id === 0 || assignFormData.stroke_id === 0) {
      toast.error("Pilih anggota dan nomor gaya renang!");
      return;
    }
    setAssignSubmitting(true);
    const res = await createTimeTrialEntry({
      session_id: selectedSessionId,
      member_id: assignFormData.member_id,
      stroke_id: assignFormData.stroke_id,
      seed_time: assignFormData.seed_time || "99.99.99",
    });
    setAssignSubmitting(false);

    if (res.success) {
      toast.success("Anggota berhasil didaftarkan ke nomor gaya");
      setIsAssignModalOpen(false);
      fetchEntries();
    } else {
      toast.error(res.message || "Gagal mendaftarkan anggota");
    }
  };

  const handleDeleteEntry = async (entry: any) => {
    if (!confirm(`Batalkan pendaftaran ${entry.member?.full_name} untuk ${entry.stroke?.name}?`)) return;
    const res = await deleteTimeTrialEntry(entry.id);
    if (res.success) {
      toast.success("Pendaftaran berhasil dibatalkan");
      fetchEntries();
    } else {
      toast.error(res.message || "Gagal membatalkan pendaftaran");
    }
  };

  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  const filteredEntries = entries.filter((e) => {
    const nameMatch = e.member?.full_name?.toLowerCase().includes(entrySearch.toLowerCase());
    const numMatch = e.member?.member_number?.toLowerCase().includes(entrySearch.toLowerCase());
    return nameMatch || numMatch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md shadow-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sesi Time Trial & Pendaftaran Atlet</h1>
            <p className="text-xs font-bold text-slate-500">
              Kelola agenda uji kecepatan dan daftarkan anggota MASC ke nomor gaya yang ingin diuji
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchData();
              fetchEntries();
            }}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold text-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={openCreateSessionModal}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Buat Sesi Baru
          </button>
        </div>
      </div>

      {/* SESSION SELECTOR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sessions.map((sess) => {
          const isSelected = sess.id === selectedSessionId;
          return (
            <div
              key={sess.id}
              onClick={() => setSelectedSessionId(sess.id)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                isSelected
                  ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white border-transparent shadow-lg shadow-orange-500/20"
                  : "bg-white text-slate-800 border-slate-200/80 hover:border-amber-300 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mb-1.5 ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : sess.status === "in_progress"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {sess.status === "in_progress" ? "AKTIF" : sess.status === "completed" ? "SELESAI" : "DRAFT"}
                  </span>
                  <h3 className="font-black text-sm uppercase tracking-tight">{sess.title}</h3>
                  <p className={`text-xs mt-1 font-bold ${isSelected ? "text-amber-100" : "text-slate-500"}`}>
                    Tanggal: {sess.date}
                  </p>
                  <p className={`text-[11px] font-medium mt-0.5 ${isSelected ? "text-amber-100" : "text-slate-400"}`}>
                    {sess.location} • Kolam {sess.pool_length} ({sess.max_lanes} Lintasan)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditSessionModal(sess);
                  }}
                  className={`p-1.5 rounded-lg transition ${
                    isSelected ? "hover:bg-white/20 text-white" : "hover:bg-slate-100 text-slate-600"
                  }`}
                  title="Edit Sesi"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(sess);
                  }}
                  className={`p-1.5 rounded-lg transition ${
                    isSelected ? "hover:bg-white/20 text-white" : "hover:bg-rose-50 text-rose-500"
                  }`}
                  title="Hapus Sesi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED SESSION VIEW & PARTICIPANTS TABLE */}
      {selectedSessionId > 0 && currentSession && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  SESI #{currentSession.id}
                </span>
                <h2 className="text-xl font-black text-slate-900">{currentSession.title}</h2>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Total Atlet Terdaftar: <span className="text-amber-700 font-black">{entries.length} Atlet</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={openAssignModal}
                className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-500/20 flex items-center gap-2 transition"
              >
                <UserPlus className="w-4 h-4 stroke-[3]" />
                Assign Anggota ke Gaya Renang
              </button>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab("tt-buku-acara", selectedSessionId, selectedStrokeId)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition"
                >
                  <Layers className="w-4 h-4" />
                  Buka Buku Acara Heat
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* FILTER BY STROKE TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <button
              onClick={() => setSelectedStrokeId(0)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedStrokeId === 0
                  ? "bg-slate-900 text-white shadow"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Semua Nomor Gaya ({entries.length})
            </button>
            {strokes.map((st) => {
              const count = entries.filter((e) => e.stroke_id === st.id).length;
              const isSelected = selectedStrokeId === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStrokeId(st.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                    isSelected
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <span>{st.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected ? "bg-white text-amber-600" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* SEARCH IN TABLE */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari atlet di sesi ini..."
              value={entrySearch}
              onChange={(e) => setEntrySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          {/* TABLE OF ASSIGNED MEMBERS */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase">
                  <th className="p-3 pl-4">NO. ANGGOTA</th>
                  <th className="p-3">NAMA ATLET</th>
                  <th className="p-3">GENDER</th>
                  <th className="p-3">NOMOR GAYA DIIKUTI</th>
                  <th className="p-3 text-center">TIME SEED</th>
                  <th className="p-3 pr-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {loadingEntries ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                      Memuat data peserta sesi...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      Belum ada atlet yang di-assign ke nomor gaya pada sesi ini. Klik "Assign Anggota ke Gaya Renang" di atas!
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="p-3 pl-4 font-mono font-black text-sky-700 bg-sky-50/50">
                        {e.member?.member_number}
                      </td>
                      <td className="p-3 font-black text-slate-900 uppercase">{e.member?.full_name}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            e.member?.gender === "PUTRA" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                          }`}
                        >
                          {e.member?.gender}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-amber-800">{e.stroke?.name}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-600">{e.seed_time || "NT"}</td>
                      <td className="p-3 pr-4 text-center">
                        <button
                          onClick={() => handleDeleteEntry(e)}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                          title="Batalkan Pendaftaran"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL BUAT / EDIT SESI */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingSession ? "Edit Sesi Time Trial" : "Buat Sesi Time Trial Baru"}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    Agenda uji kecepatan internal anggota MASC
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSessionModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSessionSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-black text-slate-700 mb-1">
                  JUDUL SESI TIME TRIAL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Time Trial Internal Triwulan I 2026"
                  value={sessionFormData.title}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 font-black text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-black text-slate-700 mb-1">TANGGAL PELAKSANAAN</label>
                  <input
                    type="date"
                    value={sessionFormData.date}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-700 mb-1">STATUS</label>
                  <select
                    value={sessionFormData.status}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, status: e.target.value })}
                    className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  >
                    <option value="in_progress">BERJALAN / AKTIF</option>
                    <option value="completed">SELESAI</option>
                    <option value="draft">DRAFT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1">LOKASI KOLAM</label>
                <input
                  type="text"
                  placeholder="Nama kolam renang lokasi tes"
                  value={sessionFormData.location}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, location: e.target.value })}
                  className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-black text-slate-700 mb-1">PANJANG KOLAM</label>
                  <select
                    value={sessionFormData.pool_length}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, pool_length: e.target.value })}
                    className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  >
                    <option value="25M">25 METER (Short Course)</option>
                    <option value="50M">50 METER (Olympic Long Course)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black text-slate-700 mb-1">JUMLAH LINTASAN</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={sessionFormData.max_lanes}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, max_lanes: parseInt(e.target.value) || 6 })}
                    className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-md shadow-amber-500/20 transition"
                >
                  {editingSession ? "Simpan Perubahan" : "Buat Sesi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASSIGN ANGGOTA */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500 text-white rounded-xl shadow-md shadow-sky-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Assign Anggota Club ke Nomor Gaya</h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    Pilih perenang MASC dan nomor lomba untuk pengujian speed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-black text-slate-700 mb-1">
                  PILIH ANGGOTA KLUB <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignFormData.member_id}
                  onChange={(e) => setAssignFormData({ ...assignFormData, member_id: parseInt(e.target.value) || 0 })}
                  required
                  className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                >
                  <option value={0}>-- Pilih Anggota MASC --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.member_number}] {m.full_name} ({m.gender})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1">
                  NOMOR GAYA RENANG <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignFormData.stroke_id}
                  onChange={(e) => setAssignFormData({ ...assignFormData, stroke_id: parseInt(e.target.value) || 0 })}
                  required
                  className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                >
                  <option value={0}>-- Pilih Nomor Gaya TT --</option>
                  {strokes.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.event_code}] {s.name} ({s.distance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1">
                  SEED TIME ACUAN (OPSIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 00.32.50 atau NT"
                  value={assignFormData.seed_time}
                  onChange={(e) => setAssignFormData({ ...assignFormData, seed_time: e.target.value })}
                  className="w-full px-3 py-2 font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Gunakan format mm.ss.ms atau biarkan 99.99.99 (NT) jika belum memiliki catatan waktu acuan
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-md shadow-sky-500/20 transition disabled:opacity-50"
                >
                  {assignSubmitting ? "Mendaftarkan..." : "Daftarkan ke Sesi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
