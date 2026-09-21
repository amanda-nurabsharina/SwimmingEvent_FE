"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getStartingList, getTournaments } from "../../lib/api-client";
import { Download, RefreshCw, Trophy, ArrowLeft, Layers, Search, MapPin, Tv } from "lucide-react";
import Link from "next/link";

function StartingListContent() {
  const searchParams = useSearchParams();
  const urlTourneyId = searchParams.get("tournament_id");

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(0);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch tournaments on mount
  useEffect(() => {
    async function loadTourneys() {
      const res = await getTournaments();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setTournaments(res.data);
        if (urlTourneyId) {
          setSelectedTournamentId(Number(urlTourneyId));
        } else {
          const active = res.data.find((t: any) => t.is_active);
          setSelectedTournamentId(active ? active.id : res.data[0].id);
        }
      }
    }
    loadTourneys();
  }, [urlTourneyId]);

  // 2. Fetch list whenever selectedTournamentId changes
  const fetchList = async (tourneyId?: number) => {
    setLoading(true);
    const tid = tourneyId !== undefined ? tourneyId : selectedTournamentId;
    const res = await getStartingList(tid > 0 ? tid : undefined);
    if (res?.success) {
      setList(res.data || []);
    } else {
      setList([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTournamentId > 0 || tournaments.length > 0) {
      fetchList(selectedTournamentId);
    }
  }, [selectedTournamentId]);

  const currentTournament = useMemo(() => {
    return tournaments.find((t) => t.id === selectedTournamentId) || null;
  }, [tournaments, selectedTournamentId]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.nama?.toLowerCase().includes(q) ||
        item.club?.toLowerCase().includes(q) ||
        item.nomor_lomba?.toLowerCase().includes(q) ||
        item.pic?.toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Navigation & Official Header */}
        <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-black text-sky-700 hover:text-sky-800 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-sky-800 font-extrabold text-[11px] tracking-wider uppercase bg-sky-100 px-3 py-0.5 rounded-full border border-sky-200">
                LIVE SCOREBOARD & STARTING LIST RESMI
              </span>
              {currentTournament?.is_active && (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  ● TURNAMEN AKTIF
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">
              {currentTournament?.name || "STARTING LIST & SCOREBOARD"}
            </h1>
            <p className="mt-1 text-slate-600 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              {currentTournament?.location || "Kolam Renang MGCC Modernland Kota Tangerang"}
              {currentTournament?.event_start_date && (
                <span>• Jadwal: {currentTournament.event_start_date}</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/live-scoreboard?tournament_id=${selectedTournamentId}`}
              target="_blank"
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Tv className="w-3.5 h-3.5" /> Layar TV / Proyektor (Auto-Slide)
            </Link>
            <Link
              href={`/buku-acara?tournament_id=${selectedTournamentId}&tab=juara`}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5" /> Podium &amp; Hasil Juara
            </Link>
            <button
              onClick={() => fetchList()}
              disabled={loading}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-sky-400" /> Cetak PDF
            </button>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="no-print flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
          {/* Tournament Switcher */}
          <div className="flex-1 max-w-md space-y-1">
            <label className="block text-[11px] font-black uppercase text-slate-500 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Pilih Turnamen:
            </label>
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_active ? "★ (Aktif)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="flex-1 max-w-sm space-y-1">
            <label className="block text-[11px] font-black uppercase text-slate-500 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-sky-500" /> Cari Perenang / Klub:
            </label>
            <input
              type="text"
              placeholder="Ketik nama atau klub..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Stats Badge */}
          <div className="flex items-center justify-end md:justify-start pt-2 md:pt-4 text-xs font-bold text-slate-600">
            Total Atlet: <span className="text-sky-600 font-black ml-1.5 text-sm">{filteredList.length} Perenang</span>
          </div>
        </div>

        {/* Starting List & Results Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                <th className="p-3.5 text-center w-12">NO</th>
                <th className="p-3.5">NAMA PERENANG</th>
                <th className="p-3.5 text-center">GENDER</th>
                <th className="p-3.5 text-center">TIME SEED</th>
                <th className="p-3.5">NOMOR LOMBA</th>
                <th className="p-3.5">KLUB / ASAL</th>
                <th className="p-3.5 text-center">HASIL WAKTU</th>
                <th className="p-3.5">PIC / KONTAK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
                    Memuat data perenang turnamen...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    Belum ada data pendaftar pada turnamen ini.
                  </td>
                </tr>
              ) : (
                filteredList.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                    <td className="p-3.5 text-center font-bold text-slate-500">{item.no || idx + 1}</td>
                    <td className="p-3.5 font-black text-slate-900 uppercase">{item.nama}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                          item.jenis_kelamin === "PUTRA" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                        }`}
                      >
                        {item.jenis_kelamin}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-cyan-700">{item.time_seed}</td>
                    <td className="p-3.5 font-bold text-sky-700">{item.nomor_lomba}</td>
                    <td className="p-3.5 font-bold text-slate-700">{item.club}</td>
                    <td className="p-3.5 text-center">
                      {item.result ? (
                        <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-emerald-800 font-mono font-black">
                          <span>{item.result}</span>
                          {item.rank > 0 && (
                            <span className="text-[10px] bg-emerald-600 text-white px-1.5 rounded-full">
                              #{item.rank}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">
                      <div>{item.pic || "-"}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.kontak || ""}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function StartingListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">Memuat Live Scoreboard...</div>}>
      <StartingListContent />
    </Suspense>
  );
}
