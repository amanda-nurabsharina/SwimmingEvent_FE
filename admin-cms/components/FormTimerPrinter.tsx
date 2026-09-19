"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { getBukuAcara, lockTournamentBukuAcara } from "../lib/api-admin";
import {
  Printer,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Calendar,
  Clock,
  Settings2,
  FileText,
  Sliders,
  CheckCircle2,
  Eye,
  ArrowUpDown,
  Scissors,
  Check,
  RotateCcw,
  Lock,
  Unlock,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  Trophy,
} from "lucide-react";

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

export interface FormTimerSlip {
  uniqueId: string;
  tournamentName: string;
  eventDate: string;
  ageGroup: string;
  line: number;
  eventCode: number;
  eventName: string;
  distance: string;
  stroke: string;
  gender: string;
  heat: number;
  heatLabel?: string;
  heatCategory?: string;
  swimmerName: string;
  club: string;
  timeSeed: string;
  round: string;
  isEmpty: boolean;
}

interface FormTimerPrinterProps {
  tournaments?: any[];
  onRefresh?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function FormTimerPrinter({
  tournaments = [],
  onRefresh,
  onNavigateTab,
}: FormTimerPrinterProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(0);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockLoading, setLockLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Round selection
  const [selectedRound, setSelectedRound] = useState<"preliminary" | "final">("preliminary");

  // Filters
  const [selectedKU, setSelectedKU] = useState<string>("ALL");
  const [selectedStroke, setSelectedStroke] = useState<string>("ALL");
  const [selectedDistance, setSelectedDistance] = useState<string>("ALL");
  const [selectedEventCode, setSelectedEventCode] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedHeat, setSelectedHeat] = useState<string>("ALL");
  const [selectedLine, setSelectedLine] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Print Configuration States
  const [paperSize, setPaperSize] = useState<"A4" | "F4" | "Letter" | "Legal">("A4");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [gridCols, setGridCols] = useState<number>(3);
  const [gridRows, setGridRows] = useState<number>(2);
  const [sortMode, setSortMode] = useState<"by_heat" | "by_lane">("by_heat");
  const [includeEmptyLanes, setIncludeEmptyLanes] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [watermarkText, setWatermarkText] = useState<string>("Akuatik");
  const [customDate, setCustomDate] = useState<string>("");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customFooter, setCustomFooter] = useState<string>("* AI KOTA TANGERANG");

  // Initialize selected tournament
  useEffect(() => {
    if (tournaments.length > 0 && selectedTournamentId === 0) {
      const active = tournaments.find((t) => t.is_active);
      const chosen = active || tournaments[0];
      setSelectedTournamentId(chosen.id);
      if (chosen.event_start_date) {
        setCustomDate(chosen.event_start_date);
      }
      setCustomTitle(chosen.name || "TIME TRIAL 2025 AI KOTA TANGERANG");
    }
  }, [tournaments, selectedTournamentId]);

  // Load Buku Acara data
  const loadData = async (tourneyId?: number, round?: "preliminary" | "final") => {
    setLoading(true);
    const tid = tourneyId !== undefined ? tourneyId : selectedTournamentId;
    const rnd = round !== undefined ? round : selectedRound;
    const res = await getBukuAcara(tid > 0 ? tid : undefined, rnd);
    if (res?.success) {
      setEventGroups(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTournamentId > 0) {
      loadData(selectedTournamentId, selectedRound);
    }
  }, [selectedTournamentId, selectedRound]);

  const currentTournament = tournaments.find((t) => t.id === selectedTournamentId);
  const isBukuAcaraLocked = Boolean(currentTournament?.is_buku_acara_locked);

  const handleToggleLock = async (targetLock: boolean) => {
    if (selectedTournamentId <= 0) return;
    setLockLoading(true);
    const res = await lockTournamentBukuAcara(selectedTournamentId, targetLock);
    setLockLoading(false);

    if (res?.success) {
      setToastMessage({
        success: true,
        text: targetLock
          ? "🔒 Buku Acara berhasil dipatenkan & dikunci! Susunan seri dan lintasan atlet resmi menjadi FIX."
          : "🔓 Kunci Buku Acara telah dibuka (mode draft). Susunan seri dan lintasan dapat diubah kembali.",
      });
      if (onRefresh) onRefresh();
      loadData(selectedTournamentId, selectedRound);
    } else {
      setToastMessage({
        success: false,
        text: res?.message || "Gagal mengubah status kunci buku acara",
      });
    }
  };

  // Update default custom titles when tournament changes
  useEffect(() => {
    if (currentTournament) {
      if (currentTournament.event_start_date) {
        setCustomDate(currentTournament.event_start_date);
      }
      setCustomTitle(currentTournament.name || "TIME TRIAL 2025 AI KOTA TANGERANG");
    }
  }, [currentTournament]);

  // Sub-filter options
  const filterOptions = useMemo(() => {
    const strokes = new Set<string>();
    const distances = new Set<string>();
    const ageGroups = new Set<string>();
    const eventCodes: { code: number; name: string; gender: string; age_group: string }[] = [];
    const heats = new Set<number>();
    const lines = new Set<number>();

    eventGroups.forEach((eg) => {
      if (eg.stroke) strokes.add(eg.stroke.trim());
      if (eg.distance) distances.add(eg.distance.trim());
      if (eg.age_group) ageGroups.add(eg.age_group.trim().toUpperCase());
      eventCodes.push({ code: eg.event_code, name: eg.event_name, gender: eg.gender, age_group: eg.age_group });
      eg.heats?.forEach((h) => {
        if (h.heat > 0) heats.add(h.heat);
        if (h.line > 0) lines.add(h.line);
      });
    });

    eventCodes.sort((a, b) => a.code - b.code);

    const standardKUSort = ["KU 5", "KU 4", "KU 3", "KU 2", "KU 1", "SENIOR", "OPEN", "TERBUKA"];
    const sortedKUs = Array.from(ageGroups).sort((a, b) => {
      const ia = standardKUSort.indexOf(a);
      const ib = standardKUSort.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    return {
      strokes: Array.from(strokes),
      distances: Array.from(distances),
      eventCodes,
      ageGroups: sortedKUs,
      heats: Array.from(heats).sort((a, b) => a - b),
      lines: Array.from(lines).sort((a, b) => a - b),
    };
  }, [eventGroups]);

  // Flatten event groups and heats into individual slip items
  const allSlips = useMemo(() => {
    const list: FormTimerSlip[] = [];

    eventGroups.forEach((eg) => {
      // 0. Filter Kelompok Umur (KU)
      if (selectedKU !== "ALL" && eg.age_group?.toUpperCase() !== selectedKU.toUpperCase()) {
        return;
      }

      // 1. Filter Gaya Renang (Stroke)
      if (selectedStroke !== "ALL") {
        const s = (eg.stroke || "").toUpperCase();
        const n = (eg.event_name || "").toUpperCase();
        const target = selectedStroke.toUpperCase();
        if (!s.includes(target) && !n.includes(target)) return;
      }

      // 2. Filter Jarak (Distance)
      if (selectedDistance !== "ALL") {
        const d = (eg.distance || "").toUpperCase();
        const n = (eg.event_name || "").toUpperCase();
        const target = selectedDistance.toUpperCase();
        if (!d.includes(target) && !n.includes(target)) return;
      }

      // 3. Filter Nomor Lomba
      if (selectedEventCode !== "ALL" && String(eg.event_code) !== selectedEventCode) {
        return;
      }

      // 4. Filter Gender
      if (selectedGender !== "ALL" && eg.gender?.toUpperCase() !== selectedGender.toUpperCase()) {
        return;
      }

      // Group heats
      eg.heats?.forEach((h) => {
        // Filter Heat
        if (selectedHeat !== "ALL" && String(h.heat) !== selectedHeat) {
          return;
        }

        // Filter Line
        if (selectedLine !== "ALL" && String(h.line) !== selectedLine) {
          return;
        }

        const isEmpty = h.is_empty || !h.nama || h.nama === "(KOSONG)";

        // Check includeEmptyLanes
        if (!includeEmptyLanes && isEmpty) {
          return;
        }

        // Search query
        if (search.trim() !== "") {
          const q = search.toLowerCase();
          const matchEv = eg.event_name?.toLowerCase().includes(q) || String(eg.event_code).includes(q);
          const matchSwimmer = !isEmpty && (h.nama?.toLowerCase().includes(q) || h.club?.toLowerCase().includes(q));
          if (!matchEv && !matchSwimmer) return;
        }

        const isGroup = eg.heat_category === "GROUP" || eg.heat_category === "CLUSTER";
        const heatLabel = h.heat_label || (isGroup ? String.fromCharCode(64 + h.heat) : String(h.heat));

        list.push({
          uniqueId: `${eg.event_code}-${h.heat}-${h.line}`,
          tournamentName: customTitle || currentTournament?.name || "TIME TRIAL 2025",
          eventDate: customDate || currentTournament?.event_start_date || "23 Desember 2025",
          ageGroup: eg.age_group || "KU 1",
          line: h.line,
          eventCode: eg.event_code,
          eventName: eg.event_name,
          distance: eg.distance,
          stroke: eg.stroke,
          gender: eg.gender,
          heat: h.heat,
          heatLabel: heatLabel,
          heatCategory: eg.heat_category || "HEAT",
          swimmerName: isEmpty ? "" : h.nama,
          club: isEmpty ? "" : h.club,
          timeSeed: isEmpty ? "" : h.time_seed,
          round: selectedRound,
          isEmpty: isEmpty,
        });
      });
    });

    // Sorting
    if (sortMode === "by_lane") {
      // Group by Lane: All Lane 1 first, then all Lane 2, etc. (Great for Lane Timers)
      list.sort((a, b) => {
        if (a.line !== b.line) return a.line - b.line;
        if (a.eventCode !== b.eventCode) return a.eventCode - b.eventCode;
        return a.heat - b.heat;
      });
    } else {
      // Group by Event & Heat: Event 101 Heat 1 Line 1, 2, 3 -> Heat 2 Line 1, 2, 3
      list.sort((a, b) => {
        if (a.eventCode !== b.eventCode) return a.eventCode - b.eventCode;
        if (a.heat !== b.heat) return a.heat - b.heat;
        return a.line - b.line;
      });
    }

    return list;
  }, [
    eventGroups,
    selectedKU,
    selectedStroke,
    selectedDistance,
    selectedEventCode,
    selectedGender,
    selectedHeat,
    selectedLine,
    search,
    includeEmptyLanes,
    sortMode,
    selectedRound,
    customTitle,
    customDate,
    currentTournament,
  ]);

  // Slips per page calculation
  const slipsPerPage = gridCols * gridRows;

  // Chunk slips into pages
  const slipPages = useMemo(() => {
    const pages: FormTimerSlip[][] = [];
    for (let i = 0; i < allSlips.length; i += slipsPerPage) {
      pages.push(allSlips.slice(i, i + slipsPerPage));
    }
    return pages;
  }, [allSlips, slipsPerPage]);

  const resetFilters = () => {
    setSelectedKU("ALL");
    setSelectedStroke("ALL");
    setSelectedDistance("ALL");
    setSelectedEventCode("ALL");
    setSelectedGender("ALL");
    setSelectedHeat("ALL");
    setSelectedLine("ALL");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Print CSS Injection */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${paperSize.toLowerCase()} ${orientation};
            margin: 6mm;
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
          .print-only {
            display: block !important;
          }
          .timer-print-page {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 98vh !important;
          }
          .timer-slip-card {
            border: 1.5px solid #0f172a !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Header Controls (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-sky-100 text-sky-800 rounded-full border border-sky-200">
              MODUL PENCETAKAN FORMULIR
            </span>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
              <Scissors className="w-3 h-3 text-emerald-600" /> SLIP TIMER SIAP CETAK & GUNTING
            </span>
            {isBukuAcaraLocked ? (
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-emerald-600 text-white rounded-full flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3" /> BUKU ACARA FIX (TERPATENKAN)
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-amber-500 text-slate-950 rounded-full flex items-center gap-1 shadow-sm">
                <AlertTriangle className="w-3 h-3" /> STATUS DRAFT (BELUM DIKUNCI)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Cetak Form Catatan Waktu (Form Timer)
          </h1>
          <p className="text-xs font-bold text-slate-500">
            Pencetakan kartu waktu perenang per lintasan untuk juri pengambil waktu / stopwatch resmi sesuai Buku Acara Fix
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} /> Refresh Data
          </button>
          <button
            onClick={() => window.print()}
            disabled={allSlips.length === 0}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-sky-400" /> Cetak / Print Form ({allSlips.length} Slip)
          </button>
        </div>
      </div>

      {/* Toast Alert Feedback */}
      {toastMessage && (
        <div
          className={`no-print p-3.5 rounded-2xl text-xs font-black flex items-center justify-between border-2 transition-all shadow-sm ${
            toastMessage.success
              ? "bg-emerald-50 border-emerald-400 text-emerald-950"
              : "bg-rose-50 border-rose-400 text-rose-950"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[11px] font-extrabold hover:underline ml-3 opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Status Verifikasi Buku Acara FIX Banner (Hidden on Print) */}
      <div
        className={`no-print p-4 sm:p-5 rounded-3xl border-2 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all shadow-sm ${
          isBukuAcaraLocked
            ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
            : "bg-amber-50/90 border-amber-300 text-amber-950"
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
              isBukuAcaraLocked
                ? "bg-emerald-600 shadow-emerald-600/30"
                : "bg-amber-500 shadow-amber-500/30"
            }`}
          >
            {isBukuAcaraLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider">
                {isBukuAcaraLocked
                  ? "✓ DATA CETAK TELAH FIX SESUAI BUKU ACARA RESMI (TERKUNCI)"
                  : "⚠️ PERINGATAN: BUKU ACARA MASIH DRAFT (BELUM DIKUNCI)"}
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                  isBukuAcaraLocked
                    ? "bg-emerald-200 text-emerald-900 border-emerald-300"
                    : "bg-amber-200 text-amber-900 border-amber-300"
                }`}
              >
                {isBukuAcaraLocked ? "100% Terpatenkan" : "Dapat Berubah"}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 bg-white rounded-full text-slate-700 border border-slate-200 shadow-xs">
                {allSlips.length} Slip Siap Dicetak
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-600 mt-1 leading-relaxed">
              {isBukuAcaraLocked
                ? "Seluruh nomor seri lomba, heat, dan lintasan atlet telah dipatenkan sesuai Buku Acara Resmi. Form timer yang dicetak di bawah ini terjamin 100% sinkron dengan juri meja dan sistem pencatatan hasil."
                : "Buku Acara untuk turnamen ini belum dikunci (masih berstatus draft). Segera kunci & patenkan buku acara sebelum dicetak agar susunan seri dan lintasan atlet tidak bergeser saat lomba dimulai."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
          {isBukuAcaraLocked ? (
            <button
              type="button"
              disabled={lockLoading}
              onClick={() => handleToggleLock(false)}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              title="Buka kunci kembali ke draft jika perlu penyesuaian"
            >
              <Unlock className="w-3.5 h-3.5 text-amber-600" />
              <span>{lockLoading ? "Menyimpan..." : "Buka Kunci (Draft)"}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={lockLoading}
              onClick={() => handleToggleLock(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-600/30"
              title="Kunci dan tetapkan buku acara agar posisi seri dan lintasan atlet fix"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{lockLoading ? "Mengunci..." : "Kunci & Tetapkan Buku Acara (FIX)"}</span>
            </button>
          )}

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("buku-acara")}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-sky-700 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              title="Buka menu Buku Acara & Heat untuk melihat bagan lengkap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Buku Acara</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Control Box (Hidden on Print) */}
      <div className="no-print bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        {/* Primary Filter: Tournament & Round */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="w-full sm:w-auto flex-1 max-w-xl space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-600" /> Pilih Turnamen:
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
                  {t.name} {t.is_active ? "(Sedang Aktif)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 bg-sky-50 px-4 py-2 rounded-2xl border border-sky-200 text-sky-800">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider">Perlombaan Resmi (Timed Final)</span>
          </div>
        </div>

        {/* Sub-Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Kelompok Umur (KU) */}
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
              {filterOptions.ageGroups.map((ku) => (
                <option key={ku} value={ku}>
                  {ku}
                </option>
              ))}
            </select>
          </div>

          {/* Gaya Renang */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Gaya Renang (Stroke)
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

          {/* Jarak */}
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
              {filterOptions.distances.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Nomor Lomba */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Nomor Lomba (Event)
            </label>
            <select
              value={selectedEventCode}
              onChange={(e) => setSelectedEventCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Nomor Lomba</option>
              {filterOptions.eventCodes.map((ev) => (
                <option key={ev.code} value={String(ev.code)}>
                  {ev.code} - {ev.name} ({ev.gender} {ev.age_group ? `• ${ev.age_group}` : ""})
                </option>
              ))}
            </select>
          </div>

          {/* Gender */}
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

          {/* Filter Seri (Heat) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Nomor Seri (Heat)
            </label>
            <select
              value={selectedHeat}
              onChange={(e) => setSelectedHeat(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Seri (Heat)</option>
              {filterOptions.heats.map((h) => (
                <option key={h} value={String(h)}>
                  Seri (Heat) {h}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Lintasan (Line) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Nomor Lintasan (Line)
            </label>
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Lintasan (Line)</option>
              {filterOptions.lines.map((l) => (
                <option key={l} value={String(l)}>
                  Lintasan (Line) {l}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar & Reset */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik nama perenang, klub, KU, atau nomor acara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {(selectedKU !== "ALL" ||
              selectedStroke !== "ALL" ||
              selectedDistance !== "ALL" ||
              selectedEventCode !== "ALL" ||
              selectedGender !== "ALL" ||
              selectedHeat !== "ALL" ||
              selectedLine !== "ALL" ||
              search !== "") && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PRINT CONFIGURATION PANEL (Hidden on Print) */}
      <div className="no-print bg-white border-2 border-sky-300 p-6 rounded-3xl shadow-sm space-y-5 text-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Konfigurasi Cetak Kertas & Tata Letak Slip
              </h2>
              <p className="text-[11px] font-bold text-slate-500">
                Sesuaikan ukuran kertas, jumlah baris/kolom per lembar, dan kustomisasi teks watermark
              </p>
            </div>
          </div>
          <span className="inline-block bg-sky-50 border border-sky-200 text-sky-800 font-extrabold px-3 py-1 rounded-xl text-xs">
            Total {allSlips.length} Slip • Dibagi ke {slipPages.length} Lembar Halaman
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Jenis Kertas */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5">
              1. Ukuran Kertas
            </label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as any)}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 shadow-sm focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all cursor-pointer"
            >
              <option value="A4">A4 (210 x 297 mm) [Standar]</option>
              <option value="F4">F4 / Folio (215 x 330 mm)</option>
              <option value="Letter">Letter (216 x 279 mm)</option>
              <option value="Legal">Legal (216 x 356 mm)</option>
            </select>
          </div>

          {/* Orientasi */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5">
              2. Orientasi Halaman
            </label>
            <select
              value={orientation}
              onChange={(e) => {
                const ori = e.target.value as any;
                setOrientation(ori);
                if (ori === "landscape") {
                  setGridCols(3);
                  setGridRows(2);
                } else {
                  setGridCols(2);
                  setGridRows(3);
                }
              }}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 shadow-sm focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all cursor-pointer"
            >
              <option value="landscape">Landscape (Mendatar) [Sesuai Contoh]</option>
              <option value="portrait">Portrait (Tegak)</option>
            </select>
          </div>

          {/* Grid Layout Kolom x Baris */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5">
              3. Tata Letak Slip per Lembar
            </label>
            <select
              value={`${gridCols}x${gridRows}`}
              onChange={(e) => {
                const [c, r] = e.target.value.split("x").map(Number);
                setGridCols(c);
                setGridRows(r);
              }}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 shadow-sm focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all cursor-pointer"
            >
              <option value="3x2">3 Kolom x 2 Baris (6 Slip/Lembar) [Sesuai PDF]</option>
              <option value="2x3">2 Kolom x 3 Baris (6 Slip/Lembar)</option>
              <option value="2x2">2 Kolom x 2 Baris (4 Slip/Lembar - Ukuran Besar)</option>
              <option value="3x3">3 Kolom x 3 Baris (9 Slip/Lembar - Kompak)</option>
            </select>
          </div>

          {/* Urutan Pengelompokan Cetak */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1.5">
              4. Urutan Pengurutan (Sort Order)
            </label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as any)}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 shadow-sm focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all cursor-pointer"
            >
              <option value="by_heat">Urut Seri & Heat (Heat 1, Heat 2...)</option>
              <option value="by_lane">Kelompokkan Per Lintasan (Khusus Timer Line 1, 2, 3...)</option>
            </select>
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="pt-1 flex flex-wrap items-center gap-6 text-xs text-slate-800 font-bold border-t border-slate-100">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeEmptyLanes}
              onChange={(e) => setIncludeEmptyLanes(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 bg-white border-slate-300 focus:ring-sky-500"
            />
            <span>Sertakan Lintasan Kosong (Cetak Form Kosong)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showWatermark}
              onChange={(e) => setShowWatermark(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 bg-white border-slate-300 focus:ring-sky-500"
            />
            <span>Tampilkan Watermark Latar</span>
          </label>
        </div>

        {/* Customizable Headers & Watermark */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
              Kustom Teks Acara:
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none transition-all shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
              Kustom Tanggal:
            </label>
            <input
              type="text"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none transition-all shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
              Kustom Teks Watermark:
            </label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="Contoh: Akuatik / PRSI"
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none transition-all shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
              Kustom Catatan Footer:
            </label>
            <input
              type="text"
              value={customFooter}
              onChange={(e) => setCustomFooter(e.target.value)}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Print Preview Area */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto text-sky-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500">Memuat data perenang...</p>
        </div>
      ) : allSlips.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <FileText className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="text-sm font-black text-slate-700">Tidak ada data slip yang sesuai filter</h3>
          <p className="text-xs text-slate-400">
            Pastikan buku acara sudah digenerate dan terdapat peserta dengan status pembayaran terverifikasi.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {slipPages.map((pageSlips, pageIdx) => (
            <div key={pageIdx} className="space-y-2">
              {/* Screen-Only Sheet Header (Exact replica of user screenshot: "LEMBAR A4 #1 (ISI 6 SLIP) - GRID 3 KOLOM x 2 BARIS") */}
              <div className="no-print bg-white/90 backdrop-blur border border-slate-200 px-5 py-2.5 rounded-2xl flex items-center justify-between text-xs shadow-sm">
                <span className="font-mono font-black text-slate-800 tracking-wider">
                  LEMBAR {paperSize} #{pageIdx + 1} (ISI {pageSlips.length} SLIP)
                </span>
                <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                  GRID {gridCols} KOLOM × {gridRows} BARIS
                </span>
              </div>

              {/* Physical Printable Page Container */}
              <div
                className="timer-print-page bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
                  gap: "12px",
                }}
              >
                {pageSlips.map((slip) => (
                  <div
                    key={slip.uniqueId}
                    className="timer-slip-card relative bg-white border-2 border-slate-900 rounded-xl p-3 flex flex-col justify-between overflow-hidden"
                    style={{ minHeight: "235px" }}
                  >
                    {/* Watermark Dynamic Background */}
                    {showWatermark && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden">
                        <span
                          className="font-black text-slate-900/[0.08] tracking-widest uppercase text-3xl sm:text-4xl transform -rotate-12 whitespace-nowrap"
                          style={{
                            fontFamily: "Inter, sans-serif",
                            letterSpacing: "0.2em",
                          }}
                        >
                          {watermarkText || "Akuatik"}
                        </span>
                      </div>
                    )}

                    {/* Top Header Title */}
                    <div className="relative z-10 text-center pb-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-[7.5px] font-black uppercase text-slate-500 tracking-wider">
                        PERLOMBAAN RESMI
                      </span>
                      <h3 className="font-black text-[11px] tracking-wider text-slate-900 uppercase">
                        HASIL CATATAN WAKTU ( FORM TIMER )
                      </h3>
                      <span
                        className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          isBukuAcaraLocked
                            ? "text-emerald-800 bg-emerald-50 border-emerald-300"
                            : "text-amber-800 bg-amber-50 border-amber-300"
                        }`}
                      >
                        {isBukuAcaraLocked ? "BUKU ACARA FIX" : "DRAFT"}
                      </span>
                    </div>

                    {/* Metadata Section: Left (Tanggal, Acara, KU) vs Right (Box LEN) */}
                    <div className="relative z-10 grid grid-cols-4 gap-1.5 py-1.5 border-b border-slate-800 text-[10px]">
                      {/* Left Block */}
                      <div className="col-span-3 space-y-0.5 leading-tight">
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-slate-500 w-12 shrink-0">Tanggal:</span>
                          <span className="font-extrabold text-slate-900 truncate">
                            {slip.eventDate}
                          </span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-slate-500 w-12 shrink-0">Acara:</span>
                          <span className="font-extrabold text-slate-900 truncate">
                            {slip.tournamentName}
                          </span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold text-slate-500 w-12 shrink-0">KU:</span>
                          <span className="font-extrabold text-slate-900">{slip.ageGroup}</span>
                        </div>
                      </div>

                      {/* Right Block: LEN Box (Lane Number) */}
                      <div className="col-span-1 border-2 border-slate-900 rounded-lg flex flex-col items-center justify-center bg-slate-50/50">
                        <span className="text-[9px] font-black text-slate-700 tracking-wider">LEN</span>
                        <span className="text-2xl font-black text-slate-900 leading-none">
                          {slip.line}
                        </span>
                      </div>
                    </div>

                    {/* Middle Section: Event Name, Seri & Heat, Athlete Name */}
                    <div className="relative z-10 py-1.5 space-y-1">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">
                          NOMOR LOMBA
                        </span>
                        <h4 className="font-black text-[11px] text-slate-900 uppercase leading-tight">
                          {slip.eventName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] font-black">
                        <div>
                          <span className="text-slate-500 font-bold">SERI: </span>
                          <span className="font-mono text-slate-900">{slip.eventCode}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold">
                            {slip.heatCategory === "GROUP" || slip.heatCategory === "CLUSTER" ? "GROUP: " : "HEAT: "}
                          </span>
                          <span className="font-mono text-slate-900">{slip.heatLabel || slip.heat}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">
                          NAMA ATLET
                        </span>
                        {slip.isEmpty ? (
                          <div className="font-mono text-[11px] font-bold text-slate-400 tracking-wider">
                            ------------------------------------
                          </div>
                        ) : (
                          <div>
                            <div className="font-black text-xs text-slate-950 uppercase leading-tight">
                              {slip.swimmerName}
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase">
                              <span className="truncate">{slip.club}</span>
                              {slip.timeSeed && slip.timeSeed !== "-" && (
                                <span className="font-mono text-[9px] text-slate-500 font-bold lowercase shrink-0">
                                  seed: {slip.timeSeed}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Section: WAKTU Box & PENGAMBIL WAKTU */}
                    <div className="relative z-10 pt-1.5 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[10px] text-slate-900">WAKTU:</span>
                          <span className="text-slate-400 font-mono text-xs">_________________</span>
                        </div>
                        {/* Box Hasil Stopwatch */}
                        <div className="w-24 h-6 border-2 border-slate-900 rounded-md bg-white"></div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[9px] font-bold text-slate-700">
                          PENGAMBIL WAKTU: <span className="text-slate-400">________________________</span>
                        </div>
                        <div className="text-[8px] font-bold text-slate-500 italic">
                          {customFooter}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
