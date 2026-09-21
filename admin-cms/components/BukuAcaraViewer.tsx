"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getBukuAcara,
  generateBukuAcara,
  lockTournamentBukuAcara,
  publishTournamentBukuAcara,
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
} from "lucide-react";
import ChampionsView from "./ChampionsView";

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
  heats: HeatItem[];
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
      setGenMessage({
        success: true,
        text: targetPublishState
          ? "🌐 Buku Acara berhasil dipublikasikan! Sekarang tampil di halaman website publik (/buku-acara)."
          : "Publikasi Buku Acara berhasil ditarik (disembunyikan dari halaman website publik).",
      });
      if (onRefresh) onRefresh();
      fetchData();
    } else {
      alert(res?.message || "Gagal mengubah status publikasi");
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
      setGenMessage({
        success: true,
        text: targetLockState
          ? "Buku Acara berhasil dipatenkan! Susunan seri & lintasan telah dikunci secara resmi."
          : "Kunci buku acara telah dibuka (kembali ke mode draft). Anda dapat meng-generate ulang susunan.",
      });
      if (onRefresh) onRefresh();
      fetchData();
    } else {
      alert(res?.message || "Gagal mengubah status kunci buku acara");
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
    const eventCodes: { code: number; name: string; gender: string; age_group: string }[] = [];

    eventGroups.forEach((eg) => {
      if (eg.stroke) strokes.add(eg.stroke.trim());
      if (eg.distance) distances.add(eg.distance.trim());
      if (eg.age_group) ageGroups.add(eg.age_group.trim().toUpperCase());
      eventCodes.push({
        code: eg.event_code,
        name: eg.event_name,
        gender: eg.gender,
        age_group: eg.age_group,
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
    };
  }, [eventGroups]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return eventGroups.filter((event) => {
      // 0. Filter Tipe Bagan (Heat vs Group)
      if (selectedCategoryFilter !== "ALL") {
        const isEvtGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
        if (selectedCategoryFilter === "GROUP" && !isEvtGroup) return false;
        if (selectedCategoryFilter === "HEAT" && isEvtGroup) return false;
      }

      // 0b. Filter Kelompok Umur (KU)
      if (selectedKU !== "ALL" && event.age_group?.toUpperCase() !== selectedKU.toUpperCase()) {
        return false;
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
  }, [eventGroups, selectedCategoryFilter, selectedKU, selectedStroke, selectedDistance, selectedEventCode, selectedGender, search]);

  const resetFilters = () => {
    setSelectedCategoryFilter("ALL");
    setSelectedKU("ALL");
    setSelectedStroke("ALL");
    setSelectedDistance("ALL");
    setSelectedEventCode("ALL");
    setSelectedGender("ALL");
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

  return (
    <div className="space-y-6">
      {/* Dynamic Print Style Injection */}
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
              onClick={() => window.print()}
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
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-600" /> Sub-Filter Spesifik Lomba pada Turnamen Ini:
            </span>
            <span className="text-xs font-bold text-slate-500">
              Total: <span className="text-slate-900 font-black">{filteredEvents.length}</span> Event
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Sub-Filter: Tipe Bagan */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Tipe Bagan
              </label>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="ALL">Semua Tipe Bagan</option>
                <option value="HEAT">Heat Angka (1, 2, 3...)</option>
                <option value="GROUP">Group Abjad (A, B, C...)</option>
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

            {/* Sub-Filter: Jarak Lomba */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Jarak Lomba (Distance)
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

            {/* Sub-Filter: Nomor Lomba (Event Code) */}
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
                {dynamicFilterOptions.eventCodes.map((ev) => (
                  <option key={ev.code} value={String(ev.code)}>
                    {ev.code} - {ev.name} ({ev.gender} {ev.age_group ? `• ${ev.age_group}` : ""})
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-Filter: Gender */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Kategori Gender
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
                placeholder="Cari nama perenang, klub, atau KU..."
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
              search !== "") && (
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset Sub-Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PRINTABLE OFFICIAL PDF HEADER (VISIBLE ON PRINT ONLY)      */}
      {/* ============================================================ */}
      <div className="hidden print:block mb-6 border-b-2 border-black pb-4 text-center">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1 border-b border-slate-200 pb-1">
          <span>AKUATIK INDONESIA KOTA TANGERANG</span>
          <span className="font-mono font-black text-slate-900 uppercase">
            {isLocked ? "STATUS: BUKU ACARA RESMI (FIX & TERKUNCI)" : "STATUS: BUKU ACARA DRAFT"}
          </span>
        </div>
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
        <div className="space-y-6">
          {filteredEvents.map((event) => {
            const isPutri = event.gender?.toUpperCase() === "PUTRI";
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
                                        <span className="text-slate-300 font-bold">-</span>
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
