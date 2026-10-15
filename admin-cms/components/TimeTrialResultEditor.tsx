"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Trophy,
  Zap,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Save,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  AlertCircle,
  Users,
} from "lucide-react";
import SwimmingTimeInput from "./SwimmingTimeInput";
import {
  getTimeTrialSessions,
  getTimeTrialStrokes,
  getTimeTrialHeats,
  updateTimeTrialLane,
  calculateTimeTrialRanks,
} from "../lib/api-admin";
import { toast } from "./Toast";

export default function TimeTrialResultEditor({
  initialSessionId,
  initialStrokeId,
}: {
  initialSessionId?: number;
  initialStrokeId?: number;
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(initialSessionId || 0);
  const [strokes, setStrokes] = useState<any[]>([]);
  const [selectedStrokeId, setSelectedStrokeId] = useState<number>(initialStrokeId || 0);

  const [activeTab, setActiveTab] = useState<"heats" | "leaderboard">("heats");
  const [genderFilter, setGenderFilter] = useState<string>("ALL");

  const [heats, setHeats] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingHeats, setLoadingHeats] = useState<boolean>(false);
  const [savingLanes, setSavingLanes] = useState<Record<number, boolean>>({});
  const [savingHeatId, setSavingHeatId] = useState<number | null>(null);

  // Local state for modified results: laneId -> { result_time, status, coach_notes }
  const [laneResults, setLaneResults] = useState<
    Record<number, { result_time: string; status: string; coach_notes: string }>
  >({});

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

  const fetchHeats = async () => {
    if (selectedSessionId === 0 || selectedStrokeId === 0) return;
    setLoadingHeats(true);
    const res = await getTimeTrialHeats(selectedSessionId, selectedStrokeId);
    if (res.success) {
      const heatList = res.data || [];
      setHeats(heatList);

      // Populate local results state
      const initialMap: Record<number, { result_time: string; status: string; coach_notes: string }> = {};
      heatList.forEach((h: any) => {
        (h.lanes || []).forEach((l: any) => {
          initialMap[l.id] = {
            result_time: l.result_time || "",
            status: l.status || "OK",
            coach_notes: l.coach_notes || "",
          };
        });
      });
      setLaneResults(initialMap);
    } else {
      setHeats([]);
    }
    setLoadingHeats(false);
  };

  useEffect(() => {
    if (selectedSessionId > 0 && selectedStrokeId > 0) {
      fetchHeats();
    }
  }, [selectedSessionId, selectedStrokeId]);

  const currentSession = sessions.find((s) => s.id === selectedSessionId);
  const currentStroke = strokes.find((s) => s.id === selectedStrokeId);

  // Update a single lane result locally
  const handleTimeChange = (laneId: number, val: string) => {
    setLaneResults((prev) => ({
      ...prev,
      [laneId]: {
        ...prev[laneId],
        result_time: val,
      },
    }));
  };

  const handleStatusChange = (laneId: number, status: string) => {
    setLaneResults((prev) => ({
      ...prev,
      [laneId]: {
        ...prev[laneId],
        status,
      },
    }));
  };

  const handleNotesChange = (laneId: number, notes: string) => {
    setLaneResults((prev) => ({
      ...prev,
      [laneId]: {
        ...prev[laneId],
        coach_notes: notes,
      },
    }));
  };

  // Save single lane
  const handleSaveLane = async (laneId: number) => {
    const laneData = laneResults[laneId];
    if (!laneData) return;

    setSavingLanes((prev) => ({ ...prev, [laneId]: true }));
    const res = await updateTimeTrialLane(laneId, {
      result_time: laneData.result_time,
      status: laneData.status,
      coach_notes: laneData.coach_notes,
    });
    setSavingLanes((prev) => ({ ...prev, [laneId]: false }));

    if (res.success) {
      toast.success("Hasil waktu tersimpan");
    } else {
      toast.error(res.message || "Gagal menyimpan hasil");
    }
  };

  // Save all lanes in a specific heat
  const handleSaveHeatLanes = async (heat: any) => {
    const occupiedLanes = (heat.lanes || []).filter((l: any) => l.member_id && l.member);
    if (occupiedLanes.length === 0) return;

    setSavingHeatId(heat.id);
    const savePromises = occupiedLanes.map((lane: any) => {
      const data = laneResults[lane.id] || {
        result_time: lane.result_time,
        status: lane.status || "OK",
        coach_notes: lane.coach_notes || "",
      };
      return updateTimeTrialLane(lane.id, {
        result_time: data.result_time,
        status: data.status,
        coach_notes: data.coach_notes,
      });
    });

    await Promise.all(savePromises);
    if (selectedSessionId && selectedStrokeId) {
      await calculateTimeTrialRanks(selectedSessionId, selectedStrokeId);
    }
    setSavingHeatId(null);
    toast.success(`Catatan waktu Seri ${heat.heat_number} berhasil disimpan & ranking diperbarui!`);
    fetchHeats();
  };

  // Save all and recalculate ranking
  const handleSaveAllAndCalculateRanks = async () => {
    if (selectedSessionId === 0 || selectedStrokeId === 0) return;

    toast.info("Menyimpan seluruh catatan waktu & menghitung peringkat...");

    // 1. Batch save all active lanes
    const savePromises = Object.entries(laneResults).map(([idStr, data]) => {
      const laneId = parseInt(idStr);
      return updateTimeTrialLane(laneId, {
        result_time: data.result_time,
        status: data.status,
        coach_notes: data.coach_notes,
      });
    });

    await Promise.all(savePromises);

    // 2. Trigger calculate ranks in backend
    const rankRes = await calculateTimeTrialRanks(selectedSessionId, selectedStrokeId);

    if (rankRes.success) {
      toast.success("Catatan waktu & ranking berhasil dihitung dan disimpan!");
      fetchHeats();
    } else {
      toast.error(rankRes.message || "Gagal menghitung peringkat");
    }
  };

  // Extract all ranked lanes for leaderboard summary
  const allRankedLanes: any[] = [];
  heats.forEach((h) => {
    (h.lanes || []).forEach((l: any) => {
      if (l.member_id && l.member) {
        allRankedLanes.push({
          ...l,
          heat_number: h.heat_number,
        });
      }
    });
  });

  // Sort leaderboard: Rank > 0 first, then by rank ascending
  allRankedLanes.sort((a, b) => {
    if (a.rank > 0 && b.rank > 0) return a.rank - b.rank;
    if (a.rank > 0) return -1;
    if (b.rank > 0) return 1;
    return 0;
  });

  const filteredRankedLanes = allRankedLanes.filter((l) => {
    if (genderFilter === "ALL") return true;
    return l.member?.gender === genderFilter;
  });

  const fastestSwimmer = allRankedLanes.find((l) => l.rank === 1 && l.result_time && l.result_time !== "00.00.00");
  const totalFinished = allRankedLanes.filter((l) => l.status === "OK" && l.result_time && l.result_time !== "00.00.00").length;

  return (
    <div className="space-y-6">
      {/* DYNAMIC PRINT STYLE INJECTION */}
      <style jsx global>{`
        @media print {
          @page {
            size: a4 portrait;
            margin: 10mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
          aside, nav, header {
            display: none !important;
          }
          .print-header-banner {
            break-after: avoid !important;
            page-break-after: avoid !important;
            margin-top: 0 !important;
            margin-bottom: 12px !important;
          }
          .print-heat-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 12px !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          thead {
            display: table-header-group !important;
          }
          tbody {
            display: table-row-group !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          th, td {
            border: none !important;
            padding: 3px 6px !important;
          }
        }
      `}</style>

      {/* PRINTABLE OFFICIAL PDF HEADER (VISIBLE ON PRINT ONLY) */}
      <div className="hidden print:block mb-4 border-b-2 border-black pb-2 text-center print-header-banner">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1 border-b border-slate-300 pb-1">
          <span>AKUATIK INDONESIA / MASC SWIM CLUB</span>
          <span className="font-mono font-black text-slate-900 uppercase">
            {activeTab === "heats"
              ? "LEMBAR PENCATATAN WAKTU TIME TRIAL RESMI (PER HEAT)"
              : "REKAPITULASI RESMI RANKING TIME TRIAL"}
          </span>
        </div>
        <h1 className="text-xl font-black uppercase tracking-wider text-black">
          {activeTab === "heats"
            ? "PENCATATAN WAKTU SPEED RESMI PER HEAT"
            : "PAPAN PERINGKAT & REKOR KECEPATAN (LEADERBOARD)"}
        </h1>
        <h2 className="text-base font-black uppercase mt-0.5 text-black">
          {currentStroke ? `[${currentStroke.event_code}] ${currentStroke.name} (${currentStroke.distance})` : "TIME TRIAL"}
        </h2>
        <p className="text-xs font-bold uppercase text-slate-700 mt-1">
          {currentSession?.title} • {currentSession?.location} • 📅 {currentStroke?.schedule_date || currentSession?.date || "2026-03-28"} • ⏰ {currentStroke?.schedule_time || "08:00 WIB"}
          {activeTab === "leaderboard" && genderFilter !== "ALL" && ` • KATEGORI: ${genderFilter}`}
        </p>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl text-white shadow-md ${
            activeTab === "heats"
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20"
              : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20"
          }`}>
            {activeTab === "heats" ? <CheckSquare className="w-6 h-6" /> : <Trophy className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeTab === "heats" ? "Catat Hasil Speed Time Trial" : "Rekapitulasi & Ranking Kecepatan"}
            </h1>
            <p className="text-xs font-bold text-slate-500">
              {activeTab === "heats"
                ? "Input pencatatan waktu resmi stopwatch/timer per heat dan simpan evaluasi atlet"
                : "Peringkat rekor kecepatan atlet dari seluruh seri (heat) per nomor gaya lomba"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            {activeTab === "heats" ? "Cetak Lembar Heat" : "Cetak Papan Ranking"}
          </button>
          <button
            onClick={handleSaveAllAndCalculateRanks}
            disabled={heats.length === 0}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition disabled:opacity-50 text-white ${
              activeTab === "heats"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20"
                : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20"
            }`}
          >
            <Trophy className="w-4 h-4" />
            {activeTab === "heats" ? "Simpan & Hitung Ranking" : "Hitung Ulang Ranking"}
          </button>
        </div>
      </div>

      {/* SUB-TAB SWITCHER */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1.5 print:hidden">
        <button
          onClick={() => setActiveTab("heats")}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === "heats"
              ? "bg-white text-emerald-800 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>Lembar Input Per Seri (Heat)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
            activeTab === "heats" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200/70 text-slate-600"
          }`}>
            {heats.length} Seri
          </span>
        </button>

        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === "leaderboard"
              ? "bg-white text-amber-800 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Rekapitulasi & Ranking Kecepatan</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
            activeTab === "leaderboard" ? "bg-amber-100 text-amber-900" : "bg-slate-200/70 text-slate-600"
          }`}>
            {allRankedLanes.length} Atlet
          </span>
        </button>
      </div>

      {/* SESSION & STROKE SELECTOR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <div>
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
            PILIH SESI TIME TRIAL
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(parseInt(e.target.value) || 0)}
            className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
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
            className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
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
        <div className={`p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden border ${
          activeTab === "heats"
            ? "bg-emerald-50/70 border-emerald-200"
            : "bg-amber-50/70 border-amber-200"
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs font-black bg-white px-2 py-0.5 rounded border ${
                activeTab === "heats"
                  ? "text-emerald-800 border-emerald-300"
                  : "text-amber-800 border-amber-300"
              }`}>
                {currentStroke.event_code}
              </span>
              <h2 className="text-base font-black text-slate-900 uppercase">{currentStroke.name}</h2>
              <span className="text-xs font-bold text-slate-500">({currentStroke.distance})</span>
            </div>
            <p className={`text-xs font-bold mt-1 ${
              activeTab === "heats" ? "text-emerald-900" : "text-amber-900"
            }`}>
              {currentSession.title} • {currentSession.location} • {heats.length} Seri (Heat) • {allRankedLanes.length} Atlet Terdaftar
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAllAndCalculateRanks}
              className={`px-4 py-2 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 ${
                activeTab === "heats"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              <Save className="w-4 h-4" />
              {activeTab === "heats" ? "Kalkulasi Ranking Otomatis" : "Hitung Ulang Ranking"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: RECORDING PER HEAT VIEW */}
      {activeTab === "heats" && (
        <>
          {loadingHeats ? (
            <div className="p-12 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
              Memuat lembar pencatatan hasil...
            </div>
          ) : heats.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
              <p className="font-black text-slate-700 text-base">Belum Ada Heat untuk Nomor Gaya Ini</p>
              <p className="text-xs text-slate-500 font-bold">
                Buka menu "Buku Acara Time Trial" terlebih dahulu untuk membuat Seri (Heat) dan menata atlet di lintasan.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {heats.map((heat) => {
                const occupiedLanes = (heat.lanes || []).filter((l: any) => l.member_id && l.member);
                if (occupiedLanes.length === 0) return null;

                return (
                  <div
                    key={heat.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print-heat-card print:shadow-none print:border-black print:rounded-none"
                  >
                    {/* HEAT TITLE BAR */}
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-black text-white bg-emerald-600 px-3 py-1 rounded-lg">
                          SERI / HEAT {heat.heat_number}
                        </span>
                        {heat.notes && (
                          <span className="text-xs font-bold text-slate-600">
                            {heat.notes}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold text-slate-400">
                          {occupiedLanes.length} Perenang
                        </span>
                        <button
                          type="button"
                          disabled={savingHeatId === heat.id}
                          onClick={() => handleSaveHeatLanes(heat)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          title="Simpan seluruh catatan waktu di heat ini sekaligus"
                        >
                          {savingHeatId === heat.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Simpan Waktu Seri {heat.heat_number}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* LANES INPUT TABLE */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                            <th className="p-3 pl-5 w-20">LANE</th>
                            <th className="p-3">NAMA PERENANG</th>
                            <th className="p-3 w-28 text-center">STATUS</th>
                            <th className="p-3 w-48 text-center">WAKTU SPEED (HASIL)</th>
                            <th className="p-3 w-20 text-center">RANK</th>
                            <th className="p-3">CATATAN EVALUASI PELATIH</th>
                            <th className="p-3 pr-5 w-24 text-center print:hidden">SIMPAN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {(heat.lanes || []).map((lane: any) => {
                            if (!lane.member_id || !lane.member) return null;
                            const laneData = laneResults[lane.id] || {
                              result_time: lane.result_time || "",
                              status: lane.status || "OK",
                              coach_notes: lane.coach_notes || "",
                            };

                            return (
                              <tr key={lane.id} className="hover:bg-slate-50/60 transition">
                                {/* LANE NUMBER */}
                                <td className="p-3 pl-5">
                                  <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 border border-slate-200 w-8 h-8 rounded-xl flex items-center justify-center">
                                    {lane.lane_number}
                                  </span>
                                </td>

                                {/* SWIMMER */}
                                <td className="p-3">
                                  <span className="font-mono font-black text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded text-[10px] mr-2">
                                    {lane.member?.member_number}
                                  </span>
                                  <span className="font-black text-slate-900 uppercase">
                                    {lane.member?.full_name}
                                  </span>
                                  <span
                                    className={`ml-2 px-1.5 py-0.2 rounded text-[9px] font-black ${
                                      lane.member?.gender === "PUTRA" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                                    }`}
                                  >
                                    {lane.member?.gender}
                                  </span>
                                </td>

                                {/* STATUS SELECTOR */}
                                <td className="p-3 text-center">
                                  <select
                                    value={laneData.status}
                                    onChange={(e) => handleStatusChange(lane.id, e.target.value)}
                                    className={`px-2.5 py-1 text-[11px] font-black rounded-lg border outline-none cursor-pointer print:hidden ${
                                      laneData.status === "OK"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                        : laneData.status === "DNS"
                                        ? "bg-slate-100 text-slate-700 border-slate-300"
                                        : "bg-rose-50 text-rose-700 border-rose-300"
                                    }`}
                                  >
                                    <option value="OK">OK (FINISH)</option>
                                    <option value="DNS">DNS (ABSEN)</option>
                                    <option value="DNF">DNF (GAGAL)</option>
                                    <option value="DQ">DQ (DISKUALIFIKASI)</option>
                                  </select>
                                  <span className="hidden print:inline-block font-mono font-black text-xs uppercase">
                                    {laneData.status === "OK" ? "FINISH" : laneData.status}
                                  </span>
                                </td>

                                {/* SPEED TIME INPUT */}
                                <td className="p-3 text-center">
                                  <div className="flex justify-center print:hidden">
                                    <SwimmingTimeInput
                                      value={laneData.result_time || "00.00.00"}
                                      onChange={(val) => handleTimeChange(lane.id, val)}
                                      disabled={laneData.status !== "OK"}
                                      size="sm"
                                    />
                                  </div>
                                  <span className="hidden print:inline-block font-mono font-black text-sm text-slate-900">
                                    {laneData.result_time && laneData.result_time !== "00.00.00" ? laneData.result_time : "-"}
                                  </span>
                                </td>

                                {/* RANK */}
                                <td className="p-3 text-center">
                                  {lane.rank > 0 ? (
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded-lg font-black font-mono text-xs ${
                                        lane.rank === 1
                                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                                          : lane.rank === 2
                                          ? "bg-slate-200 text-slate-800 border border-slate-300"
                                          : lane.rank === 3
                                          ? "bg-orange-100 text-orange-800 border border-orange-300"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      #{lane.rank}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-mono">-</span>
                                  )}
                                </td>

                                {/* COACH NOTES */}
                                <td className="p-3">
                                  <input
                                    type="text"
                                    placeholder="Catatan evaluasi pelatih (misal: tarikan tangan oke)..."
                                    value={laneData.coach_notes}
                                    onChange={(e) => handleNotesChange(lane.id, e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none print:hidden"
                                  />
                                  <span className="hidden print:inline-block text-xs font-medium text-slate-800">
                                    {laneData.coach_notes || "-"}
                                  </span>
                                </td>

                                {/* SAVE BUTTON */}
                                <td className="p-3 pr-5 text-center print:hidden">
                                  <button
                                    onClick={() => handleSaveLane(lane.id)}
                                    disabled={savingLanes[lane.id]}
                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] rounded-lg shadow-sm transition disabled:opacity-50"
                                  >
                                    {savingLanes[lane.id] ? "..." : "Simpan"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: REKAPITULASI LEADERBOARD VIEW */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          {/* STATS HIGHLIGHT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-slate-400">Juara 1 Rekor Tercepat</p>
                <p className="text-sm font-black text-slate-900 truncate">
                  {fastestSwimmer ? fastestSwimmer.member?.full_name : "-"}
                </p>
                <p className="text-xs font-mono font-black text-amber-600">
                  {fastestSwimmer ? fastestSwimmer.result_time : "Belum ada"}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Total Atlet Finish</p>
                <p className="text-xl font-black text-slate-900 font-mono">
                  {totalFinished} / {allRankedLanes.length}
                </p>
                <p className="text-[10px] font-bold text-slate-500">Waktu tercatat resmi</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Jumlah Seri (Heat)</p>
                <p className="text-xl font-black text-slate-900 font-mono">
                  {heats.length}
                </p>
                <p className="text-[10px] font-bold text-slate-500">{currentStroke?.distance}</p>
              </div>
            </div>
          </div>

          {/* LEADERBOARD CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 print:shadow-none print:border-black print:rounded-none print:overflow-visible print:break-inside-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Rekapitulasi Hasil Kecepatan (Ranking Time Trial)
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    {currentStroke?.name} • Hasil tercepat dari seluruh Seri (Heat)
                  </p>
                </div>
              </div>

              {/* GENDER FILTER PILLS */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl print:hidden">
                <button
                  onClick={() => setGenderFilter("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    genderFilter === "ALL"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Semua ({allRankedLanes.length})
                </button>
                <button
                  onClick={() => setGenderFilter("PUTRA")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    genderFilter === "PUTRA"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-blue-600"
                  }`}
                >
                  Putra ({allRankedLanes.filter((l) => l.member?.gender === "PUTRA").length})
                </button>
                <button
                  onClick={() => setGenderFilter("PUTRI")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    genderFilter === "PUTRI"
                      ? "bg-pink-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-pink-600"
                  }`}
                >
                  Putri ({allRankedLanes.filter((l) => l.member?.gender === "PUTRI").length})
                </button>
              </div>
            </div>

            {filteredRankedLanes.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl space-y-2">
                <Award className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600 text-sm">Belum Ada Rekapitulasi untuk Kategori Ini</p>
                <p className="text-xs text-slate-400">
                  Buka tab "Lembar Input Per Seri" untuk memasukkan catatan waktu dan klik tombol hitung ranking.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 font-black text-slate-600 border-b border-slate-200 uppercase">
                      <th className="p-3 pl-4 w-16 text-center">RANK</th>
                      <th className="p-3">NO. ANGGOTA</th>
                      <th className="p-3">NAMA PERENANG</th>
                      <th className="p-3">GENDER</th>
                      <th className="p-3 text-center">SERI / LINTASAN</th>
                      <th className="p-3 text-center">CATATAN WAKTU SPEED</th>
                      <th className="p-3">CATATAN EVALUASI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredRankedLanes.map((l, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 pl-4 text-center">
                          {l.rank > 0 ? (
                            <span
                              className={`font-black font-mono px-2 py-0.5 rounded-lg text-xs ${
                                l.rank === 1
                                  ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                                  : l.rank === 2
                                  ? "bg-slate-200 text-slate-800 border border-slate-300"
                                  : l.rank === 3
                                  ? "bg-orange-100 text-orange-900 border border-orange-300"
                                  : "text-slate-600"
                              }`}
                            >
                              #{l.rank}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold">{l.status}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-black text-sky-700">
                          {l.member?.member_number}
                        </td>
                        <td className="p-3 font-black text-slate-900 uppercase">
                          {l.member?.full_name}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              l.member?.gender === "PUTRA" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                            }`}
                          >
                            {l.member?.gender}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          Heat {l.heat_number} / Lintasan {l.lane_number}
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-mono font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-sm">
                            {l.result_time || "-"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {l.coach_notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
