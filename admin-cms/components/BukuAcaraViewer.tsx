"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getBukuAcara,
  generateBukuAcara,
  lockTournamentBukuAcara,
  publishTournamentBukuAcara,
  fetchAdminSiteConfig,
  PUBLIC_LANDING_URL,
} from "../lib/api-admin";
import {
  Search,
  Filter,
  RefreshCw,
  Printer,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
  CheckCircle,
  Trophy,
  Zap,
  Lock,
  Unlock,
  ShieldCheck,
  AlertCircle,
  Clock,
  LayoutGrid,
  Globe,
  Eye,
  EyeOff,
  ExternalLink,
  ArrowUpDown,
} from "lucide-react";
import {
  matchKU,
  matchStroke,
  matchDistance,
  normalizeKU,
  getEventKULabel,
  getEventGenderLabel,
  isOpenKU,
  doesHeatItemMatchKU,
  doesHeatItemMatchGender,
  isZeroOrEmptyTime,
} from "./RaceResultEditor";
import ChampionsView from "./ChampionsView";

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

interface BukuAcaraViewerProps {
  tournaments?: any[];
  onRefresh?: () => void;
  refreshTrigger?: number;
}

export default function BukuAcaraViewer({
  tournaments = [],
  onRefresh,
  refreshTrigger = 0,
}: BukuAcaraViewerProps) {
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. PRIMARY FILTER: Tournament Name
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(0);

  // Line selection for generator
  const [maxLanes, setMaxLanes] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<{ success: boolean; text: string } | null>(null);

  // 2. SUB-FILTERS (Cascaded from tournament)
  const [selectedKU, setSelectedKU] = useState<string>("ALL");
  const [selectedStroke, setSelectedStroke] = useState<string>("ALL");
  const [selectedDistance, setSelectedDistance] = useState<string>("ALL");
  const [selectedEventCode, setSelectedEventCode] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [selectedTime, setSelectedTime] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"time_asc" | "time_desc" | "code_asc" | "code_desc">("time_asc");
  const [search, setSearch] = useState("");

  // 3. LOCK & PUBLISH STATE
  const [isLocked, setIsLocked] = useState(false);
  const [lockingLoading, setLockingLoading] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishingLoading, setPublishingLoading] = useState(false);

  // 4. VIEW TAB STATE ("bagan" vs "juara")
  const [activeTab, setActiveTab] = useState<"bagan" | "juara">("bagan");

  // Initialize selected tournament on mount
  useEffect(() => {
    if (tournaments.length > 0 && selectedTournamentId === 0) {
      // Pick active tournament or first one
      const active = tournaments.find((t) => t.is_active);
      setSelectedTournamentId(active ? active.id : tournaments[0].id);
    }
  }, [tournaments, selectedTournamentId]);

  // Sync lock and publish status from tournament
  useEffect(() => {
    const t = tournaments.find((x) => x.id === selectedTournamentId);
    if (t) {
      setIsLocked(!!t.is_buku_acara_locked);
      setIsPublished(!!t.is_buku_acara_published);
    }
  }, [selectedTournamentId, tournaments]);

  // Fetch Buku Acara based on selectedTournamentId
  const fetchData = async (tourneyId?: number) => {
    setLoading(true);
    const tid = tourneyId !== undefined ? tourneyId : selectedTournamentId;
    const res = await getBukuAcara(tid > 0 ? tid : undefined, "preliminary");
    if (res && res.success) {
      setEventGroups(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(selectedTournamentId);
  }, [selectedTournamentId, refreshTrigger]);

  // Handler for publishing / unpublishing Buku Acara to Public Page
  const handleTogglePublish = async (targetPublishState: boolean) => {
    if (selectedTournamentId <= 0) return;
    setPublishingLoading(true);
    const res = await publishTournamentBukuAcara(selectedTournamentId, targetPublishState);
    setPublishingLoading(false);

    if (res && res.success) {
      setIsPublished(targetPublishState);
      const msg = targetPublishState
        ? "🌐 Buku Acara berhasil dipublikasikan ke website publik!"
        : "Publikasi Buku Acara berhasil ditarik.";
      setGenMessage({
        success: true,
        text: targetPublishState
          ? "🌐 Buku Acara berhasil dipublikasikan! Sekarang tampil di halaman website publik (/buku-acara)."
          : "Publikasi Buku Acara berhasil ditarik (disembunyikan dari halaman website publik).",
      });
      toast.success(msg);
      if (onRefresh) onRefresh();
      fetchData();
    } else {
      toast.error(res?.message || "Gagal mengubah status publikasi");
    }
  };

  // Handler for locking / unlocking Buku Acara
  const handleToggleLock = async (targetLockState: boolean) => {
    if (selectedTournamentId <= 0) return;
    setLockingLoading(true);
    const res = await lockTournamentBukuAcara(selectedTournamentId, targetLockState);
    setLockingLoading(false);

    if (res && res.success) {
      setIsLocked(targetLockState);
      setShowUnlockModal(false);
      const msg = targetLockState
        ? "Buku Acara berhasil dipatenkan! Susunan seri & lintasan telah dikunci secara resmi."
        : "Kunci buku acara telah dibuka (kembali ke mode draft).";
      setGenMessage({
        success: true,
        text: msg,
      });
      toast.success(msg);
      if (onRefresh) onRefresh();
      fetchData();
    } else {
      toast.error(res?.message || "Gagal mengubah status kunci buku acara");
    }
  };

  // Handler for running Auto-Generate
  const handleGenerate = async (force: boolean = false) => {
    if (isLocked && !force) {
      setGenMessage({
        success: false,
        text: "Buku Acara sedang dipatenkan / terkunci! Buka kunci terlebih dahulu jika ingin meng-generate ulang susunan.",
      });
      return;
    }
    setIsGenerating(true);
    setGenMessage(null);
    const res = await generateBukuAcara(
      maxLanes,
      selectedTournamentId > 0 ? selectedTournamentId : undefined,
      force
    );
    setIsGenerating(false);

    if (res && res.success) {
      setGenMessage({
        success: true,
        text: `Bagan Seri & Lintasan berhasil di-generate dengan ${maxLanes} Line per Heat! Hanya peserta terverifikasi yang dihitung.`,
      });
      fetchData();
      if (onRefresh) onRefresh();
    } else {
      setGenMessage({
        success: false,
        text: res?.message || "Gagal generate Buku Acara",
      });
    }
  };

  // Extract dynamic sub-filters available in the current tournament data
  const dynamicFilterOptions = useMemo(() => {
    const strokes = new Set<string>();
    const distances = new Set<string>();
    const ageGroups = new Set<string>();
    const dates = new Set<string>();
    const times = new Set<string>();
    const eventCodes: { code: number; name: string; gender: string; age_group: string }[] = [];

    eventGroups.forEach((eg) => {
      if (eg.schedule_date) dates.add(eg.schedule_date.trim());
      if (eg.schedule_time) times.add(eg.schedule_time.trim());
      if (eg.stroke) strokes.add(eg.stroke.trim());
      if (eg.distance) distances.add(eg.distance.trim());
      
      const effectiveKU = getEventKULabel(eg);
      if (effectiveKU && !isOpenKU(effectiveKU)) {
        ageGroups.add(normalizeKU(effectiveKU));
      } else if (isOpenKU(effectiveKU)) {
        ageGroups.add("OPEN");
      }

      eg.heats?.forEach((h) => {
        if (!h.is_empty && h.age_group && h.age_group.trim() !== "") {
          const hKU = normalizeKU(h.age_group);
          if (!isOpenKU(hKU)) ageGroups.add(hKU);
        }
      });
      eventCodes.push({
        code: eg.event_code,
        name: eg.event_name,
        gender: eg.gender,
        age_group: eg.age_group,
      });
    });

    eventCodes.sort((a, b) => compareEventCode(a.code, b.code, false));

    const standardKUSort = ["KU 6A", "KU 6B", "KU 5", "KU 4", "KU 3", "KU 2", "KU 1", "SENIOR", "OPEN", "TERBUKA"];
    const sortedKUs = Array.from(ageGroups).filter(Boolean).sort((a, b) => {
      const ia = standardKUSort.findIndex((k) => a.toUpperCase().includes(k));
      const ib = standardKUSort.findIndex((k) => b.toUpperCase().includes(k));
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    const sortedDates = Array.from(dates).sort();
    const sortedTimes = Array.from(times).sort((a, b) => {
      return parseDateTimeWeight("", a) - parseDateTimeWeight("", b);
    });

    return {
      strokes: Array.from(strokes),
      distances: Array.from(distances),
      eventCodes,
      ageGroups: sortedKUs.length > 0 ? sortedKUs : standardKUSort,
      dates: sortedDates,
      times: sortedTimes,
    };
  }, [eventGroups]);

  // Filtered & Sorted Events
  const filteredEvents = useMemo(() => {
    const filtered = eventGroups.filter((event) => {
      // 0. Filter Tipe Bagan (Heat vs Group)
      if (selectedCategoryFilter !== "ALL") {
        const isEvtGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
        if (selectedCategoryFilter === "GROUP" && !isEvtGroup) return false;
        if (selectedCategoryFilter === "HEAT" && isEvtGroup) return false;
      }

      // 0b. Filter Kelompok Umur (KU) & 4. Filter Gender (Combined swimmer check)
      if (selectedKU !== "ALL" || selectedGender !== "ALL") {
        const hasMatchingSwimmer = event.heats?.some((h) => {
          if (h.is_empty || !h.nama || h.nama === "(KOSONG)") return false;
          const kuOk = selectedKU === "ALL" || doesHeatItemMatchKU(h, selectedKU, event.age_group, event.event_name);
          const genderOk = selectedGender === "ALL" || doesHeatItemMatchGender(h, selectedGender, event.gender, event.event_name);
          return kuOk && genderOk;
        });
        if (!hasMatchingSwimmer) return false;
      }

      // 0c. Filter Tanggal (Date)
      if (selectedDate !== "ALL" && (event.schedule_date || "").trim() !== selectedDate.trim()) {
        return false;
      }

      // 0d. Filter Waktu (Time)
      if (selectedTime !== "ALL" && (event.schedule_time || "").trim() !== selectedTime.trim()) {
        return false;
      }

      // 1. Filter Gaya Renang (Stroke)
      if (selectedStroke !== "ALL") {
        if (!matchStroke(event.stroke, event.event_name, selectedStroke)) return false;
      }

      // 2. Filter Jarak (Distance)
      if (selectedDistance !== "ALL") {
        if (!matchDistance(event.distance, event.event_name, selectedDistance)) return false;
      }

      // 3. Filter Nomor Lomba
      if (selectedEventCode !== "ALL" && String(event.event_code) !== selectedEventCode) {
        return false;
      }

      // 5. Search query
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
    selectedCategoryFilter,
    selectedKU,
    selectedDate,
    selectedTime,
    sortBy,
    selectedStroke,
    selectedDistance,
    selectedEventCode,
    selectedGender,
    search,
  ]);

  const resetFilters = () => {
    setSelectedCategoryFilter("ALL");
    setSelectedKU("ALL");
    setSelectedStroke("ALL");
    setSelectedDistance("ALL");
    setSelectedEventCode("ALL");
    setSelectedGender("ALL");
    setSelectedDate("ALL");
    setSelectedTime("ALL");
    setSortBy("time_asc");
    setSearch("");
  };

  const currentTournament = tournaments.find((t) => t.id === selectedTournamentId);

  // Group heats by Heat Number for clean multi-heat rendering matching PDF
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

  // Site Config for Dynamic App Name
  const [siteConfig, setSiteConfig] = useState<any>(null);

  useEffect(() => {
    fetchAdminSiteConfig().then((res) => {
      if (res?.success && res.data) {
        setSiteConfig(res.data);
      }
    });
  }, []);

  const appName = useMemo(() => {
    return (siteConfig?.app_name || "AKUATIK INDONESIA KOTA TANGERANG").trim();
  }, [siteConfig]);

  // Dynamic Export / Print Title without "Admin CMS"
  const getExportTitle = () => {
    const tabName = activeTab === "juara" ? "Hasil Juara" : "Buku Acara";
    return currentTournament?.name
      ? `${currentTournament.name} - ${tabName}`
      : (appName ? `${appName} - ${tabName}` : tabName);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = getExportTitle();

    window.print();

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);
    setTimeout(restoreTitle, 1500);
  };

  useEffect(() => {
    let savedTitle = "";
    const handleBeforePrint = () => {
      savedTitle = document.title;
      document.title = getExportTitle();
    };
    const handleAfterPrint = () => {
      if (savedTitle) {
        document.title = savedTitle;
      }
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [currentTournament, appName, activeTab]);

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Dynamic Print Style Injection */}
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
          aside, nav, header {
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
            break-inside: avoid !important;
            page-break-inside: avoid !important;
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
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          tbody {
            display: table-row-group !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          td, th {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ============================================================ */}
      {/* 1. TOP CONTROL PANEL: PRIMARY TOURNAMENT FILTER & GENERATOR */}
      {/* ============================================================ */}
      <div className="no-print bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Header row with Title & Print button */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                <Trophy className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Pilih Turnamen & Generator Seri (Bagan)
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-bold mt-1">
              Filter turnamen utama untuk mencetak PDF Buku Acara dan pengisian hasil lomba (*result*) langsung saat pertandingan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} /> Refresh Data
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-sky-400" /> Cetak / Export PDF Buku Acara
            </button>
          </div>
        </div>

        {/* Status Kunci & Publikasi Buku Acara Banner */}
        {selectedTournamentId > 0 && (
          <div
            className={`p-4 rounded-3xl border-2 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all shadow-sm ${
              isLocked
                ? "bg-emerald-50/80 border-emerald-400 text-emerald-950"
                : "bg-amber-50/80 border-amber-300 text-amber-950"
            }`}
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${
                  isLocked ? "bg-emerald-600 text-white shadow-emerald-600/30" : "bg-amber-500 text-white shadow-amber-500/30"
                }`}
              >
                {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider">
                    {isLocked ? "Buku Acara Terpatenkan" : "Draft Buku Acara"}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                      isLocked ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
                    }`}
                  >
                    {isLocked ? "Terkunci Resmi" : "Dapat Diubah"}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                      isPublished
                        ? "bg-sky-200 text-sky-950 border border-sky-300"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    {isPublished ? "🌐 Publikasi Aktif (Live)" : "Belum Dipublikasikan"}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-600 mt-0.5 leading-relaxed">
                  {isLocked
                    ? "Susunan seri & lintasan telah dipatenkan. "
                    : "Klik 'Patenkan Buku Acara' untuk mengunci nomor seri & lintasan resmi. "}
                  {isPublished
                    ? "Buku Acara saat ini dapat dilihat dan di-download oleh publik di website."
                    : "Halaman publik saat ini menampilkan status belum dipublikasikan."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
              {/* Publish Toggle Button */}
              {isPublished ? (
                <button
                  type="button"
                  disabled={publishingLoading}
                  onClick={() => handleTogglePublish(false)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  title="Tarik publikasi agar tidak terlihat oleh publik"
                >
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>{publishingLoading ? "Memproses..." : "Tarik Publikasi"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={publishingLoading}
                  onClick={() => handleTogglePublish(true)}
                  className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-sky-600/25"
                  title="Publikasikan buku acara ke halaman website publik"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{publishingLoading ? "Mempublikasikan..." : "🌐 Publikasikan ke Publik"}</span>
                </button>
              )}

              {/* Public Page Direct Link */}
              <a
                href={`${PUBLIC_LANDING_URL}/buku-acara`}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white hover:bg-slate-100 border border-slate-300 text-sky-700 rounded-xl transition-all shadow-sm"
                title="Buka halaman Buku Acara di website publik"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Lock Toggle Button */}
              {isLocked ? (
                <button
                  type="button"
                  disabled={lockingLoading}
                  onClick={() => setShowUnlockModal(true)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-600" /> Buka Kunci
                </button>
              ) : (
                <button
                  type="button"
                  disabled={lockingLoading}
                  onClick={() => handleToggleLock(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-600/30"
                >
                  <Lock className="w-3.5 h-3.5" /> Patenkan
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Switcher Pills (Bagan & Heat vs Hasil Juara) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-2 bg-slate-100 rounded-2xl no-print">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("bagan")}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === "bagan"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4 text-sky-600" />
              <span>Susunan Seri & Bagan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("juara")}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === "juara"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25"
                  : "text-slate-600 hover:text-amber-700"
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>Hasil Juara & Podium 🏆</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-500 px-3 hidden sm:block">
            {activeTab === "juara"
              ? "🏆 Menampilkan Rekap Juara Lomba (Timed Final)"
              : "Menampilkan susunan seri & lintasan lomba"}
          </div>
        </div>

        {/* Primary Filter & Generator Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
          {/* Tournament Selection (Primary Filter) */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" /> 1. Nama Turnamen / Kejuaraan (Filter Utama):
            </label>
            <select
              value={selectedTournamentId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedTournamentId(id);
                resetFilters();
              }}
              className="w-full bg-slate-50 border-2 border-sky-300 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm"
            >
              {tournaments.length === 0 ? (
                <option value={0}>Memuat daftar turnamen...</option>
              ) : (
                tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_active ? "(Sedang Aktif)" : ""}
                  </option>
                ))
              )}
            </select>
            {currentTournament && (
              <div className="text-[11px] font-bold text-sky-700 flex items-center gap-2">
                <span>📍 {currentTournament.location || "Gelanggang Renang"}</span>
                <span>•</span>
                <span>📅 {currentTournament.event_start_date || "2026"}</span>
              </div>
            )}
          </div>

          {/* Lane Selector */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <LayoutGrid className="w-4 h-4 text-sky-600" /> 2. Pilihan Line per Heat:
            </label>
            <div className="flex gap-1.5">
              {[3, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxLanes(num)}
                  disabled={isLocked}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                    maxLanes === num
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {num} Line
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="lg:col-span-4">
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              disabled={isGenerating || isLocked}
              title={
                isLocked
                  ? "Buku Acara telah dipatenkan. Buka kunci terlebih dahulu jika ingin generate ulang"
                  : "Generate susunan seri & lintasan"
              }
              className={`w-full py-3 px-6 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                isLocked
                  ? "bg-slate-400 cursor-not-allowed opacity-80 shadow-none"
                  : "bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 shadow-cyan-600/25"
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-4 h-4" /> Buku Acara Terkunci (Dipatenkan)
                </>
              ) : (
                <>
                  <Zap className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                  {isGenerating ? "Sedang Mengkalkulasi Bagan..." : "Jalankan Auto-Generate Bagan & Heat"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generate Feedback Alert */}
        {genMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${
              genMessage.success
                ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
                : "bg-red-50 border border-red-300 text-red-900"
            }`}
          >
            {genMessage.success ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            )}
            <span>{genMessage.text}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. SUB-FILTERS: DYNAMIC GAYA & JARAK DALAM TURNAMEN TERPILIH */}
        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* 2. SUB-FILTERS: DYNAMIC GAYA & JARAK DALAM TURNAMEN TERPILIH */}
        {/* ============================================================ */}
        <div className="pt-5 border-t border-slate-100 space-y-4">
          {/* Sub-Filter Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Filter Spesifik Nomor Lomba
                </span>
                <p className="text-[11px] font-medium text-slate-500">
                  Saring bagan berdasarkan jadwal, gaya, jarak, KU, nomor lomba, atau nama atlet
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Menampilkan: <span className="text-sky-700 font-black">{filteredEvents.length}</span> dari {eventGroups.length} Event
              </span>

              {(selectedKU !== "ALL" ||
                selectedStroke !== "ALL" ||
                selectedDistance !== "ALL" ||
                selectedEventCode !== "ALL" ||
                selectedGender !== "ALL" ||
                selectedDate !== "ALL" ||
                selectedTime !== "ALL" ||
                selectedCategoryFilter !== "ALL" ||
                sortBy !== "time_asc" ||
                search !== "") && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Kembalikan semua filter ke awal"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* SEARCH BAR (LEGA & PROMINENT) */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari cepat nama perenang, klub/sekolah, kelompok umur (KU), atau kode nomor lomba..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition-all shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* FILTER CONTAINER CARD */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 space-y-3.5">
            {/* ROW 1: JADWAL & URUTAN LOMBA (4 KOLOM LEGA) */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                1. JADWAL, URUTAN & TIPE BAGAN
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Tanggal */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" /> Tanggal Lomba
                  </label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none shadow-2xs"
                  >
                    <option value="ALL">Semua Tanggal</option>
                    {dynamicFilterOptions.dates.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Waktu Mulai */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Waktu Mulai
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none shadow-2xs"
                  >
                    <option value="ALL">Semua Waktu</option>
                    {dynamicFilterOptions.times.map((tm) => (
                      <option key={tm} value={tm}>
                        {tm}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Urutkan */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" /> Urutkan Berdasarkan
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-sky-50/70 border border-sky-300 rounded-xl px-3 py-2 text-xs font-black text-sky-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none shadow-2xs"
                  >
                    <option value="time_asc">⏰ Waktu: Terpagi → Tersore</option>
                    <option value="time_desc">⏰ Waktu: Tersore → Terpagi</option>
                    <option value="code_asc">🔢 Nomor: #101 → Terbesar</option>
                    <option value="code_desc">🔢 Nomor: Terbesar → Terkecil</option>
                  </select>
                </div>

                {/* Tipe Bagan */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" /> Tipe Bagan
                  </label>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none shadow-2xs"
                  >
                    <option value="ALL">Semua Tipe Bagan</option>
                    <option value="HEAT">Heat Angka (1, 2, 3...)</option>
                    <option value="GROUP">Group Abjad (A, B, C...)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ROW 2: KATEGORI GAYA, JARAK, KU, GENDER & NOMOR (5 KOLOM LEGA) */}
            <div className="pt-2 border-t border-slate-200/60">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                2. KATEGORI NOMOR LOMBA, GAYA, JARAK & GENDER
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Gaya Renang */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                    Gaya Renang (Stroke)
                  </label>
                  <select
                    value={selectedStroke}
                    onChange={(e) => setSelectedStroke(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none shadow-2xs"
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

                {/* Jarak */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                    Jarak Lomba (Distance)
                  </label>
                  <select
                    value={selectedDistance}
                    onChange={(e) => setSelectedDistance(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none shadow-2xs"
                  >
                    <option value="ALL">Semua Jarak</option>
                    <option value="25">25 Meter</option>
                    <option value="50">50 Meter</option>
                    <option value="100">100 Meter</option>
                    <option value="200">200 Meter</option>
                    <option value="400">400 Meter</option>
                  </select>
                </div>

                {/* KU */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                    Kelompok Umur (KU)
                  </label>
                  <select
                    value={selectedKU}
                    onChange={(e) => setSelectedKU(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none shadow-2xs"
                  >
                    <option value="ALL">Semua KU</option>
                    {dynamicFilterOptions.ageGroups.map((ku) => (
                      <option key={ku} value={ku}>
                        {ku}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                    Kategori Gender
                  </label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none shadow-2xs"
                  >
                    <option value="ALL">Semua Gender</option>
                    <option value="PUTRA">Putra</option>
                    <option value="PUTRI">Putri</option>
                  </select>
                </div>

                {/* Nomor Lomba */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                    Nomor Lomba (Event)
                  </label>
                  <select
                    value={selectedEventCode}
                    onChange={(e) => setSelectedEventCode(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none shadow-2xs truncate"
                  >
                    <option value="ALL">Semua Nomor Lomba</option>
                    {dynamicFilterOptions.eventCodes.map((ev) => (
                      <option key={ev.code} value={String(ev.code)}>
                        #{ev.code} - {ev.name} ({ev.gender})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PRINTABLE OFFICIAL PDF HEADER FOR JUARA                   */}
      {/* ============================================================ */}
      {activeTab === "juara" && (
        <div className="hidden print:block mb-4 border-b-2 border-black pb-2 text-center print-header-banner">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1 border-b border-slate-300 pb-1">
            <span>{appName.toUpperCase()}</span>
            <span className="font-mono font-black text-slate-900 uppercase">
              {isLocked ? "STATUS: BUKU ACARA RESMI (FIX & TERKUNCI)" : "STATUS: BUKU ACARA DRAFT"}
            </span>
          </div>
          <h1 className="text-xl font-black uppercase tracking-wider text-black">
            HASIL JUARA &amp; PODIUM
          </h1>
          <h2 className="text-base font-black uppercase mt-0.5 text-black">
            {currentTournament?.name || "TIME TRIAL 2025"}
          </h2>
          <p className="text-xs font-bold uppercase text-slate-700 mt-0.5">
            {appName.toUpperCase()}
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MAIN CONTENT: HASIL JUARA VS SUSUNAN BAGAN                */}
      {/* ============================================================ */}
      {activeTab === "juara" ? (
        <ChampionsView
          events={filteredEvents}
          tournamentName={currentTournament?.name}
        />
      ) : loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto text-sky-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500">Memuat data Buku Acara...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Layers className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="text-sm font-black text-slate-700">Tidak ada data seri yang sesuai filter</h3>
          <p className="text-xs text-slate-400 font-medium">
            Silakan pilih turnamen di atas atau klik tombol <strong>"Jalankan Auto-Generate Bagan & Heat"</strong> untuk membentuk susunan seri otomatis.
          </p>
        </div>
      ) : !filteredEvents.some((ev) => ev.heats && ev.heats.length > 0) ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
          <h3 className="text-sm font-black text-slate-800">
            Tidak ada data seri yang sesuai filter
          </h3>
          <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
            Silakan pilih turnamen di atas atau klik tombol <strong>"Jalankan Auto-Generate Bagan & Heat"</strong>.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 print:hidden">
          {filteredEvents.map((event, eventIdx) => {
            const eventGenderLabel = getEventGenderLabel(event);
            const eventKULabel = getEventKULabel(event);
            const displayGender = selectedGender !== "ALL" ? selectedGender : eventGenderLabel;
            const displayKU = selectedKU !== "ALL" ? selectedKU : eventKULabel;
            const isPutri = displayGender === "PUTRI";
            const isGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
            const heatGroups = groupHeatsByNumber(event.heats || []);
            const visibleHeatGroups = heatGroups
              .map((group) => {
                if (selectedKU === "ALL" && selectedGender === "ALL") return group;
                const filteredItems = group.items.filter((item) => {
                  if (item.is_empty || !item.nama || item.nama === "(KOSONG)") return true;
                  if (selectedKU !== "ALL" && !doesHeatItemMatchKU(item as any, selectedKU, event.age_group, event.event_name)) {
                    return false;
                  }
                  if (selectedGender !== "ALL" && !doesHeatItemMatchGender(item as any, selectedGender, event.gender, event.event_name)) {
                    return false;
                  }
                  return true;
                });
                return { ...group, items: filteredItems };
              })
              .filter((group) => {
                if (selectedKU !== "ALL" || selectedGender !== "ALL") {
                  return group.items.some((i) => !i.is_empty && i.nama && i.nama !== "(KOSONG)");
                }
                return true;
              });

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
                    <span className="bg-white/10 text-white text-[11px] px-2.5 py-0.5 rounded-full font-black border border-white/20">
                      {displayKU}
                    </span>
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
                      {displayGender}
                    </span>
                  </div>
                </div>

                {/* Compact Separated Heat/Group Cards */}
                <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50 print:p-0 print:space-y-0 print:bg-transparent">
                  {visibleHeatGroups.map((group) => {
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
                                      ) : item.result && item.result !== "-" && /[1-9]|DQ|DNF|DNS/.test(item.result) ? (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-black text-xs border border-blue-100">
                                          {item.result}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-bold text-xs">-</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-3 text-center">
                                      {!isEmpty && item.rank && item.rank > 0 && item.result && item.result !== "-" && /[1-9]|DQ|DNF|DNS/.test(item.result) ? (
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
          {/* 5. DENSE OFFICIAL PRINT-ONLY VIEW (PB PRSI MEET PROGRAM)     */}
          {/* ============================================================ */}
          <div className="hidden print:block space-y-3">
            {/* Top Document Header */}
            <div className="text-center pb-2 mb-3 border-b-2 border-black print-meet-header">
              <h1 className="text-xl font-bold uppercase tracking-widest text-black font-serif">
                Buku Acara
              </h1>
              <p className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                {currentTournament?.name || appName}
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

      {/* Modal Konfirmasi Buka Kunci */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Unlock className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Buka Kunci Buku Acara?</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Membuka kunci akan mengembalikan status ke <strong>Draft</strong>. Tombol Auto-Generate akan dapat dijalankan kembali, yang berisiko mengacak ulang posisi seri & lintasan jika tombol ditekan.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleToggleLock(false)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-amber-600/30"
              >
                Ya, Buka Kunci
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
