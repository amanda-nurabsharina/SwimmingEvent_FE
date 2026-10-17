"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  registration_code?: string;
  heat: number;
  heat_label?: string;
  heat_category?: string;
  line: number;
  nama: string;
  jenis_kelamin: string;
  club: string;
  birth_date?: string;
  age_group?: string;
  time_seed: string;
  result: string;
  rank?: number;
  is_empty: boolean;
  is_finalist?: boolean;
  schedule_date?: string;
  schedule_time?: string;
}

function formatIndonesianDate(dateStr?: string, fallbackDate?: string): string {
  if (!dateStr || !dateStr.trim()) {
    if (fallbackDate && fallbackDate.trim()) return formatIndonesianDate(fallbackDate);
    return "1 OKTOBER 2026";
  }
  const months = [
    "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
    "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
  ];
  const parts = dateStr.trim().split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const year = parts[0];
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (month >= 0 && month < 12) {
        return `${day} ${months[month]} ${year}`;
      }
    } else if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parts[2];
      if (month >= 0 && month < 12) {
        return `${day} ${months[month]} ${year}`;
      }
    }
  }
  return dateStr.toUpperCase();
}

function formatLahirAndAge(birthDate?: string, scheduleDate?: string): string {
  if (!birthDate || !birthDate.trim() || birthDate === "-") return "-";
  const bParts = birthDate.split(/[-/]/).map(Number);
  if (bParts.length < 3 || isNaN(bParts[0]) || isNaN(bParts[1]) || isNaN(bParts[2])) {
    const match = birthDate.match(/(\d{4})/);
    if (!match) return birthDate;
    const birthYear = parseInt(match[1], 10);
    return `${birthYear}`;
  }
  const bYear = bParts[0];
  const bMonth = bParts[1];
  const bDay = bParts[2];

  let refYear = new Date().getFullYear();
  let refMonth = new Date().getMonth() + 1;
  let refDay = new Date().getDate();

  if (scheduleDate) {
    const sParts = scheduleDate.split(/[-/]/).map(Number);
    if (sParts.length >= 3 && !isNaN(sParts[0]) && !isNaN(sParts[1]) && !isNaN(sParts[2])) {
      refYear = sParts[0];
      refMonth = sParts[1];
      refDay = sParts[2];
    } else {
      const sMatch = scheduleDate.match(/(\d{4})/);
      if (sMatch) refYear = parseInt(sMatch[1], 10);
    }
  }

  let age = refYear - bYear;
  if (refMonth < bMonth || (refMonth === bMonth && refDay < bDay)) {
    age--;
  }
  age = Math.max(0, age);
  return `${bYear} (${age})`;
}

function getEventDisplayName(event: EventGroup): string {
  const dist = (event.distance || "").toUpperCase().replace(/ETER/g, "").trim();
  let strk = (event.stroke || event.event_name || "").toUpperCase().trim();

  if (strk === "FREESTYLE") strk = "GAYA BEBAS";
  else if (strk === "BREASTSTROKE") strk = "GAYA DADA";
  else if (strk === "BACKSTROKE") strk = "GAYA PUNGGUNG";
  else if (strk === "BUTTERFLY") strk = "GAYA KUPU-KUPU";
  else if (strk === "INDIVIDUALMEDLEY" || strk === "MEDLEY") strk = "GAYA GANTI PERORANGAN";
  else if (strk === "FREESTYLE_FIN") strk = "GAYA BEBAS FIN";
  else if (strk === "BACKSTROKE_FIN") strk = "GAYA PUNGGUNG FIN";
  else if (strk === "BUTTERFLY_FIN") strk = "GAYA KUPU-KUPU FIN";
  else if (strk === "KICKING_BOARD") strk = "KICKING BOARD";

  const parts: string[] = [];
  if (dist && !strk.includes(dist)) {
    parts.push(dist);
  }
  parts.push(strk);

  const g = (event.gender || "").toUpperCase().trim();
  if (g && !strk.includes(g)) {
    parts.push(g);
  }

  return `${parts.join(" ")}, SCM`;
}

