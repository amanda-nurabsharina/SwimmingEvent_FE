"use client";

import { useEffect, useState, useMemo } from "react";
import { getBukuAcara, getTournaments } from "../../lib/api-client";
import {
  Download,
  RefreshCw,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  Layers,
  ArrowLeft,
  Printer,
  Trophy,
  Globe,
  Medal,
  Crown,
  Clock,
  CheckCircle,
  Lock,
  MapPin,
  ShieldCheck,
  Award,
} from "lucide-react";
import Link from "next/link";
import ChampionsView from "../../components/ChampionsView";

interface HeatItem {
  registration_id?: number;
  heat: number;
  heat_label?: string;
  heat_category?: string;
  line: number;
  nama: string;
  jenis_kelamin: string;
  club: string;
  time_seed: string;
  result: string;
  rank?: number;
  is_empty: boolean;
  is_finalist?: boolean;
}

interface EventGroup {
  event_id: number;
  tournament_id: number;
  event_code: number;
  event_name: string;
  distance: string;
  stroke: string;
  gender: string;
  age_group: string;
  heat_category?: string;
  max_lanes: number;
  round?: string;
  heats: HeatItem[];
}

export default function BukuAcaraPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(0);

  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // View Tab State ("bagan" vs "juara")
  const [activeTab, setActiveTab] = useState<"bagan" | "juara">("bagan");

  // Sub-filters (Cascaded from tournament)
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStroke, setSelectedStroke] = useState<string>("ALL");
  const [selectedDistance, setSelectedDistance] = useState<string>("ALL");
  const [selectedKU, setSelectedKU] = useState<string>("ALL");
  const [selectedEventCode, setSelectedEventCode] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // 1. Fetch tournaments on mount
  useEffect(() => {
    async function loadTourneys() {
      const res = await getTournaments();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setTournaments(res.data);
        const active = res.data.find((t: any) => t.is_active);
        setSelectedTournamentId(active ? active.id : res.data[0].id);
      }
    }
    loadTourneys();
  }, []);

  // 2. Fetch Buku Acara when tournament changes
  const fetchBukuAcara = async (tourneyId?: number) => {
    setLoading(true);
    const tid = tourneyId !== undefined ? tourneyId : selectedTournamentId;
    const res = await getBukuAcara(tid > 0 ? tid : undefined, "preliminary");
    if (res?.success) {
      setEventGroups(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTournamentId > 0) {
      fetchBukuAcara(selectedTournamentId);
    }
  }, [selectedTournamentId]);

  // Extract dynamic sub-filters available in the chosen tournament
  const dynamicFilterOptions = useMemo(() => {
    const strokes = new Set<string>();
    const distances = new Set<string>();
    const ageGroups = new Set<string>();
    const eventCodes: { code: number; name: string; gender: string; age_group?: string }[] = [];

    eventGroups.forEach((eg) => {
      if (eg.stroke) strokes.add(eg.stroke.trim());
      if (eg.distance) distances.add(eg.distance.trim());
      if (eg.age_group) ageGroups.add(eg.age_group.trim());
      eventCodes.push({ code: eg.event_code, name: eg.event_name, gender: eg.gender, age_group: eg.age_group });
    });

    eventCodes.sort((a, b) => a.code - b.code);

    const kuOrder = ["KU 5", "KU 4", "KU 3", "KU 2", "KU 1", "SENIOR", "OPEN", "TERBUKA"];
    const sortedAgeGroups = Array.from(ageGroups).sort((a, b) => {
      const idxA = kuOrder.findIndex((k) => a.toUpperCase().includes(k));
      const idxB = kuOrder.findIndex((k) => b.toUpperCase().includes(k));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return {
      strokes: Array.from(strokes),
      distances: Array.from(distances),
      ageGroups: sortedAgeGroups,
      eventCodes,
    };
  }, [eventGroups]);

  // Filter logic
  const filteredEvents = useMemo(() => {
    return eventGroups.filter((event) => {
      // 0. Filter Tipe Bagan (Heat vs Group)
      if (selectedCategory !== "ALL") {
        const isEvtGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
        if (selectedCategory === "GROUP" && !isEvtGroup) return false;
        if (selectedCategory === "HEAT" && isEvtGroup) return false;
      }

      // 1. Filter Gaya Renang (Stroke)
      if (selectedStroke !== "ALL") {
        const s = (event.stroke || "").toUpperCase();
        const n = (event.event_name || "").toUpperCase();
        const target = selectedStroke.toUpperCase();
        if (!s.includes(target) && !n.includes(target)) return false;
      }

      // 2. Filter Jarak (Distance)
      if (selectedDistance !== "ALL") {
        const d = (event.distance || "").toUpperCase();
        const n = (event.event_name || "").toUpperCase();
        const target = selectedDistance.toUpperCase();
        if (!d.includes(target) && !n.includes(target)) return false;
      }

      // 3. Filter Nomor Lomba
      if (selectedEventCode !== "ALL" && String(event.event_code) !== selectedEventCode) {
        return false;
      }

      // 4. Filter Gender
      if (selectedGender !== "ALL" && event.gender?.toUpperCase() !== selectedGender.toUpperCase()) {
        return false;
      }

      // 5. Filter Kelompok Umur (KU)
      if (selectedKU !== "ALL" && event.age_group?.toUpperCase() !== selectedKU.toUpperCase()) {
        return false;
      }

      // 6. Search query
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        const matchEv = event.event_name?.toLowerCase().includes(q) || String(event.event_code).includes(q);
        const matchSwimmer = event.heats?.some(
          (h) => !h.is_empty && (h.nama?.toLowerCase().includes(q) || h.club?.toLowerCase().includes(q))
        );
        if (!matchEv && !matchSwimmer) return false;
      }

      return true;
    });
  }, [eventGroups, selectedCategory, selectedStroke, selectedDistance, selectedKU, selectedEventCode, selectedGender, search]);

  const resetFilters = () => {
    setSelectedCategory("ALL");
    setSelectedStroke("ALL");
    setSelectedDistance("ALL");
    setSelectedKU("ALL");
    setSelectedEventCode("ALL");
    setSelectedGender("ALL");
    setSearch("");
  };

  const currentTournament = tournaments.find((t) => t.id === selectedTournamentId);
  const isPublished = Boolean(currentTournament?.is_buku_acara_published);

  // Group heats by heat number
  const groupHeatsByNumber = (heats: HeatItem[]) => {
    const map: { [heatNum: number]: HeatItem[] } = {};
    heats.forEach((h) => {
      if (!map[h.heat]) map[h.heat] = [];
      map[h.heat].push(h);
    });
    return Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b)
      .map((heatNum) => ({
        heatNum,
        heatLabel: map[heatNum][0]?.heat_label,
        items: map[heatNum].sort((a, b) => a.line - b.line),
      }));
  };

  return (
    <div className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation & Header */}
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
                DOKUMEN RESMI TURNAMEN
              </span>
              {isPublished ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> RESMI TERPUBLIKASI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  <Lock className="w-3 h-3 text-amber-600" /> DRAFT PANITIA
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">
              BUKU ACARA & HASIL PERTANDINGAN
            </h1>
            <p className="text-slate-600 font-bold text-xs sm:text-sm">
              AKUATIK INDONESIA KOTA TANGERANG
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchBukuAcara()}
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} /> Refresh
            </button>
            {isPublished && (
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-sky-400" /> Cetak / Export PDF
              </button>
            )}
          </div>
        </div>

        {/* Primary Filter: Tournament & Round Switcher */}
        <div className="no-print bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="w-full sm:w-auto flex-1 max-w-xl space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" /> Pilih Turnamen / Kejuaraan:
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => {
                  setSelectedTournamentId(Number(e.target.value));
                  resetFilters();
                }}
                className="w-full bg-slate-50 border-2 border-sky-300 rounded-2xl px-4 py-2.5 text-xs font-black text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_active ? "(Sedang Aktif)" : ""} {t.is_buku_acara_published ? "✓ Terpublikasi" : "(Draft)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Tab Switcher: Susunan Seri & Bagan vs Hasil Juara & Podium */}
            {isPublished && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setActiveTab("bagan")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    activeTab === "bagan"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Susunan Seri & Bagan
                </button>
                <button
                  onClick={() => setActiveTab("juara")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    activeTab === "juara"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-950" /> Hasil Juara & Podium 🏆
                </button>
              </div>
            )}
          </div>

          {/* Sub-Filters Grid (only active if published) */}
          {isPublished && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Sub-Filter: Tipe Bagan */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Tipe Bagan
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">Semua Tipe Bagan</option>
                    <option value="HEAT">Heat Angka (1, 2, 3...)</option>
                    <option value="GROUP">Group Abjad (A, B, C...)</option>
                  </select>
                </div>

                {/* Sub-Filter: Gaya Renang */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Gaya Renang
                  </label>
                  <select
                    value={selectedStroke}
                    onChange={(e) => setSelectedStroke(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">Semua Gaya Renang</option>
                    <option value="FREESTYLE">Gaya Bebas (Freestyle)</option>
                    <option value="BREASTSTROKE">Gaya Dada (Breaststroke)</option>
                    <option value="BACKSTROKE">Gaya Punggung (Backstroke)</option>
                    <option value="BUTTERFLY">Gaya Kupu-kupu (Butterfly)</option>
                    <option value="INDIVIDUALMEDLEY">Gaya Ganti Perorangan (IM)</option>
                  </select>
                </div>

                {/* Sub-Filter: Jarak */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Jarak Lomba
                  </label>
                  <select
                    value={selectedDistance}
                    onChange={(e) => setSelectedDistance(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">Semua Jarak</option>
                    <option value="50">50 Meter</option>
                    <option value="100">100 Meter</option>
                    <option value="200">200 Meter</option>
                    <option value="400">400 Meter</option>
                  </select>
                </div>

                {/* Sub-Filter: Kelompok Umur (KU) */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Kelompok Umur (KU)
                  </label>
                  <select
                    value={selectedKU}
                    onChange={(e) => setSelectedKU(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">Semua KU</option>
                    {dynamicFilterOptions.ageGroups.map((ku) => (
                      <option key={ku} value={ku}>
                        {ku}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-Filter: Nomor Lomba */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Nomor Lomba
                  </label>
                  <select
                    value={selectedEventCode}
                    onChange={(e) => setSelectedEventCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">Semua Nomor Lomba</option>
                    {dynamicFilterOptions.eventCodes.map((ev) => (
                      <option key={ev.code} value={String(ev.code)}>
                        {ev.code} - {ev.name} ({ev.gender})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-Filter: Gender */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Gender
                  </label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">Semua Gender</option>
                    <option value="PUTRA">Putra</option>
                    <option value="PUTRI">Putri</option>
                  </select>
                </div>
              </div>

              {/* Search bar & Reset */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama perenang atau klub..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {(selectedCategory !== "ALL" ||
                  selectedStroke !== "ALL" ||
                  selectedDistance !== "ALL" ||
                  selectedKU !== "ALL" ||
                  selectedEventCode !== "ALL" ||
                  selectedGender !== "ALL" ||
                  search !== "") && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Filter
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* NOT PUBLISHED NOTIFICATION CARD */}
        {!isPublished ? (
          <div className="bg-white border-2 border-amber-200 rounded-3xl p-10 text-center shadow-sm max-w-3xl mx-auto space-y-6">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700 shadow-inner">
              <Lock className="w-10 h-10" />
            </div>

            <div className="space-y-3">
              <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black uppercase px-3.5 py-1 rounded-full tracking-wider">
                Status: Belum Dipublikasikan Resmi
              </span>
              <h2 className="text-2xl font-black text-slate-900">
                Buku Acara Masih Dalam Tahap Penyusunan
              </h2>
              <p className="text-slate-600 text-sm font-medium max-w-xl mx-auto leading-relaxed">
                Panitia Kejuaraan Renang sedang memproses verifikasi atlet serta penetapan seri (heat) dan lintasan (line). 
                Bagan dan buku acara resmi akan segera dipublikasikan di halaman ini setelah proses pengundian final oleh komisi pertandingan.
              </p>
            </div>

            {currentTournament && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left max-w-lg mx-auto text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Turnamen</span>
                  <span className="font-extrabold text-slate-800">{currentTournament.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Lokasi Kolam</span>
                  <span className="font-extrabold text-slate-800">{currentTournament.location || "Kolam Renang Tirta Kencana"}</span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <p className="text-xs text-slate-400 font-medium">
                Silakan periksa kembali secara berkala menjelang hari pelaksanaan kompetisi.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Official Printable Header (Visible on Print Only) */}
            <div className="hidden print:block text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-xl font-black uppercase tracking-wider">
                BUKU ACARA {activeTab === "juara" ? "- HASIL JUARA & PODIUM" : "- SUSUNAN BAGAN & HEAT"}
              </h1>
              <h2 className="text-base font-black uppercase mt-0.5">
                {currentTournament?.name || "TIME TRIAL 2025"}
              </h2>
              <p className="text-xs font-bold uppercase text-slate-700 mt-0.5">
                AKUATIK INDONESIA KOTA TANGERANG
              </p>
            </div>

            {/* Main Content: Hasil Juara vs Susunan Bagan */}
            {activeTab === "juara" ? (
              <ChampionsView
                events={filteredEvents}
                tournamentName={currentTournament?.name}
                isPublic={true}
              />
            ) : loading ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto text-sky-600 animate-spin" />
                <p className="text-xs font-bold text-slate-500">Memuat data Buku Acara...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <Layers className="w-10 h-10 mx-auto text-slate-300" />
                <h3 className="text-sm font-black text-slate-700">Tidak ada nomor lomba yang sesuai filter</h3>
                <p className="text-xs text-slate-400 font-medium">
                  Silakan atur filter pencarian di atas.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {filteredEvents.map((event) => {
                  const isGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
                  const heatGroups = groupHeatsByNumber(event.heats || []);

                  return (
                    <div
                      key={event.event_code}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden page-break-inside-avoid print:shadow-none print:border-black print:rounded-none"
                    >
                      {/* Event Header Banner */}
                      <div className="bg-slate-900 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-white border-b border-slate-800">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl font-mono text-xs sm:text-sm font-black text-sky-400 shrink-0 shadow-inner">
                            EVENT #{event.event_code}
                          </div>
                          <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-white">
                            {event.distance} {event.stroke || event.event_name}
                          </h3>
                          {event.age_group && (
                            <span className="bg-white/10 text-white text-[11px] px-2.5 py-0.5 rounded-full font-black border border-white/20">
                              {event.age_group}
                            </span>
                          )}
                          {isGroup ? (
                            <span className="bg-purple-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase shadow-xs">
                              GROUP ABJAD
                            </span>
                          ) : (
                            <span className="bg-sky-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase shadow-xs">
                              HEAT ANGKA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-black">
                          <span className="px-3 py-1 bg-white/10 rounded-full border border-white/20 uppercase">
                            {event.gender}
                          </span>
                        </div>
                      </div>

                      {/* Spacious Separated Heat/Group Cards */}
                      <div className="p-4 sm:p-6 space-y-6 bg-slate-50/60 print:p-0 print:space-y-0 print:bg-transparent">
                        {heatGroups.map((group) => {
                          const activeSwimmers = group.items.filter((i) => !i.is_empty && i.nama !== "(KOSONG)");
                          const labelDisplay = isGroup
                            ? group.heatLabel || String.fromCharCode(64 + group.heatNum)
                            : group.heatNum;

                          return (
                            <div
                              key={group.heatNum}
                              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden print:rounded-none print:border-none print:shadow-none"
                            >
                              {/* Subheader */}
                              <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 print:bg-slate-200">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                                      isGroup ? "bg-purple-600 text-white shadow-xs" : "bg-sky-600 text-white shadow-xs"
                                    }`}
                                  >
                                    {isGroup ? `GROUP ${labelDisplay}` : `SERI (HEAT) ${group.heatNum}`}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700">
                                    {isGroup ? `Kelompok Group ${labelDisplay}` : `Seri ${group.heatNum}`}
                                    <span className="mx-1.5 text-slate-300">•</span>
                                    <span className="text-slate-500 font-medium">{activeSwimmers.length} Atlet Terdaftar</span>
                                  </span>
                                </div>
                                <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 print:hidden">
                                  Kapasitas {event.max_lanes || 3} Lintasan
                                </span>
                              </div>

                              {/* Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 font-black text-slate-600 uppercase tracking-wider border-b border-slate-200 text-[10px]">
                                      <th className="py-2.5 px-3 w-16 text-center border-r border-slate-200">
                                        {isGroup ? "GROUP" : "SERI"}
                                      </th>
                                      <th className="py-2.5 px-3 w-14 text-center border-r border-slate-200">LINE</th>
                                      <th className="py-2.5 px-4 border-r border-slate-200">NAMA PERENANG</th>
                                      <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200">JENIS KELAMIN</th>
                                      <th className="py-2.5 px-4 border-r border-slate-200">CLUB</th>
                                      <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200">TIME SEED</th>
                                      <th className="py-2.5 px-4 w-32 text-center border-r border-slate-200">WAKTU HASIL</th>
                                      <th className="py-2.5 px-4 w-36 text-center">PERINGKAT</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {group.items.map((item, rIdx) => {
                                      const isEmpty = item.is_empty || item.nama === "(KOSONG)";
                                      const rowLabel = isGroup
                                        ? item.heat_label || (group.heatLabel ? group.heatLabel : String.fromCharCode(64 + item.heat))
                                        : item.heat;

                                      return (
                                        <tr
                                          key={rIdx}
                                          className={`transition-colors ${
                                            isEmpty ? "bg-slate-50/40 text-slate-400" : "hover:bg-sky-50/40"
                                          }`}
                                        >
                                          <td className="py-2.5 px-3 text-center font-black text-slate-800 border-r border-slate-100">
                                            <span
                                              className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                                isGroup ? "bg-purple-100 text-purple-900" : "bg-sky-100 text-sky-900"
                                              }`}
                                            >
                                              {isGroup ? `Grp ${rowLabel}` : `H${item.heat}`}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-center font-black text-slate-900 border-r border-slate-100">
                                            <span
                                              className={`w-7 h-7 rounded-lg font-black text-xs inline-flex items-center justify-center ${
                                                isEmpty ? "bg-slate-200 text-slate-500" : "bg-slate-900 text-white"
                                              }`}
                                            >
                                              {item.line}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-4 font-black uppercase text-slate-900 border-r border-slate-100">
                                            {isEmpty ? <span className="text-slate-400 italic">(LINTASAN KOSONG)</span> : item.nama}
                                          </td>
                                          <td className="py-2.5 px-3 text-center font-semibold uppercase text-slate-700 border-r border-slate-100">
                                            {isEmpty ? "-" : item.jenis_kelamin}
                                          </td>
                                          <td className="py-2.5 px-4 font-semibold uppercase text-slate-800 border-r border-slate-100">
                                            {isEmpty ? "-" : item.club}
                                          </td>
                                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 border-r border-slate-100">
                                            {isEmpty ? "-" : item.time_seed}
                                          </td>
                                          <td className="py-2.5 px-4 text-center font-mono font-black border-r border-slate-100">
                                            {isEmpty ? (
                                              <span className="text-slate-300 font-bold">-</span>
                                            ) : item.result && item.result !== "-" ? (
                                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-black border border-blue-100">
                                                {item.result}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 font-bold text-xs">-</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-4 text-center">
                                            {!isEmpty && item.rank && item.rank > 0 ? (
                                              isGroup ? (
                                                item.rank === 1 ? (
                                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-xs bg-purple-100 border border-purple-300 text-purple-900 shadow-xs">
                                                    ★ Juara Group ({rowLabel})
                                                  </span>
                                                ) : (
                                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold text-xs">
                                                    Rank {item.rank}
                                                  </span>
                                                )
                                              ) : item.rank === 1 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-400 border border-amber-500 text-amber-950 rounded-lg font-black text-xs shadow-xs">
                                                  🥇 Juara 1 (Emas)
                                                </span>
                                              ) : item.rank === 2 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 border border-slate-300 text-slate-800 rounded-lg font-black text-xs">
                                                  🥈 Juara 2 (Perak)
                                                </span>
                                              ) : item.rank === 3 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-700/20 border border-amber-700/40 text-amber-900 rounded-lg font-black text-xs">
                                                  🥉 Juara 3 (Perunggu)
                                                </span>
                                              ) : (
                                                <span className="font-mono font-bold text-slate-600 text-xs">
                                                  #{item.rank}
                                                </span>
                                              )
                                            ) : (
                                              <span className="text-slate-300">-</span>
                                            )}
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
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
