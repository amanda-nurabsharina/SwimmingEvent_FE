"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Printer,
  Search,
  Filter,
  RefreshCw,
  Trophy,
  Users,
  CheckCircle2,
  Building2,
  ArrowUpDown,
  Download,
} from "lucide-react";

interface StartingListViewerProps {
  registrations: any[];
  tournaments: any[];
  onRefresh?: () => void;
  initialTournamentId?: number;
}

export default function StartingListViewer({
  registrations,
  tournaments,
  onRefresh,
  initialTournamentId,
}: StartingListViewerProps) {
  // State Filter
  const [selectedTourneyId, setSelectedTourneyId] = useState<number>(initialTournamentId || 0);
  const [selectedClub, setSelectedClub] = useState<string>("ALL");
  const [genderFilter, setGenderFilter] = useState<string>("ALL"); // ALL, PA, PI
  const [agFilter, setAgFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [groupByClub, setGroupByClub] = useState<boolean>(true);

  // Helper parsing year of birth
  const getYOB = (birthDate: string): string => {
    if (!birthDate) return "-";
    const match = String(birthDate).match(/\b(19\d\d|20\d\d)\b/);
    if (match) return match[1];
    const d = new Date(birthDate);
    if (!isNaN(d.getFullYear()) && d.getFullYear() > 1900) return String(d.getFullYear());
    return "-";
  };

  // Helper derive Age Group (AG)
  const deriveKU = (bDate: string) => {
    if (!bDate) return "";
    const birthYear = new Date(bDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age <= 5) return "6A";
    if (age <= 7) return "6B";
    if (age <= 9) return "5";
    if (age <= 11) return "4";
    if (age <= 13) return "3";
    if (age <= 15) return "2";
    if (age <= 18) return "1";
    return "SENIOR";
  };

  const getAG = (ageGroup?: string, birthDate?: string): string => {
    let ag = ageGroup || "";
    if (!ag && birthDate) {
      ag = deriveKU(birthDate);
    }
    const clean = ag.replace(/^KU\s*/i, "").trim();
    return clean || "-";
  };

  // Helper Sex (PA = Putra, PI = Putri)
  const getSex = (gender?: string): string => {
    const g = (gender || "").toUpperCase();
    if (g.includes("PUTRI") || g === "PI" || g === "F" || g === "FEMALE") return "PI";
    return "PA";
  };

  // Helper Stroke Display
  const getStrokeDisplay = (event: any): string => {
    if (!event) return "-";
    if (event.distance && event.stroke) {
      const dist = event.distance.replace(/METER/i, "M").trim();
      const strk = event.stroke.replace(/_/g, " ").trim();
      return `${dist} ${strk}`.toUpperCase();
    }
    return (event.event_name || "-").toUpperCase();
  };

  // Helper Seed Time
  const getSeedTime = (timeSeed?: string): string => {
    if (!timeSeed || timeSeed === "NT" || timeSeed === "") return "99.99.99";
    return timeSeed;
  };

  // 1. Filter registrations: Hanya yang terverifikasi (Verified/Approved) dan aktif
  const verifiedRegistrations = useMemo(() => {
    return (registrations || []).filter((r) => {
      const isVerified = (r.payment_status || "").toLowerCase() === "verified";
      const isActive = r.is_active !== false && (!r.participant || r.participant.is_active !== false);
      return isVerified && isActive;
    });
  }, [registrations]);

  // Current active tournament details
  const activeTournament = useMemo(() => {
    if (selectedTourneyId > 0) {
      return tournaments.find((t) => t.id === selectedTourneyId) || null;
    }
    return tournaments.find((t) => t.is_active) || tournaments[0] || null;
  }, [tournaments, selectedTourneyId]);

  // List of distinct clubs from verified registrations
  const availableClubs = useMemo(() => {
    const set = new Set<string>();
    verifiedRegistrations.forEach((r) => {
      const club = (r.participant?.club || "").trim();
      if (club) set.add(club);
    });
    return Array.from(set).sort();
  }, [verifiedRegistrations]);

  // List of distinct Age Groups (AG)
  const availableAGs = useMemo(() => {
    const set = new Set<string>();
    verifiedRegistrations.forEach((r) => {
      const ag = getAG(r.swimming_event?.age_group || r.participant?.age_group, r.participant?.birth_date);
      if (ag && ag !== "-") set.add(ag);
    });
    return Array.from(set).sort();
  }, [verifiedRegistrations]);

  // 2. Filtered verified registrations based on user selectors
  const filteredRegistrations = useMemo(() => {
    return verifiedRegistrations.filter((r) => {
      // Filter Tournament
      if (selectedTourneyId > 0 && r.swimming_event?.tournament_id !== selectedTourneyId) {
        return false;
      }

      // Filter Club
      if (selectedClub !== "ALL" && (r.participant?.club || "").trim() !== selectedClub) {
        return false;
      }

      // Filter Gender (PA vs PI)
      if (genderFilter !== "ALL") {
        const sex = getSex(r.participant?.gender || r.swimming_event?.gender);
        if (sex !== genderFilter) return false;
      }

      // Filter AG
      if (agFilter !== "ALL") {
        const ag = getAG(r.swimming_event?.age_group || r.participant?.age_group, r.participant?.birth_date);
        if (ag !== agFilter) return false;
      }

      // Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const swimmer = (r.participant?.name || "").toLowerCase();
        const club = (r.participant?.club || "").toLowerCase();
        const eventCode = String(r.swimming_event?.event_code || "");
        const stroke = getStrokeDisplay(r.swimming_event).toLowerCase();
        if (
          !swimmer.includes(q) &&
          !club.includes(q) &&
          !eventCode.includes(q) &&
          !stroke.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [verifiedRegistrations, selectedTourneyId, selectedClub, genderFilter, agFilter, searchQuery]);

  // 3. Grouped by Club / School
  const groupedByClubData = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredRegistrations.forEach((r) => {
      const clubName = (r.participant?.club || "TANPA KLUB / INDEPENDENT").trim().toUpperCase();
      if (!map.has(clubName)) {
        map.set(clubName, []);
      }
      map.get(clubName)!.push(r);
    });

    // Sort entries within each club by swimmer name asc, then event code asc
    const result: { club: string; entries: any[] }[] = [];
    Array.from(map.keys())
      .sort()
      .forEach((club) => {
        const entries = map.get(club)!;
        entries.sort((a, b) => {
          const nameA = (a.participant?.name || "").toUpperCase();
          const nameB = (b.participant?.name || "").toUpperCase();
          if (nameA !== nameB) return nameA.localeCompare(nameB);
          return (a.swimming_event?.event_code || 0) - (b.swimming_event?.event_code || 0);
        });
        result.push({ club, entries });
      });

    return result;
  }, [filteredRegistrations]);

  // Overall unique swimmers count
  const uniqueSwimmerCount = useMemo(() => {
    const set = new Set<number>();
    filteredRegistrations.forEach((r) => {
      if (r.participant_id) set.add(r.participant_id);
    });
    return set.size;
  }, [filteredRegistrations]);

  return (
    <div className="space-y-6 print:space-y-0">
      {/* GLOBAL PRINT STYLESHEET */}
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
          .no-print, aside, nav, header {
            display: none !important;
          }
          .print-club-block {
            break-inside: auto !important;
            page-break-inside: auto !important;
            margin-top: 0 !important;
            margin-bottom: 16px !important;
          }
          .print-club-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
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
          thead tr {
            border-bottom: 1.5px solid black !important;
          }
        }
      `}</style>

      {/* PRINTABLE OFFICIAL PDF HEADER (PRINT ONLY) */}
      <div className="hidden print:block mb-4 border-b-2 border-black pb-2 text-left">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 border-b border-slate-300 pb-1 mb-1">
          <span>AKUATIK INDONESIA • OFFICIAL STARTING LIST</span>
          <span>STATUS: VERIFIED & APPROVED</span>
        </div>
        <h1 className="text-base font-black uppercase tracking-wider text-black">
          {activeTournament?.name || "KEJUARAAN RENANG RESMI"}
        </h1>
        <p className="text-[11px] font-bold uppercase text-slate-800">
          DAFTAR RESMI PESERTA SIAP TANDING (STARTING LIST)
          {selectedClub !== "ALL" && ` • KLUB: ${selectedClub}`}
          {genderFilter !== "ALL" && ` • KATEGORI: ${genderFilter === "PA" ? "PUTRA" : "PUTRI"}`}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Lokasi: {activeTournament?.location || "Kolam Renang"} • Total: {uniqueSwimmerCount} Atlet ({filteredRegistrations.length} Nomor Lomba)
        </p>
      </div>

      {/* HEADER BANNER (SCREEN ONLY) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white shadow-md shadow-blue-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Starting List Peserta Lomba
            </h1>
            <p className="text-xs font-bold text-slate-500">
              Daftar resmi peserta yang sudah terverifikasi (Approved) &amp; siap tanding per klub/sekolah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            disabled={filteredRegistrations.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Export PDF / Cetak Resmi
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* STATS HIGHLIGHT CARDS (SCREEN ONLY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Total Atlet Siap Lomba</p>
            <p className="text-xl font-black text-slate-900 font-mono">{uniqueSwimmerCount}</p>
            <p className="text-[10px] font-bold text-blue-600">Terverifikasi &amp; Lunas</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Total Entri Nomor Lomba</p>
            <p className="text-xl font-black text-slate-900 font-mono">{filteredRegistrations.length}</p>
            <p className="text-[10px] font-bold text-emerald-600">Siap disusun di heat</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Klub / Kontingen</p>
            <p className="text-xl font-black text-slate-900 font-mono">{availableClubs.length}</p>
            <p className="text-[10px] font-bold text-purple-600">Klub &amp; Sekolah</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Turnamen Aktif</p>
            <p className="text-xs font-black text-slate-900 truncate max-w-[150px]">
              {activeTournament?.name || "Semua Turnamen"}
            </p>
            <p className="text-[10px] font-bold text-amber-600">{activeTournament?.location || "-"}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS (SCREEN ONLY) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          {/* FILTER TURNAMEN */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              PILIH TURNAMEN
            </label>
            <select
              value={selectedTourneyId}
              onChange={(e) => setSelectedTourneyId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value={0}>Semua Turnamen</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_active ? "★" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* FILTER KLUB / SEKOLAH */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              KLUB / SEKOLAH
            </label>
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Klub / Sekolah ({availableClubs.length})</option>
              {availableClubs.map((club) => (
                <option key={club} value={club}>
                  {club}
                </option>
              ))}
            </select>
          </div>

          {/* FILTER KELOMPOK UMUR (AG) */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              KELOMPOK UMUR (AG)
            </label>
            <select
              value={agFilter}
              onChange={(e) => setAgFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kelompok Umur</option>
              {availableAGs.map((ag) => (
                <option key={ag} value={ag}>
                  KU {ag}
                </option>
              ))}
            </select>
          </div>

          {/* SEARCH BAR */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              CARI ATLET / NOMOR LOMBA
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Nama atlet, klub, kode event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM FILTER TOGGLES */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* GENDER FILTER PILLS */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setGenderFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                genderFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua Gender
            </button>
            <button
              onClick={() => setGenderFilter("PA")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                genderFilter === "PA"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-blue-600"
              }`}
            >
              Putra (PA)
            </button>
            <button
              onClick={() => setGenderFilter("PI")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                genderFilter === "PI"
                  ? "bg-pink-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-pink-600"
              }`}
            >
              Putri (PI)
            </button>
          </div>

          {/* GROUP BY CLUB TOGGLE */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Tampilan:</span>
            <button
              onClick={() => setGroupByClub(!groupByClub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                groupByClub
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {groupByClub ? "Kelompokkan Per Klub / Sekolah" : "Daftar Gabungan Seluruh Atlet"}
            </button>
          </div>
        </div>
      </div>

      {/* STARTING LIST TABLE CONTENT */}
      {filteredRegistrations.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700">Tidak Ada Peserta Terverifikasi</h3>
          <p className="text-xs font-bold text-slate-400 max-w-md mx-auto">
            Belum ada data peserta berstatus <strong>Verified (Disetujui)</strong> untuk kriteria filter ini.
            Pastikan pendaftaran telah diverifikasi di menu "Kelola Pendaftaran".
          </p>
        </div>
      ) : groupByClub ? (
        /* MODE 1: GROUPED BY CLUB (MATCHING SCREENSHOT) */
        <div className="space-y-6 print:space-y-0">
          {groupedByClubData.map(({ club, entries }) => (
            <div
              key={club}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print-club-block print:shadow-none print:border-none print:rounded-none print:overflow-visible"
            >
              {/* CLUB HEADER BAR (MATCHES 'CLUB PALASO' IN SCREENSHOT) */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 print:bg-transparent print:border-b-2 print:border-black print:px-0 print:py-1.5 print-club-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-black uppercase text-slate-500 print:text-black">
                      CLUB / SCHOOL:
                    </span>
                    <h2 className="font-black text-slate-900 uppercase text-sm sm:text-base tracking-wide print:text-black">
                      {club}
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-slate-500 font-mono print:text-black">
                    {new Set(entries.map((e) => e.participant_id)).size} Atlet • {entries.length} Entri
                  </span>
                </div>
              </div>

              {/* TABLE ENTRIES */}
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-800 font-black uppercase text-[11px] tracking-wide print:bg-transparent print:border-b-2 print:border-black print:text-black">
                      <th className="py-2.5 px-4 pl-5">SWIMMER NAME</th>
                      <th className="py-2.5 px-3 text-center w-14">SEX</th>
                      <th className="py-2.5 px-3 text-center w-12">AG</th>
                      <th className="py-2.5 px-3 text-center w-16">YOB</th>
                      <th className="py-2.5 px-3 text-center w-24">EVENT NO</th>
                      <th className="py-2.5 px-4">STROKE</th>
                      <th className="py-2.5 px-3 pr-5 text-center w-28">SEED TIME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans print:divide-y-0">
                    {entries.map((reg) => {
                      const swimmerName = (reg.participant?.name || "").toUpperCase();
                      const sex = getSex(reg.participant?.gender || reg.swimming_event?.gender);
                      const ag = getAG(reg.swimming_event?.age_group || reg.participant?.age_group, reg.participant?.birth_date);
                      const yob = getYOB(reg.participant?.birth_date);
                      const eventNo = reg.swimming_event?.event_code || "-";
                      const stroke = getStrokeDisplay(reg.swimming_event);
                      const seedTime = getSeedTime(reg.time_seed);

                      return (
                        <tr
                          key={reg.id}
                          className="hover:bg-slate-50/80 transition print:hover:bg-transparent"
                        >
                          {/* SWIMMER NAME */}
                          <td className="py-2.5 px-4 pl-5 font-black text-slate-900 tracking-wide uppercase print:text-black">
                            {swimmerName}
                          </td>

                          {/* SEX (PA / PI) */}
                          <td className="py-2.5 px-3 text-center font-mono font-black text-slate-800 print:text-black">
                            {sex}
                          </td>

                          {/* AG */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 print:text-black">
                            {ag}
                          </td>

                          {/* YOB */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 print:text-black">
                            {yob}
                          </td>

                          {/* EVENT NO */}
                          <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700 print:text-black">
                            {eventNo}
                          </td>

                          {/* STROKE */}
                          <td className="py-2.5 px-4 font-bold text-slate-800 uppercase print:text-black">
                            {stroke}
                          </td>

                          {/* SEED TIME */}
                          <td className="py-2.5 px-3 pr-5 text-center font-mono font-bold text-slate-800 print:text-black">
                            {seedTime}
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
      ) : (
        /* MODE 2: FLAT LIST OF ALL ENTRIES */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none print:overflow-visible">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-800 font-black uppercase text-[11px] tracking-wide print:bg-transparent print:border-b-2 print:border-black print:text-black">
                  <th className="py-2.5 px-4 pl-5">SWIMMER NAME</th>
                  <th className="py-2.5 px-3 text-center w-14">SEX</th>
                  <th className="py-2.5 px-3 text-center w-12">AG</th>
                  <th className="py-2.5 px-3 text-center w-16">YOB</th>
                  <th className="py-2.5 px-4">KLUB / SEKOLAH</th>
                  <th className="py-2.5 px-3 text-center w-24">EVENT NO</th>
                  <th className="py-2.5 px-4">STROKE</th>
                  <th className="py-2.5 px-3 pr-5 text-center w-28">SEED TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans print:divide-y-0">
                {filteredRegistrations.map((reg) => {
                  const swimmerName = (reg.participant?.name || "").toUpperCase();
                  const sex = getSex(reg.participant?.gender || reg.swimming_event?.gender);
                  const ag = getAG(reg.swimming_event?.age_group || reg.participant?.age_group, reg.participant?.birth_date);
                  const yob = getYOB(reg.participant?.birth_date);
                  const club = (reg.participant?.club || "-").toUpperCase();
                  const eventNo = reg.swimming_event?.event_code || "-";
                  const stroke = getStrokeDisplay(reg.swimming_event);
                  const seedTime = getSeedTime(reg.time_seed);

                  return (
                    <tr
                      key={reg.id}
                      className="hover:bg-slate-50/80 transition print:hover:bg-transparent"
                    >
                      <td className="py-2.5 px-4 pl-5 font-black text-slate-900 tracking-wide uppercase print:text-black">
                        {swimmerName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-800 print:text-black">
                        {sex}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 print:text-black">
                        {ag}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 print:text-black">
                        {yob}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-700 uppercase print:text-black">
                        {club}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700 print:text-black">
                        {eventNo}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800 uppercase print:text-black">
                        {stroke}
                      </td>
                      <td className="py-2.5 px-3 pr-5 text-center font-mono font-bold text-slate-800 print:text-black">
                        {seedTime}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