function isZeroOrEmptyTime(timeStr?: string): boolean {
  if (!timeStr) return true;
  const clean = timeStr.trim().toUpperCase();
  if (clean === "" || clean === "-" || clean === "NT" || clean === "OK") return true;
  if (clean.includes("DQ") || clean.includes("DNF") || clean.includes("DNS")) return false;
  return !/[1-9]/.test(clean);
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
  schedule_date?: string;
  schedule_time?: string;
  heat_category?: string;
  max_lanes: number;
  round?: string;
  heats: HeatItem[];
}

function parseEventCodeNum(code: any): number {
  if (typeof code === "number") return isNaN(code) ? 0 : code;
  if (!code) return 0;
  const num = parseInt(String(code).replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? 0 : num;
}

function compareEventCode(aCode: any, bCode: any, desc = false): number {
  const numA = parseEventCodeNum(aCode);
  const numB = parseEventCodeNum(bCode);
  if (numA !== numB) {
    return desc ? numB - numA : numA - numB;
  }
  const strA = String(aCode ?? "");
  const strB = String(bCode ?? "");
  return desc
    ? strB.localeCompare(strA, undefined, { numeric: true })
    : strA.localeCompare(strB, undefined, { numeric: true });
}

function parseDateTimeWeight(dateStr?: string, timeStr?: string): number {
  let dateWeight = 0;
  if (dateStr && String(dateStr).trim()) {
    const trimmed = String(dateStr).trim();
    const matchYMD = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (matchYMD) {
      const yr = parseInt(matchYMD[1], 10) || 2026;
      const mo = parseInt(matchYMD[2], 10) || 1;
      const da = parseInt(matchYMD[3], 10) || 1;
      dateWeight = (yr * 10000 + mo * 100 + da) * 86400000;
    } else {
      const matchDMY = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (matchDMY) {
        const da = parseInt(matchDMY[1], 10) || 1;
        const mo = parseInt(matchDMY[2], 10) || 1;
        const yr = parseInt(matchDMY[3], 10) || 2026;
        dateWeight = (yr * 10000 + mo * 100 + da) * 86400000;
      } else {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) dateWeight = d.getTime();
      }
    }
  }

  let timeWeight = 0;
  if (timeStr && String(timeStr).trim()) {
    const match = String(timeStr).trim().match(/(\d{1,2})[:.](\d{1,2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      timeWeight = h * 3600000 + m * 60000;
    }
  }

  return dateWeight + timeWeight;
}

function BukuAcaraContent() {
  const searchParams = useSearchParams();
  const urlTourneyId = searchParams.get("tournament_id");
  const urlTab = searchParams.get("tab");

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(0);

  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // View Tab State ("bagan" vs "juara")
  const [activeTab, setActiveTab] = useState<"bagan" | "juara">(
    urlTab === "juara" ? "juara" : "bagan"
  );

  // Sub-filters (Cascaded from tournament)
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStroke, setSelectedStroke] = useState<string>("ALL");
  const [selectedDistance, setSelectedDistance] = useState<string>("ALL");
  const [selectedKU, setSelectedKU] = useState<string>("ALL");
  const [selectedEventCode, setSelectedEventCode] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [selectedTime, setSelectedTime] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"time_asc" | "time_desc" | "code_asc" | "code_desc">("time_asc");
  const [search, setSearch] = useState("");

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
        if (urlTab === "juara" || urlTab === "bagan") {
          setActiveTab(urlTab);
        }
      }
    }
    loadTourneys();
  }, [urlTourneyId, urlTab]);

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
    const dates = new Set<string>();
    const times = new Set<string>();
    const eventCodes: { code: number; name: string; gender: string; age_group?: string }[] = [];

    eventGroups.forEach((eg) => {
      if (eg.schedule_date) dates.add(eg.schedule_date.trim());
      if (eg.schedule_time) times.add(eg.schedule_time.trim());
      if (eg.stroke) strokes.add(eg.stroke.trim());
      if (eg.distance) distances.add(eg.distance.trim());
      if (eg.age_group) ageGroups.add(eg.age_group.trim());
      eventCodes.push({ code: eg.event_code, name: eg.event_name, gender: eg.gender, age_group: eg.age_group });
    });

    eventCodes.sort((a, b) => compareEventCode(a.code, b.code, false));

    const kuOrder = ["KU 6A", "KU 6B", "KU 5", "KU 4", "KU 3", "KU 2", "KU 1", "SENIOR", "OPEN", "TERBUKA"];
    const sortedAgeGroups = Array.from(ageGroups).sort((a, b) => {
      const idxA = kuOrder.findIndex((k) => a.toUpperCase().includes(k));
      const idxB = kuOrder.findIndex((k) => b.toUpperCase().includes(k));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    const sortedDates = Array.from(dates).sort();
    const sortedTimes = Array.from(times).sort((a, b) => {
      return parseDateTimeWeight("", a) - parseDateTimeWeight("", b);
    });

    return {
      strokes: Array.from(strokes),
      distances: Array.from(distances),
      ageGroups: sortedAgeGroups,
      dates: sortedDates,
      times: sortedTimes,
      eventCodes,
    };
  }, [eventGroups]);

  // Filter & Sorting logic
  const filteredEvents = useMemo(() => {
    const filtered = eventGroups.filter((event) => {
      // 0. Filter Tipe Bagan (Heat vs Group)
      if (selectedCategory !== "ALL") {
        const isEvtGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
        if (selectedCategory === "GROUP" && !isEvtGroup) return false;
        if (selectedCategory === "HEAT" && isEvtGroup) return false;
      }

      // 0b. Filter Tanggal (Date)
      if (selectedDate !== "ALL" && (event.schedule_date || "").trim() !== selectedDate.trim()) {
        return false;
      }

      // 0c. Filter Waktu (Time)
      if (selectedTime !== "ALL" && (event.schedule_time || "").trim() !== selectedTime.trim()) {
        return false;
      }

      // 1. Filter Gaya Renang (Stroke)
      if (selectedStroke !== "ALL") {
        const s = (event.stroke || "").toUpperCase();
        const n = (event.event_name || "").toUpperCase();
        const target = selectedStroke.toUpperCase();
        if (target === "FREESTYLE_FIN") {
          if ((s.includes("BACK") || s.includes("PUNGGUNG") || s.includes("KUPU") || s.includes("FLY") || s.includes("BUTTERFLY")) ||
              (n.includes("BACK") || n.includes("PUNGGUNG") || n.includes("KUPU") || n.includes("FLY") || n.includes("BUTTERFLY"))) return false;
          if (!s.includes("FIN") && !n.includes("FIN")) return false;
        } else if (target === "BACKSTROKE_FIN") {
          if (!s.includes("FIN") && !n.includes("FIN")) return false;
          if (!s.includes("BACK") && !s.includes("PUNGGUNG") && !n.includes("BACK") && !n.includes("PUNGGUNG")) return false;
        } else if (target === "BUTTERFLY_FIN") {
          if (!s.includes("FIN") && !n.includes("FIN")) return false;
          if (!s.includes("BUTTERFLY") && !s.includes("KUPU") && !s.includes("FLY") && !n.includes("BUTTERFLY") && !n.includes("KUPU") && !n.includes("FLY")) return false;
        } else if (target === "KICKING_BOARD") {
          if (!s.includes("KICK") && !s.includes("BOARD") && !n.includes("KICK") && !n.includes("BOARD") && !n.includes("PAPAN")) return false;
        } else if (target === "FREESTYLE") {
          if (s.includes("FIN") || n.includes("FIN")) return false;
          if (!s.includes("FREE") && !s.includes("BEBAS") && !n.includes("FREE") && !n.includes("BEBAS")) return false;
        } else if (target === "BACKSTROKE") {
          if (s.includes("FIN") || n.includes("FIN")) return false;
          if (!s.includes("BACK") && !s.includes("PUNGGUNG") && !n.includes("BACK") && !n.includes("PUNGGUNG")) return false;
        } else if (target === "BUTTERFLY") {
          if (s.includes("FIN") || n.includes("FIN")) return false;
          if (!s.includes("BUTTERFLY") && !s.includes("KUPU") && !s.includes("FLY") && !n.includes("BUTTERFLY") && !n.includes("KUPU") && !n.includes("FLY")) return false;
        } else {
          if (!s.includes(target) && !n.includes(target)) return false;
        }
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

    // Sorting berdasarkan Waktu Mulai atau Nomor Lomba
    return filtered.sort((a, b) => {
      if (sortBy === "time_asc") {
        const wtA = parseDateTimeWeight(a.schedule_date, a.schedule_time);
        const wtB = parseDateTimeWeight(b.schedule_date, b.schedule_time);
        if (wtA !== wtB) return wtA - wtB;
        return compareEventCode(a.event_code, b.event_code, false);
      }
      if (sortBy === "time_desc") {
        const wtA = parseDateTimeWeight(a.schedule_date, a.schedule_time);
        const wtB = parseDateTimeWeight(b.schedule_date, b.schedule_time);
        if (wtA !== wtB) return wtB - wtA;
        return compareEventCode(a.event_code, b.event_code, true);
      }
      if (sortBy === "code_desc") {
        return compareEventCode(a.event_code, b.event_code, true);
      }
      return compareEventCode(a.event_code, b.event_code, false);
    });
  }, [
    eventGroups,
    selectedCategory,
    selectedDate,
    selectedTime,
    sortBy,
    selectedStroke,
    selectedDistance,
    selectedKU,
    selectedEventCode,
    selectedGender,
    search,
  ]);

  const resetFilters = () => {
    setSelectedCategory("ALL");
    setSelectedStroke("ALL");
    setSelectedDistance("ALL");
    setSelectedKU("ALL");
    setSelectedEventCode("ALL");
    setSelectedGender("ALL");
    setSelectedDate("ALL");
    setSelectedTime("ALL");
    setSortBy("time_asc");
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
    <div className="py-10 bg-slate-50 min-h-screen print:py-0 print:bg-white">
      {/* Global Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: a4 portrait;
            margin: 7mm 6mm;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 9.5px !important;
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          aside, nav, header, footer {
            display: none !important;
          }
          .print-meet-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
            margin-bottom: 6px !important;
          }
          .print-event-section {
            break-inside: auto !important;
            page-break-inside: auto !important;
            margin-bottom: 12px !important;
          }
          .print-event-title-block {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          .print-heat-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 4px !important;
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
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 print:space-y-0 print:px-0 print:max-w-none">
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
              {currentTournament?.name || "MASC KOTA TANGERANG"}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
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

                {/* Sub-Filter: Tanggal Lomba */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-sky-600" /> Tanggal
                  </label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">Semua Tanggal</option>
                    {dynamicFilterOptions.dates.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-Filter: Waktu Mulai */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" /> Waktu Mulai
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="ALL">Semua Waktu</option>
                    {dynamicFilterOptions.times.map((tm) => (
                      <option key={tm} value={tm}>
                        {tm}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-Filter: Urutkan */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" /> Urutkan
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-sky-50 border border-sky-300 rounded-xl px-2.5 py-2 text-xs font-black text-sky-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="time_asc">⏰ Waktu: Terpagi → Tersore</option>
                    <option value="time_desc">⏰ Waktu: Tersore → Terpagi</option>
                    <option value="code_asc">🔢 Nomor: #101 → Terbesar</option>
                    <option value="code_desc">🔢 Nomor: Terbesar → Terkecil</option>
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
                    <option value="FREESTYLE_FIN">Freestyle FIN</option>
                    <option value="KICKING_BOARD">Kicking Board</option>
                    <option value="BREASTSTROKE">Gaya Dada (Breaststroke)</option>
                    <option value="BACKSTROKE">Gaya Punggung (Backstroke)</option>
                    <option value="BACKSTROKE_FIN">Backstroke Fins</option>
                    <option value="BUTTERFLY">Gaya Kupu-kupu (Butterfly)</option>
                    <option value="BUTTERFLY_FIN">Butterfly Fins</option>
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
                    <option value="25">25 Meter</option>
                    <option value="50">50 Meter</option>
                    <option value="100">100 Meter</option>
                    <option value="200">200 Meter</option>
                    <option value="400">400 Meter</option>
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
                  selectedDate !== "ALL" ||
                  selectedTime !== "ALL" ||
                  sortBy !== "time_asc" ||
                  search !== "") && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
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
            {/* Official Printable Header for Juara */}
            {activeTab === "juara" && (
              <div className="hidden print:block text-center mb-4 border-b-2 border-black pb-2 print-header-banner">
                <h1 className="text-xl font-black uppercase tracking-wider text-black">
                  HASIL JUARA &amp; PODIUM
                </h1>
                <h2 className="text-base font-black uppercase mt-0.5 text-black">
                  {currentTournament?.name || "TIME TRIAL 2025"}
                </h2>
                <p className="text-xs font-bold uppercase text-slate-700 mt-0.5">
                  {currentTournament?.name || "KEJUARAAN RENANG RESMI"}
                </p>
              </div>
            )}

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
              <>
                <div className="space-y-4 print:hidden">
                {filteredEvents.map((event, eventIdx) => {
                  const isPutri =
                    event.gender?.toUpperCase() === "PUTRI" ||
                    event.gender?.toUpperCase() === "WANITA" ||
                    event.gender?.toUpperCase() === "PEREMPUAN" ||
                    event.gender?.toUpperCase() === "FEMALE" ||
                    event.gender?.toUpperCase() === "W" ||
                    event.gender?.toUpperCase() === "P";
                  const isGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
                  const heatGroups = groupHeatsByNumber(event.heats || []);

                  return (
                    <div
                      key={`${event.event_id || ""}-${event.event_code || ""}-${eventIdx}`}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print-event-block print:shadow-none print:border-black print:rounded-none print:overflow-visible"
                    >
                      {/* Event Header Banner */}
                      <div className={`px-4 py-2.5 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 text-white border-b print-event-header ${
                        isPutri
                          ? "bg-slate-900 border-rose-900/50"
                          : "bg-slate-900 border-sky-900/50"
                      }`}>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className={`px-2.5 py-1 rounded-lg font-mono text-xs sm:text-sm font-black shrink-0 shadow-inner border ${
                            isPutri
                              ? "bg-rose-950/60 border-rose-800/80 text-rose-400"
                              : "bg-slate-800 border-slate-700 text-sky-400"
                          }`}>
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
                            <span className={`${isPutri ? "bg-rose-600" : "bg-sky-600"} text-white text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase shadow-xs`}>
                              HEAT ANGKA
                            </span>
                          )}
                          {/* Tanggal & Waktu Mulai Nomor Lomba */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-sky-400/20 text-sky-200 border border-sky-300/30 text-[11px] px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-sky-300" />
                              {event.schedule_date || currentTournament?.event_start_date || "2026-10-01"}
                            </span>
                            <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[11px] px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-300" />
                              {event.schedule_time || "08:00 WIB"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-black">
                          <span className={`px-3 py-0.5 rounded-full border font-black uppercase tracking-wider text-[11px] ${
                            isPutri
                              ? "bg-rose-600/30 text-rose-300 border-rose-500/50 shadow-xs"
                              : "bg-sky-600/30 text-sky-300 border-sky-500/50 shadow-xs"
                          }`}>
                            {event.gender}
                          </span>
                        </div>
                      </div>

                      {/* Compact Separated Heat/Group Cards */}
                      <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50 print:p-0 print:space-y-0 print:bg-transparent">
                        {heatGroups.map((group) => {
                          const activeSwimmers = group.items.filter((i) => !i.is_empty && i.nama !== "(KOSONG)");
                          const labelDisplay = isGroup
                            ? group.heatLabel || String.fromCharCode(64 + group.heatNum)
                            : group.heatNum;

                          return (
                            <div
                              key={group.heatNum}
                              className={`bg-white rounded-xl border shadow-2xs overflow-hidden print-heat-card print:rounded-none print:border-none print:shadow-none ${
                                isPutri ? "border-rose-100" : "border-slate-200/90"
                              }`}
                            >
                              {/* Subheader */}
                              <div className={`px-3.5 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 print:bg-slate-200 ${
                                isPutri
                                  ? "bg-rose-50/80 border-rose-200/70"
                                  : "bg-slate-100/90 border-slate-200"
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider ${
                                      isGroup
                                        ? "bg-purple-600 text-white shadow-xs"
                                        : isPutri
                                        ? "bg-rose-600 text-white shadow-xs"
                                        : "bg-sky-600 text-white shadow-xs"
                                    }`}
                                  >
                                    {isGroup ? `GROUP ${labelDisplay}` : `SERI (HEAT) ${group.heatNum}`}
                                  </span>
                                  <span className={`text-[11px] font-bold ${isPutri ? "text-rose-950" : "text-slate-700"}`}>
                                    {isGroup ? `Kelompok Group ${labelDisplay}` : `Seri ${group.heatNum}`}
                                    <span className="mx-1.5 text-slate-300">•</span>
                                    <span className={`font-medium ${isPutri ? "text-rose-700/80" : "text-slate-500"}`}>{activeSwimmers.length} Atlet Terdaftar</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1 shadow-2xs">
                                    <Clock className="w-2.5 h-2.5 text-sky-600" />
                                    <span>Mulai: {event.schedule_time || "08:00 WIB"}</span>
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border bg-white print:hidden ${
                                    isPutri ? "text-rose-700 border-rose-200" : "text-slate-500 border-slate-200"
                                  }`}>
                                    Kapasitas {event.max_lanes || 3} Lintasan
                                  </span>
                                </div>
                              </div>

                              {/* Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className={`font-black uppercase tracking-wider border-b text-[10px] ${
                                      isPutri
                                        ? "bg-rose-50/90 text-rose-900 border-rose-200/80"
                                        : "bg-sky-50/80 text-sky-950 border-sky-200/80"
                                    }`}>
                                      <th className={`py-1.5 px-2.5 w-16 text-center border-r whitespace-nowrap ${isPutri ? "border-rose-100" : "border-slate-200"}`}>
                                        {isGroup ? "GROUP" : "SERI"}
                                      </th>
                                      <th className={`py-1.5 px-2.5 w-12 text-center border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>LINE</th>
                                      <th className={`py-1.5 px-3 border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>NAMA PERENANG</th>
                                      <th className={`py-1.5 px-2.5 w-24 text-center border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>JENIS KELAMIN</th>
                                      <th className={`py-1.5 px-3 border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>CLUB</th>
                                      <th className={`py-1.5 px-2.5 w-24 text-center border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>TIME SEED</th>
                                      <th className={`py-1.5 px-3 w-28 text-center border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>WAKTU HASIL</th>
                                      <th className="py-1.5 px-3 w-32 text-center">PERINGKAT</th>
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
                                          <td className="py-1.5 px-2.5 text-center font-black text-slate-800 border-r border-slate-100 whitespace-nowrap">
                                            <span
                                              className={`inline-flex items-center justify-center whitespace-nowrap min-w-[3rem] px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide ${
                                                isGroup ? "bg-purple-100 text-purple-900 border border-purple-200/80 shadow-2xs" : "bg-sky-100 text-sky-900 border border-sky-200/80 shadow-2xs"
                                              }`}
                                            >
                                              {isGroup ? `Grp ${rowLabel}` : `H${item.heat}`}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-2.5 text-center font-black text-slate-900 border-r border-slate-100">
                                            <span
                                              className={`w-6 h-6 rounded-md font-black text-[11px] inline-flex items-center justify-center ${
                                                isEmpty ? "bg-slate-200 text-slate-500" : "bg-slate-900 text-white"
                                              }`}
                                            >
                                              {item.line}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-3 font-black uppercase text-slate-900 border-r border-slate-100">
                                            {isEmpty ? <span className="text-slate-400 italic font-normal text-xs">(LINTASAN KOSONG)</span> : item.nama}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-center font-semibold uppercase text-slate-700 border-r border-slate-100 text-xs">
                                            {isEmpty ? "-" : item.jenis_kelamin}
                                          </td>
                                          <td className="py-1.5 px-3 font-semibold uppercase text-slate-800 border-r border-slate-100 text-xs">
                                            {isEmpty ? "-" : item.club}
                                          </td>
                                          <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-700 border-r border-slate-100 text-xs">
                                            {isEmpty ? "-" : item.time_seed}
                                          </td>
                                          <td className="py-1.5 px-3 text-center font-mono font-black border-r border-slate-100">
                                            {isEmpty ? (
                                              <span className="text-slate-300 font-bold text-xs">-</span>
                                            ) : item.result && item.result !== "-" ? (
                                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-black text-xs border border-blue-100">
                                                {item.result}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 font-bold text-xs">-</span>
                                            )}
                                          </td>
                                          <td className="py-1.5 px-3 text-center">
                                            {!isEmpty && item.rank && item.rank > 0 ? (
                                              isGroup ? (
                                                item.rank === 1 ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-xs bg-purple-100 border border-purple-300 text-purple-900 shadow-xs">
                                                    ★ Juara Group ({rowLabel})
                                                  </span>
                                                ) : (
                                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold text-xs">
                                                    Rank {item.rank}
                                                  </span>
                                                )
                                              ) : item.rank === 1 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-400 border border-amber-500 text-amber-950 rounded-md font-black text-xs shadow-xs">
                                                  🥇 Juara 1 (Emas)
                                                </span>
                                              ) : item.rank === 2 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 border border-slate-300 text-slate-800 rounded-md font-black text-xs">
                                                  🥈 Juara 2 (Perak)
                                                </span>
                                              ) : item.rank === 3 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-700/20 border border-amber-700/40 text-amber-900 rounded-md font-black text-xs">
                                                  🥉 Juara 3 (Perunggu)
                                                </span>
                                              ) : (
                                                <span className="font-mono font-bold text-slate-600 text-xs">
                                                  #{item.rank}
                                                </span>
                                              )
                                            ) : (
                                              <span className="text-slate-300 font-bold text-xs">-</span>
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

              {/* ============================================================ */}
              {/* DENSE OFFICIAL PRINT-ONLY VIEW (PB PRSI MEET PROGRAM)        */}
              {/* ============================================================ */}
              <div className="hidden print:block space-y-3">
                {/* Top Document Header */}
                <div className="text-center pb-2 mb-3 border-b-2 border-black print-meet-header">
                  <h1 className="text-xl font-bold uppercase tracking-widest text-black font-serif">
                    Buku Acara
                  </h1>
                  <p className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                    {currentTournament?.name || "KEJUARAAN RENANG"}
                  </p>
                </div>

                {/* Events Stream */}
                {filteredEvents.map((event, eventIdx) => {
                  const isGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
                  const heatGroups = groupHeatsByNumber(event.heats || []);

                  return (
                    <div
                      key={`print-${event.event_id || ""}-${event.event_code || ""}-${eventIdx}`}
                      className="print-event-section mb-3"
                    >
                      {/* Event Header Banner (Exact official PB PRSI format) */}
                      <div className="border-b-2 border-black pb-1 mb-1 print-event-title-block">
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-sm font-black text-black">
                              Acara {event.event_code}
                            </div>
                            <div className="text-[10px] font-bold text-black uppercase tracking-wide">
                              {formatIndonesianDate(event.schedule_date, currentTournament?.event_start_date)}
                            </div>
                          </div>
                          <div className="text-center font-black text-xs text-black uppercase tracking-wider">
                            {getEventDisplayName(event)}
                          </div>
                          <div className="text-right font-black text-xs text-black uppercase">
                            {event.round === "preliminary" ? "PENYISIHAN" : "AKHIR"}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-[9.5px] font-bold text-black border-t border-black pt-0.5 mt-1">
                          <span className="w-28">Limit Perlombaan</span>
                          <span>NO LIMIT ({event.age_group ? event.age_group.toUpperCase() : "OPEN"})</span>
                        </div>
                      </div>

                      {/* Dense Heats Listing */}
                      <div className="space-y-1">
                        {heatGroups.map((group) => {
                          const labelDisplay = isGroup
                            ? group.heatLabel || String.fromCharCode(64 + group.heatNum)
                            : String(group.heatNum).padStart(2, "0");
                          const badgeText = isGroup ? `Group ${labelDisplay}` : `Seri ${labelDisplay}`;

                          return (
                            <div key={`print-heat-${group.heatNum}`} className="print-heat-block">
                              <table className="w-full border-collapse text-[9px] leading-tight">
                                <thead>
                                  <tr className="border-b border-black text-black font-bold">
                                    <th className="py-0.5 px-1 text-center w-6">Ln</th>
                                    <th className="py-0.5 px-1 text-left w-14">ID</th>
                                    <th className="py-0.5 px-1 text-left">Nama Atlet</th>
                                    <th className="py-0.5 px-1 text-center w-8">Ket</th>
                                    <th className="py-0.5 px-1 text-center w-16">Lahir</th>
                                    <th className="py-0.5 px-1 text-center w-10">KU</th>
                                    <th className="py-0.5 px-1 text-left w-44">Nama Tim</th>
                                    <th className="py-0.5 px-1 text-right w-16">Prestasi</th>
                                    <th className="py-0.5 px-1 text-center w-20">ID Lomba</th>
                                    <th className="py-0.5 px-1 text-right w-28">
                                      <span className="inline-block border border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black bg-white">
                                        {badgeText}
                                      </span>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.items.map((item, rIdx) => {
                                    const isEmpty = item.is_empty || item.nama === "(KOSONG)";
                                    const hasResult = !isEmpty && item.result && item.result !== "-" && !isZeroOrEmptyTime(item.result);
                                    const isDisqualified = item.result && (item.result.includes("DQ") || item.result.includes("DNF") || item.result.includes("DNS"));
                                    return (
                                      <tr key={rIdx} className="text-black">
                                        <td className="py-0.5 px-1 text-center font-bold">{item.line}</td>
                                        <td className="py-0.5 px-1 text-left font-mono">
                                          {!isEmpty ? (item.registration_id || item.registration_code || "-") : ""}
                                        </td>
                                        <td className="py-0.5 px-1 text-left font-bold uppercase truncate max-w-[200px]">
                                          {isEmpty ? "-" : item.nama}
                                        </td>
                                        <td className="py-0.5 px-1 text-center">{!isEmpty ? "-" : ""}</td>
                                        <td className="py-0.5 px-1 text-center font-medium">
                                          {!isEmpty ? formatLahirAndAge(item.birth_date, event.schedule_date) : ""}
                                        </td>
                                        <td className="py-0.5 px-1 text-center font-bold uppercase">
                                          {!isEmpty ? (item.age_group || event.age_group || "-") : ""}
                                        </td>
                                        <td className="py-0.5 px-1 text-left font-medium uppercase truncate max-w-[165px]">
                                          {!isEmpty ? item.club : ""}
                                        </td>
                                        <td className="py-0.5 px-1 text-right font-mono">
                                          {!isEmpty
                                            ? item.time_seed && item.time_seed.trim() !== "" && item.time_seed !== "-"
                                              ? item.time_seed
                                              : "99.99.99"
                                            : ""}
                                        </td>
                                        <td className="py-0.5 px-1 text-center font-mono text-[8.5px]">
                                          {!isEmpty ? (item.registration_code || (currentTournament?.name ? `EV-${event.event_code}` : "-")) : ""}
                                        </td>
                                        <td className="py-0.5 px-1 text-right font-mono text-[8.5px] text-black">
                                          {hasResult ? (
                                            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                                              <span className="font-bold">
                                                {item.result.includes("DQ")
                                                  ? "DQ"
                                                  : item.result.includes("DNF")
                                                  ? "DNF"
                                                  : item.result.includes("DNS")
                                                  ? "DNS"
                                                  : item.result}
                                              </span>
                                              {item.rank && item.rank > 0 && !isDisqualified ? (
                                                <span className="font-sans font-black text-[7.5px] text-black">
                                                  ({item.rank <= 3 ? `Juara ${item.rank}` : `Rank ${item.rank}`})
                                                </span>
                                              ) : null}
                                            </div>
                                          ) : (
                                            <span className="text-slate-800">[ . . . . . . . . ]</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              <div className="border-b border-black mb-1" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BukuAcaraPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">Memuat Buku Acara &amp; Hasil Lomba...</div>}>
      <BukuAcaraContent />
    </Suspense>
  );
}
