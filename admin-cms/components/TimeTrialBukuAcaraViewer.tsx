"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Layers,
  Plus,
  Trash2,
  Printer,
  RefreshCw,
  Users,
  CheckCircle2,
  X,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";
import {
  getTimeTrialSessions,
  getTimeTrialStrokes,
  getTimeTrialEntries,
  getTimeTrialHeats,
  createTimeTrialHeat,
  deleteTimeTrialHeat,
  updateTimeTrialLane,
} from "../lib/api-admin";
import { toast } from "./Toast";

export default function TimeTrialBukuAcaraViewer({
  initialSessionId,
  initialStrokeId,
  onNavigateTab,
}: {
  initialSessionId?: number;
  initialStrokeId?: number;
  onNavigateTab?: (tab: string, sessionId?: number, strokeId?: number) => void;
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(initialSessionId || 0);
  const [strokes, setStrokes] = useState<any[]>([]);
  const [selectedStrokeId, setSelectedStrokeId] = useState<number>(initialStrokeId || 0);

  const [heats, setHeats] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingHeats, setLoadingHeats] = useState<boolean>(false);

  // New Heat Modal
  const [isAddHeatModalOpen, setIsAddHeatModalOpen] = useState<boolean>(false);
  const [heatNumberInput, setHeatNumberInput] = useState<number>(1);
  const [heatNotesInput, setHeatNotesInput] = useState<string>("");

  const fetchInitialData = async () => {
    setLoading(true);
    const [sessRes, strokeRes] = await Promise.all([
      getTimeTrialSessions(),
      getTimeTrialStrokes(),
    ]);

    if (sessRes.success) {
      const sessList = sessRes.data || [];
      setSessions(sessList);
      if (sessList.length > 0 && selectedSessionId === 0) {
        setSelectedSessionId(sessList[0].id);
      }
    }
    if (strokeRes.success) {
      const strokeList = (strokeRes.data || []).filter((s: any) => s.is_active);
      setStrokes(strokeList);
      if (strokeList.length > 0 && selectedStrokeId === 0) {
        setSelectedStrokeId(strokeList[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchHeatsAndEntries = async () => {
    if (selectedSessionId === 0 || selectedStrokeId === 0) return;
    setLoadingHeats(true);
    const [heatRes, entryRes] = await Promise.all([
      getTimeTrialHeats(selectedSessionId, selectedStrokeId),
      getTimeTrialEntries(selectedSessionId, selectedStrokeId),
    ]);

    if (heatRes.success) {
      setHeats(heatRes.data || []);
      setHeatNumberInput((heatRes.data || []).length + 1);
    } else {
      setHeats([]);
    }

    if (entryRes.success) {
      setEntries(entryRes.data || []);
    } else {
      setEntries([]);
    }
    setLoadingHeats(false);
  };

  useEffect(() => {
    if (selectedSessionId > 0 && selectedStrokeId > 0) {
      fetchHeatsAndEntries();
    }
  }, [selectedSessionId, selectedStrokeId]);

  const currentSession = sessions.find((s) => s.id === selectedSessionId);
  const currentStroke = strokes.find((s) => s.id === selectedStrokeId);

  // Create Heat Manual Handler
  const handleCreateHeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSessionId === 0 || selectedStrokeId === 0) {
      toast.error("Pilih sesi dan nomor gaya renang terlebih dahulu");
      return;
    }

    const maxLanes = currentSession?.max_lanes || 6;
    const res = await createTimeTrialHeat({
      session_id: selectedSessionId,
      stroke_id: selectedStrokeId,
      heat_number: heatNumberInput,
      notes: heatNotesInput,
      max_lanes: maxLanes,
    });

    if (res.success) {
      toast.success(`Heat ${heatNumberInput} berhasil dibuat dengan ${maxLanes} lintasan`);
      setIsAddHeatModalOpen(false);
      setHeatNotesInput("");
      fetchHeatsAndEntries();
    } else {
      toast.error(res.message || "Gagal membuat Heat");
    }
  };

  // Delete Heat Handler
  const handleDeleteHeat = async (heatId: number, heatNum: number) => {
    if (!confirm(`Hapus Heat ${heatNum} beserta susunan lintasannya?`)) return;
    const res = await deleteTimeTrialHeat(heatId);
    if (res.success) {
      toast.success(`Heat ${heatNum} berhasil dihapus`);
      fetchHeatsAndEntries();
    } else {
      toast.error(res.message || "Gagal menghapus heat");
    }
  };

  // Assign Swimmer to Lane
  const handleAssignToLane = async (laneId: number, entryIdVal: string) => {
    const entryId = parseInt(entryIdVal) || 0;
    if (entryId === 0) {
      // Clear lane
      const res = await updateTimeTrialLane(laneId, { member_id: 0, entry_id: 0 });
      if (res.success) {
        toast.success("Lintasan dikosongkan");
        fetchHeatsAndEntries();
      }
      return;
    }

    const selectedEntry = entries.find((e) => e.id === entryId);
    if (!selectedEntry) return;

    const res = await updateTimeTrialLane(laneId, {
      member_id: selectedEntry.member_id,
      entry_id: selectedEntry.id,
    });

    if (res.success) {
      toast.success(`Atlet ${selectedEntry.member?.full_name} ditempatkan di lintasan`);
      fetchHeatsAndEntries();
    } else {
      toast.error(res.message || "Gagal menempatkan atlet ke lintasan");
    }
  };

  // Set of member IDs already assigned in any heat of this stroke
  const assignedMemberIds = new Set<number>();
  heats.forEach((h) => {
    (h.lanes || []).forEach((l: any) => {
      if (l.member_id) assignedMemberIds.add(l.member_id);
    });
  });

  return (
    <div className="space-y-6">
      {/* DYNAMIC PRINT STYLE INJECTION */}
      <style jsx global>{`
        @media print {
          @page {
            size: a4 portrait;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          aside, nav, header {
            display: none !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* PRINTABLE OFFICIAL PDF HEADER (VISIBLE ON PRINT ONLY) */}
      <div className="hidden print:block mb-6 border-b-2 border-black pb-4 text-center">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1 border-b border-slate-300 pb-1">
          <span>AKUATIK INDONESIA / MASC SWIM CLUB</span>
          <span className="font-mono font-black text-slate-900 uppercase">
            BUKU ACARA TIME TRIAL
          </span>
        </div>
        <h1 className="text-xl font-black uppercase tracking-wider text-black">
          SUSUNAN SERI (HEAT) & LINTASAN
        </h1>
        <h2 className="text-base font-black uppercase mt-0.5 text-black">
          {currentStroke ? `[${currentStroke.event_code}] ${currentStroke.name} (${currentStroke.distance})` : "TIME TRIAL"}
        </h2>
        <p className="text-xs font-bold uppercase text-slate-700 mt-1">
          {currentSession?.title} • {currentSession?.location} • 📅 {currentStroke?.schedule_date || currentSession?.date || "2026-03-28"} • ⏰ {currentStroke?.schedule_time || "08:00 WIB"}
        </p>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-md shadow-purple-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Buku Acara Time Trial (Manual Heat Builder)
            </h1>
            <p className="text-xs font-bold text-slate-500">
              Buat seri (Heat) dan atur lintasan atlet secara dinamis & manual tanpa batasan gender atau KU
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            Cetak Susunan Heat
          </button>
          <button
            onClick={() => setIsAddHeatModalOpen(true)}
            disabled={selectedSessionId === 0 || selectedStrokeId === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-500/20 flex items-center gap-2 transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Tambah Heat Manual
          </button>
        </div>
      </div>

      {/* SESSION & STROKE SELECTORS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <div>
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
            PILIH SESI TIME TRIAL
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(parseInt(e.target.value) || 0)}
            className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.date} - Kolam {s.pool_length})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
            PILIH NOMOR GAYA RENANG
          </label>
          <select
            value={selectedStrokeId}
            onChange={(e) => setSelectedStrokeId(parseInt(e.target.value) || 0)}
            className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
          >
            {strokes.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.event_code}] {s.name} ({s.distance})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* QUICK INFO BANNER */}
      {currentSession && currentStroke && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/70 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                {currentStroke.event_code}
              </span>
              <h2 className="text-base font-black text-slate-900 uppercase">{currentStroke.name}</h2>
              <span className="text-xs font-bold text-slate-500">({currentStroke.distance})</span>
            </div>
            <p className="text-xs text-purple-900 font-bold mt-1 flex items-center gap-2 flex-wrap">
              <span>{currentSession.title} • Lokasi: {currentSession.location} • Max {currentSession.max_lanes} Lintasan</span>
              <span className="text-[11px] font-black text-sky-700 bg-white/80 px-2 py-0.5 rounded-md border border-sky-200 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-600" />
                {currentStroke.schedule_date || currentSession.date || "2026-03-28"}
              </span>
              <span className="text-[11px] font-black text-amber-700 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                {currentStroke.schedule_time || "08:00 WIB"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] font-bold text-slate-500">Status Atlet Terdaftar:</p>
              <p className="text-xs font-black text-slate-800">
                <span className="text-emerald-600">{assignedMemberIds.size}</span> dari {entries.length} atlet sudah masuk Heat
              </p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("tt-results", selectedSessionId, selectedStrokeId)}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition"
              >
                <Zap className="w-4 h-4" />
                Catat Speed Heat Ini
              </button>
            )}
          </div>
        </div>
      )}

      {/* HEATS BUILDER CARDS */}
      {loadingHeats ? (
        <div className="p-12 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
          Memuat susunan heat time trial...
        </div>
      ) : heats.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-black text-slate-800 text-base">Belum Ada Heat untuk Nomor Gaya Ini</h3>
          <p className="text-xs font-bold text-slate-500 max-w-md mx-auto">
            Sistem time trial tidak membuat heat otomatis. Silakan buat Heat 1 secara manual dengan menekan tombol di bawah.
          </p>
          <button
            onClick={() => setIsAddHeatModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            + Buat Heat 1 Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {heats.map((heat) => (
            <div
              key={heat.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden page-break-inside-avoid print:shadow-none print:border-black print:rounded-none"
            >
              {/* HEAT CARD HEADER */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-black text-white bg-purple-600 px-3 py-1 rounded-lg shadow-sm">
                    SERI / HEAT {heat.heat_number}
                  </span>
                  <span className="text-[11px] font-bold text-sky-700 bg-white px-2 py-0.5 rounded-md border border-sky-200 flex items-center gap-1 shadow-2xs">
                    <Calendar className="w-3 h-3 text-sky-600" />
                    <span>{heat.date || currentStroke?.schedule_date || currentSession?.date || "2026-03-28"}</span>
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 bg-white px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 shadow-2xs">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Mulai: {heat.start_time || currentStroke?.schedule_time || "08:00 WIB"}</span>
                  </span>
                  {heat.notes && (
                    <span className="text-xs font-bold text-purple-900 bg-purple-100/70 px-2.5 py-0.5 rounded-md">
                      Catatan: {heat.notes}
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-slate-400">
                    ({(heat.lanes || []).filter((l: any) => l.member_id).length} / {heat.lanes?.length || 6} Terisi)
                  </span>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => handleDeleteHeat(heat.id, heat.heat_number)}
                    className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition"
                    title="Hapus Heat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* HEAT LANES TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/40 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3 pl-5 w-24">LINTASAN</th>
                      <th className="p-3">NAMA PERENANG / ATLET (MASC SWIM)</th>
                      <th className="p-3 w-32">GENDER / KU</th>
                      <th className="p-3 w-36 text-center">SEED TIME</th>
                      <th className="p-3 pr-5 w-48 text-right print:hidden">ATUR LINTASAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {(heat.lanes || []).map((lane: any) => {
                      const isOccupied = !!lane.member_id && !!lane.member;
                      return (
                        <tr
                          key={lane.id}
                          className={`hover:bg-slate-50/60 transition ${
                            isOccupied ? "bg-white" : "bg-slate-50/30"
                          }`}
                        >
                          {/* LANE NUMBER */}
                          <td className="p-3 pl-5">
                            <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 border border-slate-200 w-8 h-8 rounded-xl flex items-center justify-center">
                              {lane.lane_number}
                            </span>
                          </td>

                          {/* SWIMMER NAME */}
                          <td className="p-3">
                            {isOccupied ? (
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-black text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded text-[10px]">
                                  {lane.member?.member_number}
                                </span>
                                <div>
                                  <p className="font-black text-slate-900 uppercase leading-snug">
                                    {lane.member?.full_name}
                                  </p>
                                  {lane.member?.nickname && (
                                    <p className="text-[10px] font-semibold text-slate-400">
                                      Panggilan: {lane.member?.nickname}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold italic flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                [Lintasan Kosong]
                              </span>
                            )}
                          </td>

                          {/* GENDER & INFO */}
                          <td className="p-3">
                            {isOccupied ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  lane.member?.gender === "PUTRA"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-pink-100 text-pink-800"
                                }`}
                              >
                                {lane.member?.gender}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>

                          {/* SEED TIME */}
                          <td className="p-3 text-center">
                            {isOccupied ? (
                              <span className="font-mono font-bold text-slate-700">
                                {lane.entry?.seed_time || "NT"}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>

                          {/* ACTIONS / DROPDOWN SELECTOR */}
                          <td className="p-3 pr-5 text-right print:hidden">
                            <select
                              value={lane.entry_id || 0}
                              onChange={(e) => handleAssignToLane(lane.id, e.target.value)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl border outline-none cursor-pointer transition ${
                                isOccupied
                                  ? "bg-sky-50 text-sky-900 border-sky-300 hover:border-sky-400"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-purple-300"
                              }`}
                            >
                              <option value={0}>-- Kosongkan Lintasan --</option>
                              {entries.map((entry) => {
                                const isAlreadyInThisLane = entry.id === lane.entry_id;
                                const isUsedElsewhere =
                                  assignedMemberIds.has(entry.member_id) && !isAlreadyInThisLane;
                                return (
                                  <option
                                    key={entry.id}
                                    value={entry.id}
                                    disabled={isUsedElsewhere}
                                  >
                                    [{entry.member?.member_number}] {entry.member?.full_name} (
                                    {entry.member?.gender}) {isUsedElsewhere ? "(Sudah di heat lain)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL TAMBAH HEAT MANUAL */}
      {isAddHeatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500 text-white rounded-xl shadow-md shadow-purple-500/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Tambah Seri (Heat) Manual</h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    {currentStroke?.name} ({currentSession?.max_lanes} Lintasan)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddHeatModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHeat} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-black text-slate-700 mb-1">NOMOR SERI / HEAT</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={heatNumberInput}
                  onChange={(e) => setHeatNumberInput(parseInt(e.target.value) || 1)}
                  required
                  className="w-full px-3 py-2 font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-1">
                  CATATAN HEAT (OPSIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Heat Campuran Putra & Putri, Heat Khusus Pemula"
                  value={heatNotesInput}
                  onChange={(e) => setHeatNotesInput(e.target.value)}
                  className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddHeatModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md shadow-purple-500/20 transition"
                >
                  Buat Heat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
