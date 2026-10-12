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

  const [heats, setHeats] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingHeats, setLoadingHeats] = useState<boolean>(false);
  const [savingLanes, setSavingLanes] = useState<Record<number, boolean>>({});

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

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-md shadow-emerald-500/20">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Catat Hasil Speed Time Trial
            </h1>
            <p className="text-xs font-bold text-slate-500">
              Input pencatatan waktu resmi stopwatch/timer per heat dan kalkulasi urutan rekor kecepatan atlet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            Cetak Rekap Hasil
          </button>
          <button
            onClick={handleSaveAllAndCalculateRanks}
            disabled={heats.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition disabled:opacity-50"
          >
            <Trophy className="w-4 h-4" />
            Simpan & Hitung Ranking
          </button>
        </div>
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
        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                {currentStroke.event_code}
              </span>
              <h2 className="text-base font-black text-slate-900 uppercase">{currentStroke.name}</h2>
              <span className="text-xs font-bold text-slate-500">({currentStroke.distance})</span>
            </div>
            <p className="text-xs text-emerald-900 font-bold mt-1">
              {currentSession.title} • {currentSession.location} • {heats.length} Seri (Heat)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAllAndCalculateRanks}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Kalkulasi Ranking Otomatis
            </button>
          </div>
        </div>
      )}

      {/* RECORDING PER HEAT VIEW */}
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
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
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
                  <span className="text-[11px] font-bold text-slate-400">
                    {occupiedLanes.length} Perenang
                  </span>
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
                                className={`px-2.5 py-1 text-[11px] font-black rounded-lg border outline-none cursor-pointer ${
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
                            </td>

                            {/* SPEED TIME INPUT */}
                            <td className="p-3 text-center">
                              <div className="flex justify-center">
                                <SwimmingTimeInput
                                  value={laneData.result_time || "00.00.00"}
                                  onChange={(val) => handleTimeChange(lane.id, val)}
                                  disabled={laneData.status !== "OK"}
                                  size="sm"
                                />
                              </div>
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
                                className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                              />
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

      {/* REKAP KESELURUHAN / LEADERBOARD PERINGKAT WAKTU TERCEPAT */}
      {allRankedLanes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
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
          </div>

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
                {allRankedLanes.map((l, idx) => (
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
        </div>
      )}
    </div>
  );
}
