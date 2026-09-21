"use client";

import { useState, useMemo, useEffect } from "react";
import {
  getBukuAcara,
  recordRaceResult,
  swapRegistrationHeatLine,
  lockTournamentBukuAcara,
  publishTournamentBukuAcara,
  generateFinalRound,
} from "../lib/api-admin";
import {
  Trophy,
  Check,
  Edit2,
  ArrowLeftRight,
  ChevronUp,
  ChevronDown,
  Filter,
  Search,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  X,
  Sparkles,
  ShieldAlert,
  UserPlus,
  Zap,
  Save,
  RefreshCw,
  Lock,
  Unlock,
  Medal,
  Award,
  Crown,
  Globe,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
} from "lucide-react";
import ChampionsView from "./ChampionsView";
import SwimmingTimeInput from "./SwimmingTimeInput";

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

interface RaceResultEditorProps {
  registrations?: any[];
  tournaments?: any[];
  initialTournamentId?: number;
  onSelectTournamentId?: (id: number) => void;
  onRefresh?: () => void;
}

export default function RaceResultEditor({
  registrations = [],
  tournaments = [],
  initialTournamentId,
  onSelectTournamentId,
  onRefresh,
}: RaceResultEditorProps) {
  // 1. FILTER STATES
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(
    initialTournamentId || 0
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [selectedStroke, setSelectedStroke] = useState<string>("ALL");
  const [selectedDistance, setSelectedDistance] = useState<string>("ALL");
  const [selectedKU, setSelectedKU] = useState<string>("ALL");
  const [selectedEventCode, setSelectedEventCode] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedHeatFilter, setSelectedHeatFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 2. DATA STATE (Bagan format matching Buku Acara)
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // 3. INLINE RESULT EDITING STATE
  const [editingId, setEditingId] = useState<number | null>(null);
  const [timeStr, setTimeStr] = useState("");
  const [status, setStatus] = useState("OK");
  const [rank, setRank] = useState(1);
  const [savingResultId, setSavingResultId] = useState<number | null>(null);

  // 4. SWAP / PINDAH MODAL STATE
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swimmerToMove, setSwimmerToMove] = useState<{
    id: number;
    name: string;
    club: string;
    event_id: number;
    event_name: string;
    heat: number;
    line: number;
    time_seed: string;
  } | null>(null);
  const [targetHeat, setTargetHeat] = useState<number>(1);
  const [targetLine, setTargetLine] = useState<number>(1);
  const [swapIfOccupied, setSwapIfOccupied] = useState<boolean>(true);
  const [swapLoading, setSwapLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ success: boolean; text: string } | null>(null);

  // 5. FILL EMPTY SLOT MODAL (Pindahkan atlet ke slot kosong ini)
  const [fillSlotModalOpen, setFillSlotModalOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<{
    event_id: number;
    event_name: string;
    heat: number;
    line: number;
  } | null>(null);
  const [selectedSwimmerIdToMove, setSelectedSwimmerIdToMove] = useState<number>(0);

  // 6. VIEW TAB STATE ("bagan" vs "juara")
  const [activeTab, setActiveTab] = useState<"bagan" | "juara">("bagan");
  const [isLocking, setIsLocking] = useState(false);

  // Active Tournament, Lock & Publish Status
  const currentTournament = useMemo(() => {
    return tournaments.find((t) => t.id === selectedTournamentId) || null;
  }, [tournaments, selectedTournamentId]);

  const isLocked = Boolean(currentTournament?.is_buku_acara_locked);
  const isPublished = Boolean(currentTournament?.is_buku_acara_published);
  const [publishingLoading, setPublishingLoading] = useState(false);

  // Handler for publishing / unpublishing Buku Acara & Results to Public Page
  const handleTogglePublish = async (targetPublishState: boolean) => {
    if (selectedTournamentId <= 0) return;
    setPublishingLoading(true);
    const res = await publishTournamentBukuAcara(selectedTournamentId, targetPublishState);
    setPublishingLoading(false);

    if (res && res.success) {
      setActionMessage({
        success: true,
        text: targetPublishState
          ? "🌐 Buku Acara & Hasil Lomba berhasil dipublikasikan ke halaman website publik (/buku-acara)!"
          : "Publikasi Buku Acara & Hasil Lomba ditarik (disembunyikan dari website publik).",
      });
      setTimeout(() => setActionMessage(null), 4000);
      if (onRefresh) onRefresh();
      fetchBaganData(selectedTournamentId);
    } else {
      alert(res?.message || "Gagal mengubah status publikasi");
    }
  };

  // Initialize / sync selected tournament on mount or when prop changes
  useEffect(() => {
    if (initialTournamentId && initialTournamentId > 0) {
      setSelectedTournamentId(initialTournamentId);
    } else if (tournaments.length > 0 && selectedTournamentId === 0) {
      const active = tournaments.find((t) => t.is_active);
      setSelectedTournamentId(active ? active.id : tournaments[0].id);
    }
  }, [tournaments, initialTournamentId]);

  // Fetch bagan data from backend
  const fetchBaganData = async (tourneyId?: number) => {
    setLoading(true);
    const tid = tourneyId !== undefined ? tourneyId : selectedTournamentId;
    const res = await getBukuAcara(tid > 0 ? tid : undefined, "preliminary");
    if (res && res.success) {
      setEventGroups(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBaganData(selectedTournamentId);
  }, [selectedTournamentId]);

  // Lock / Unlock Buku Acara Handler
  const handleLockBukuAcara = async (lockVal: boolean) => {
    if (selectedTournamentId <= 0) return;
    setIsLocking(true);
    const res = await lockTournamentBukuAcara(selectedTournamentId, lockVal);
    setIsLocking(false);
    if (res && res.success) {
      setActionMessage({
        success: true,
        text: lockVal
          ? "🔒 Buku Acara berhasil dikunci dan dipatenkan! Pencatatan waktu hasil lomba kini telah aktif."
          : "🔓 Kunci Buku Acara telah dibuka kembali.",
      });
      setTimeout(() => setActionMessage(null), 4000);
      if (onRefresh) onRefresh();
      fetchBaganData(selectedTournamentId);
    } else {
      alert(res?.message || "Gagal mengubah status kunci Buku Acara");
    }
  };

  // Dynamic filter options from event groups
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

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return eventGroups.filter((event) => {
      if (selectedCategoryFilter !== "ALL") {
        const isEvtGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
        if (selectedCategoryFilter === "GROUP" && !isEvtGroup) return false;
        if (selectedCategoryFilter === "HEAT" && isEvtGroup) return false;
      }

      if (selectedStroke !== "ALL") {
        const s = (event.stroke || "").toUpperCase();
        const n = (event.event_name || "").toUpperCase();
        const target = selectedStroke.toUpperCase();
        if (!s.includes(target) && !n.includes(target)) return false;
      }

      if (selectedDistance !== "ALL") {
        const d = (event.distance || "").toUpperCase();
        const n = (event.event_name || "").toUpperCase();
        const target = selectedDistance.toUpperCase();
        if (!d.includes(target) && !n.includes(target)) return false;
      }

      if (selectedKU !== "ALL" && event.age_group?.toUpperCase() !== selectedKU.toUpperCase()) {
        return false;
      }

      if (selectedEventCode !== "ALL" && String(event.event_code) !== selectedEventCode) {
        return false;
      }

      if (selectedGender !== "ALL" && event.gender?.toUpperCase() !== selectedGender.toUpperCase()) {
        return false;
      }

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchEv =
          event.event_name?.toLowerCase().includes(q) || String(event.event_code).includes(q);
        const matchSwimmer = event.heats?.some(
          (h) => !h.is_empty && (h.nama?.toLowerCase().includes(q) || h.club?.toLowerCase().includes(q))
        );
        if (!matchEv && !matchSwimmer) return false;
      }

      return true;
    });
  }, [
    eventGroups,
    selectedCategoryFilter,
    selectedStroke,
    selectedDistance,
    selectedKU,
    selectedEventCode,
    selectedGender,
    searchQuery,
  ]);

  // Quick statistics calculation
  const stats = useMemo(() => {
    let totalSwimmers = 0;
    let recordedResults = 0;

    eventGroups.forEach((eg) => {
      eg.heats.forEach((h) => {
        if (!h.is_empty && h.registration_id) {
          totalSwimmers++;
          if (h.result && h.result !== "-" && h.result.trim() !== "") {
            recordedResults++;
          }
        }
      });
    });

    return {
      totalSwimmers,
      recordedResults,
      pendingResults: totalSwimmers - recordedResults,
      totalEvents: eventGroups.length,
    };
  }, [eventGroups]);

  // Group heats by Heat Number per event
  const groupHeatsByNumber = (heats: HeatItem[]) => {
    const map: { [heatNum: number]: HeatItem[] } = {};
    heats.forEach((h) => {
      if (selectedHeatFilter !== "ALL" && String(h.heat) !== selectedHeatFilter) {
        return;
      }
      if (!map[h.heat]) map[h.heat] = [];
      map[h.heat].push(h);
    });
    return Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b)
      .map((heatNum) => ({
        heatNum,
        heatLabel: map[heatNum][0]?.heat_label || String.fromCharCode(64 + heatNum),
        items: map[heatNum].sort((a, b) => a.line - b.line),
      }));
  };

  // Start inline result edit
  const startEdit = (item: HeatItem) => {
    if (!item.registration_id) return;
    if (!isLocked) {
      if (
        confirm(
          "⚠️ Buku Acara belum dikunci!\n\nUntuk memulai pencatatan hasil lomba, Buku Acara harus dipatenkan/dikunci terlebih dahulu agar nomor seri dan lintasan resmi tidak bergeser otomatis.\n\nApakah Anda ingin mengunci Buku Acara sekarang?"
        )
      ) {
        handleLockBukuAcara(true);
      }
      return;
    }
    setEditingId(item.registration_id);
    let timeVal = item.result !== "-" ? item.result : "";
    let statusVal = "OK";

    if (timeVal.includes("DQ")) statusVal = "DQ";
    else if (timeVal.includes("DNF")) statusVal = "DNF";
    else if (timeVal.includes("DNS")) statusVal = "DNS";

    setTimeStr(timeVal);
    setStatus(statusVal);
    setRank(item.rank || 1);
  };

  // Save race result
  const saveResult = async (regId: number) => {
    if (!isLocked) {
      alert(
        "⚠️ Buku Acara belum dikunci!\n\nUntuk memulai pencatatan hasil lomba, Buku Acara harus dipatenkan/dikunci terlebih dahulu agar nomor seri dan lintasan resmi tidak bergeser otomatis."
      );
      return;
    }

    setSavingResultId(regId);
    let finalTime = timeStr.trim();
    if (status !== "OK") {
      finalTime = finalTime ? `${finalTime} (${status})` : status;
    }

    const res = await recordRaceResult(regId, finalTime, rank, status, "preliminary");
    setSavingResultId(null);

    if (res && res.success) {
      setEditingId(null);
      setActionMessage({
        success: true,
        text: "Catatan waktu hasil lomba berhasil disimpan!",
      });
      setTimeout(() => setActionMessage(null), 3000);
      fetchBaganData(selectedTournamentId);
      if (onRefresh) onRefresh();
    } else {
      alert(res?.message || "Gagal menyimpan hasil lomba");
    }
  };

  // Open Swap / Move Modal for an occupied swimmer
  const openSwapModal = (item: HeatItem, event: EventGroup) => {
    if (!item.registration_id) return;
    setSwimmerToMove({
      id: item.registration_id,
      name: item.nama,
      club: item.club,
      event_id: event.event_id,
      event_name: `${event.event_code} - ${event.event_name}`,
      heat: item.heat,
      line: item.line,
      time_seed: item.time_seed,
    });
    setTargetHeat(item.heat);
    setTargetLine(item.line);
    setSwapIfOccupied(true);
    setSwapModalOpen(true);
  };

  // Detect occupant of target heat & line in the active event
  const currentEventOccupant = useMemo(() => {
    if (!swimmerToMove) return null;
    const ev = eventGroups.find((e) => e.event_id === swimmerToMove.event_id);
    if (!ev) return null;
    const match = ev.heats.find(
      (h) =>
        !h.is_empty &&
        h.heat === targetHeat &&
        h.line === targetLine &&
        h.registration_id !== swimmerToMove.id
    );
    return match || null;
  }, [swimmerToMove, targetHeat, targetLine, eventGroups]);

  // Execute Swap / Move
  const handleExecuteSwap = async () => {
    if (!swimmerToMove) return;
    if (targetHeat <= 0 || targetLine <= 0) {
      alert("Nomor Seri (Heat) dan Lintasan (Line) harus bernilai minimal 1");
      return;
    }

    setSwapLoading(true);
    const res = await swapRegistrationHeatLine(
      swimmerToMove.id,
      targetHeat,
      targetLine,
      swapIfOccupied
    );
    setSwapLoading(false);

    if (res && res.success) {
      setSwapModalOpen(false);
      setSwimmerToMove(null);
      setActionMessage({
        success: true,
        text: res.message || "Posisi perenang berhasil dipindahkan / ditukar!",
      });
      setTimeout(() => setActionMessage(null), 4000);
      fetchBaganData(selectedTournamentId);
      if (onRefresh) onRefresh();
    } else {
      alert(res?.message || "Gagal memindahkan posisi perenang");
    }
  };

  // Quick Shift Line on Table (Naik / Turun 1 line)
  const handleQuickShift = async (item: HeatItem, delta: number) => {
    if (!item.registration_id) return;
    const newLine = item.line + delta;
    if (newLine < 1 || newLine > 10) return;

    const res = await swapRegistrationHeatLine(
      item.registration_id,
      item.heat,
      newLine,
      true
    );
    if (res && res.success) {
      setActionMessage({
        success: true,
        text: `Lintasan ${item.nama} digeser ke Line ${newLine}`,
      });
      setTimeout(() => setActionMessage(null), 2500);
      fetchBaganData(selectedTournamentId);
      if (onRefresh) onRefresh();
    } else {
      alert(res?.message || "Gagal menggeser lintasan");
    }
  };

  // Open "Fill Empty Slot" Modal
  const openFillSlotModal = (heatNum: number, lineNum: number, event: EventGroup) => {
    setTargetSlot({
      event_id: event.event_id,
      event_name: `${event.event_code} - ${event.event_name}`,
      heat: heatNum,
      line: lineNum,
    });
    setSelectedSwimmerIdToMove(0);
    setFillSlotModalOpen(true);
  };

  // Swimmers available in this event to move into empty slot
  const availableSwimmersInEvent = useMemo(() => {
    if (!targetSlot) return [];
    const ev = eventGroups.find((e) => e.event_id === targetSlot.event_id);
    if (!ev) return [];
    return ev.heats.filter((h) => !h.is_empty && h.registration_id);
  }, [targetSlot, eventGroups]);

  // Execute moving chosen swimmer into empty slot
  const handleFillEmptySlot = async () => {
    if (!targetSlot || !selectedSwimmerIdToMove) {
      alert("Pilih perenang yang ingin dipindahkan ke lintasan kosong ini");
      return;
    }

    setSwapLoading(true);
    const res = await swapRegistrationHeatLine(
      selectedSwimmerIdToMove,
      targetSlot.heat,
      targetSlot.line,
      false
    );
    setSwapLoading(false);

    if (res && res.success) {
      setFillSlotModalOpen(false);
      setTargetSlot(null);
      setActionMessage({
        success: true,
        text: res.message || "Perenang berhasil dipindahkan ke lintasan kosong!",
      });
      setTimeout(() => setActionMessage(null), 3000);
      fetchBaganData(selectedTournamentId);
      if (onRefresh) onRefresh();
    } else {
      alert(res?.message || "Gagal memindahkan perenang");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg transition-all ${
            actionMessage.success ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. LOCK & PUBLISH STATUS BANNER */}
      {!isLocked ? (
        <div className="p-4 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20 shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                  Buku Acara Belum Dikunci (Mode Draft)
                </span>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black">
                  Pencatatan Waktu Dikunci
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                    isPublished
                      ? "bg-sky-200 text-sky-950 border border-sky-300"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  {isPublished ? "🌐 Publik (Live)" : "Belum Dipublikasikan"}
                </span>
              </div>
              <p className="text-xs font-bold text-amber-800 mt-0.5 leading-relaxed">
                Sebelum memulai perlombaan dan mencatat waktu hasil lomba (hari H), Buku Acara harus dipatenkan/dikunci terlebih dahulu agar susunan seri dan lintasan resmi tidak bergeser otomatis.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLocking || selectedTournamentId <= 0}
            onClick={() => handleLockBukuAcara(true)}
            className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{isLocking ? "Mengunci..." : "🔒 Kunci & Patenkan Buku Acara"}</span>
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-300 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/30 shrink-0 mt-0.5">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-emerald-950 font-black">
                <span>Buku Acara Resmi Terkunci & Dipatenkan — Mode Pencatatan Hasil Aktif</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                    isPublished
                      ? "bg-sky-200 text-sky-950 border border-sky-300"
                      : "bg-amber-200 text-amber-950 border border-amber-300"
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  {isPublished ? "🌐 Publikasi Aktif (Live di Website)" : "Draft (Belum Tampil di Publik)"}
                </span>
              </div>
              <p className="text-[11px] font-bold text-emerald-800 mt-0.5 leading-relaxed">
                {isPublished
                  ? "Hasil lomba dan bagan turnamen ini saat ini dapat diakses secara langsung oleh publik di website."
                  : "Hasil lomba hanya terlihat oleh juri/admin. Klik 'Publikasikan ke Publik' agar dapat dilihat peserta & audiens."}
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
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
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
                className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-sky-600/25"
                title="Publikasikan buku acara & hasil lomba ke publik"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{publishingLoading ? "Mempublikasikan..." : "🌐 Publikasikan ke Publik"}</span>
              </button>
            )}

            {/* Public Page Direct Link */}
            <a
              href={`http://localhost:3000/buku-acara?tournament_id=${selectedTournamentId}&tab=juara`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-sky-700 rounded-xl transition-all shadow-sm"
              title="Buka halaman Buku Acara di website publik"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Unlock Button */}
            <button
              type="button"
              disabled={isLocking}
              onClick={() => {
                if (
                  confirm(
                    "Buka kembali kunci Buku Acara ke mode draft?\n\nPerhatian: Jika dibuka, susunan seri & lintasan dapat digenerate ulang."
                  )
                ) {
                  handleLockBukuAcara(false);
                }
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-[11px] font-bold transition-all shadow-sm"
            >
              Buka Kunci
            </button>
          </div>
        </div>
      )}

      {/* 2. VIEW SELECTOR TABS: BAGAN & CATAT HASIL VS HASIL JUARA */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Pills */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1.5 w-full sm:w-auto">
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
            <span>Susunan Bagan & Catat Hasil</span>
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

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">
            Perlombaan 1 Putaran (Timed Final)
          </span>
        </div>
      </div>

      {/* TOP CONTROL & FILTER PANEL */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        {/* Header Title & Quick Stats */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-sky-500 text-white rounded-2xl shadow-md shadow-sky-500/20">
                <Trophy className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Catat Hasil Lomba (Tampilan Bagan Seri & Lintasan)
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  Format visual bagan per nomor lomba & heat sama seperti Buku Acara. Memudahkan juri mencatat waktu dan menukar atlet langsung di bagan.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3.5 py-1.5 bg-slate-100 rounded-xl text-xs font-black text-slate-700">
              Total Atlet: <span className="text-slate-900 font-black">{stats.totalSwimmers}</span>
            </div>
            <div className="px-3.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black">
              Tercatat: <span className="text-emerald-950 font-black">{stats.recordedResults}</span>
            </div>
            <div className="px-3.5 py-1.5 bg-amber-100 text-amber-800 rounded-xl text-xs font-black">
              Belum: <span className="text-amber-950 font-black">{stats.pendingResults}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchBaganData()}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
              title="Refresh Data Bagan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Primary Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {/* Turnamen */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Turnamen
            </label>
            <select
              value={selectedTournamentId}
              onChange={(e) => {
                const newTid = Number(e.target.value);
                setSelectedTournamentId(newTid);
                if (onSelectTournamentId) onSelectTournamentId(newTid);
                setSelectedEventCode("ALL");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {tournaments.length === 0 ? (
                <option value={0}>Memuat turnamen...</option>
              ) : (
                tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_active ? "(Aktif)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Tipe Bagan */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Tipe Bagan
            </label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Tipe Bagan</option>
              <option value="HEAT">Heat Angka (1, 2, 3...)</option>
              <option value="GROUP">Group Abjad (A, B, C...)</option>
            </select>
          </div>

          {/* Gaya Renang */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Gaya Renang
            </label>
            <select
              value={selectedStroke}
              onChange={(e) => setSelectedStroke(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Gaya Renang</option>
              <option value="FREESTYLE">Gaya Bebas</option>
              <option value="BREASTSTROKE">Gaya Dada</option>
              <option value="BACKSTROKE">Gaya Punggung</option>
              <option value="BUTTERFLY">Gaya Kupu-kupu</option>
              <option value="INDIVIDUALMEDLEY">Gaya Ganti (IM)</option>
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Jarak</option>
              <option value="50">50 Meter</option>
              <option value="100">100 Meter</option>
              <option value="200">200 Meter</option>
              <option value="400">400 Meter</option>
            </select>
          </div>

          {/* Kelompok Umur (KU) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Kelompok Umur (KU)
            </label>
            <select
              value={selectedKU}
              onChange={(e) => setSelectedKU(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua KU</option>
              {dynamicFilterOptions.ageGroups.map((ku) => (
                <option key={ku} value={ku}>
                  {ku}
                </option>
              ))}
            </select>
          </div>

          {/* Nomor Lomba */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Nomor Lomba
            </label>
            <select
              value={selectedEventCode}
              onChange={(e) => setSelectedEventCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Nomor Lomba ({dynamicFilterOptions.eventCodes.length})</option>
              {dynamicFilterOptions.eventCodes.map((ev) => (
                <option key={ev.code} value={String(ev.code)}>
                  {ev.code} - {ev.name} ({ev.gender})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Seri (Heat) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Filter Seri (Heat)
            </label>
            <select
              value={selectedHeatFilter}
              onChange={(e) => setSelectedHeatFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Seri (Heat)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => (
                <option key={h} value={String(h)}>
                  Seri {h}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. MAIN CONTENT: HASIL JUARA VS SUSUNAN BAGAN                */}
      {/* ============================================================ */}
      {activeTab === "juara" ? (
        <ChampionsView
          events={filteredEvents}
          tournamentName={currentTournament?.name}
        />
      ) : loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
          <div className="text-sm font-black text-slate-700">Memuat Bagan Acara Lomba...</div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <div className="text-sm font-black text-slate-800">Tidak ada nomor lomba yang sesuai filter</div>
          <p className="text-xs text-slate-500 font-medium">
            Silakan ganti pilihan turnamen atau reset sub-filter gaya dan jarak lomba.
          </p>
        </div>
      ) : !filteredEvents.some((ev) => ev.heats && ev.heats.length > 0) ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <div className="text-sm font-black text-slate-800">Tidak ada atlet atau susunan seri pada filter ini</div>
          <p className="text-xs text-slate-500 font-medium">
            Pastikan peserta telah diverifikasi pembayarannya dan Buku Acara telah di-generate.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredEvents.map((event) => {
              const isGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
              const heatGroups = groupHeatsByNumber(event.heats || []);

              return (
                <div
                  key={event.event_code}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Event Header Banner */}
                  <div className="bg-slate-900 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-white border-b border-slate-800">
                    <div className="flex items-center gap-3.5 flex-wrap">
                      <div className="px-3.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl font-mono text-xs sm:text-sm font-black text-sky-400 shrink-0 shadow-inner">
                        EVENT #{event.event_code}
                      </div>
                      <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-white">
                        {event.distance} {event.stroke}
                      </h3>
                      {isGroup ? (
                        <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-[10px] font-black tracking-wider uppercase shadow-sm shrink-0">
                          GROUP ABJAD
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-sky-600 text-white rounded-full text-[10px] font-black tracking-wider uppercase shadow-sm shrink-0">
                          HEAT ANGKA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-white/10 rounded-full text-[11px] font-black border border-white/20">
                        {event.gender} • {event.age_group || "OPEN"}
                      </span>
                    </div>
                  </div>

                  {/* Spacious Separated Heat/Group Cards */}
                  <div className="p-4 sm:p-6 space-y-6 bg-slate-50/60">
                    {heatGroups.map((group) => {
                      const labelDisplay = isGroup
                        ? group.heatLabel || String.fromCharCode(64 + group.heatNum)
                        : group.heatNum;
                      const activeSwimmers = group.items.filter((i) => !i.is_empty && i.nama !== "(KOSONG)");

                      return (
                        <div
                          key={group.heatNum}
                          className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
                        >
                          {/* Heat / Group Subheader Bar */}
                          <div className="px-4 py-3 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                                  isGroup
                                    ? "bg-purple-600 text-white shadow-sm"
                                    : "bg-sky-600 text-white shadow-sm"
                                }`}
                              >
                                {isGroup ? `GROUP ${labelDisplay}` : `SERI (HEAT) ${group.heatNum}`}
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                {isGroup ? `Kelompok Group ${labelDisplay}` : `Seri ${group.heatNum}`}
                                <span className="mx-1.5 text-slate-300">•</span>
                                <span className="text-slate-500 font-semibold">{activeSwimmers.length} Atlet Terdaftar</span>
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                              Kapasitas {event.max_lanes || 3} Lintasan
                            </span>
                          </div>

                          {/* Table for this Heat/Cluster */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50/80 font-black text-slate-600 uppercase tracking-wider border-b border-slate-200 text-[10px]">
                                  <th className="py-2.5 px-3 w-16 text-center border-r border-slate-200">
                                    {isGroup ? "GROUP" : "SERI"}
                                  </th>
                                  <th className="py-2.5 px-3 w-20 text-center border-r border-slate-200">LINE</th>
                                  <th className="py-2.5 px-4 border-r border-slate-200">NAMA PERENANG</th>
                                  <th className="py-2.5 px-3 w-24 text-center border-r border-slate-200">JENIS KELAMIN</th>
                                  <th className="py-2.5 px-4 border-r border-slate-200">CLUB</th>
                                  <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200">TIME SEED</th>
                                  <th className="py-2.5 px-4 w-44 text-center border-r border-slate-200">WAKTU HASIL (RESULT)</th>
                                  <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200">PERINGKAT</th>
                                  <th className="py-2.5 px-4 w-44 text-center">TUKAR / PINDAH LINE</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.items.map((item, rIdx) => {
                                  const isEmpty = item.is_empty || item.nama === "(KOSONG)";
                                  const isEditing = editingId === item.registration_id;
                                  const rowLabel = isGroup
                                    ? item.heat_label || String.fromCharCode(64 + item.heat)
                                    : item.heat;

                                  return (
                                    <tr
                                      key={rIdx}
                                      className={`transition-colors ${
                                        isEmpty
                                          ? "bg-slate-50/40 text-slate-400"
                                          : isEditing
                                          ? "bg-amber-50/70"
                                          : "hover:bg-sky-50/40"
                                      }`}
                                    >
                                      {/* HEAT / GROUP */}
                                      <td className="py-3 px-3 text-center font-black text-slate-800 border-r border-slate-100">
                                        <span
                                          className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                            isGroup ? "bg-purple-100 text-purple-900" : "bg-sky-100 text-sky-900"
                                          }`}
                                        >
                                          {isGroup ? `Grp ${rowLabel}` : `H${item.heat}`}
                                        </span>
                                      </td>

                                      {/* LINE WITH QUICK SHIFT ARROWS */}
                                      <td className="py-3 px-3 text-center border-r border-slate-100">
                                        <div className="inline-flex items-center gap-1.5">
                                          <span
                                            className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shadow-sm ${
                                              isEmpty
                                                ? "bg-slate-200 text-slate-500"
                                                : "bg-slate-900 text-white"
                                            }`}
                                          >
                                            {item.line}
                                          </span>
                                          {!isEmpty && (
                                            <div className="flex flex-col gap-0.5 no-print">
                                              <button
                                                type="button"
                                                onClick={() => handleQuickShift(item, -1)}
                                                disabled={item.line <= 1}
                                                className="p-0.5 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-20"
                                                title="Geser Lintasan ke Atas (Nomor Lebih Kecil)"
                                              >
                                                <ChevronUp className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleQuickShift(item, 1)}
                                                disabled={item.line >= (event.max_lanes || 3)}
                                                className="p-0.5 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-20"
                                                title="Geser Lintasan ke Bawah (Nomor Lebih Besar)"
                                              >
                                                <ChevronDown className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* NAMA PERENANG */}
                                      <td className="py-3 px-4 font-black uppercase text-slate-900 border-r border-slate-100">
                                        {isEmpty ? (
                                          <span className="text-slate-400 font-semibold italic">(LINTASAN KOSONG)</span>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <span>{item.nama}</span>
                                            {item.is_finalist && (
                                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] rounded font-black">
                                                FINALIS
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </td>

                                      {/* JENIS KELAMIN */}
                                      <td className="py-3 px-3 text-center font-bold uppercase text-slate-700 border-r border-slate-100">
                                        {isEmpty ? "-" : item.jenis_kelamin}
                                      </td>

                                      {/* CLUB */}
                                      <td className="py-3 px-4 font-bold uppercase text-slate-800 border-r border-slate-100">
                                        {isEmpty ? "-" : item.club}
                                      </td>

                                      {/* TIME SEED */}
                                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 border-r border-slate-100">
                                        {isEmpty ? "-" : item.time_seed}
                                      </td>

                                      {/* WAKTU HASIL (RESULT) - INLINE RECORDING FORM */}
                                      <td className="py-3 px-4 text-center border-r border-slate-100">
                                        {isEmpty ? (
                                          <span className="text-slate-300 font-bold">-</span>
                                        ) : isEditing ? (
                                          <div className="flex flex-col gap-1 items-center justify-center">
                                            <SwimmingTimeInput
                                              value={timeStr}
                                              onChange={(val) => setTimeStr(val)}
                                              onEnter={() => {
                                                if (item.registration_id) saveResult(item.registration_id);
                                              }}
                                              onEscape={() => setEditingId(null)}
                                              autoFocus
                                              size="sm"
                                            />
                                            <div className="flex items-center gap-1.5">
                                              <select
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value)}
                                                className={`w-20 px-1.5 py-1 border rounded-lg text-[10px] font-black cursor-pointer ${
                                                  status === "OK"
                                                    ? "bg-slate-50 border-slate-300 text-slate-700"
                                                    : "bg-rose-50 border-rose-300 text-rose-700"
                                                }`}
                                              >
                                                <option value="OK">OK</option>
                                                <option value="DQ">DQ (Diskualifikasi)</option>
                                                <option value="DNF">DNF (Tidak Selesai)</option>
                                                <option value="DNS">DNS (Batal Hadir)</option>
                                              </select>
                                              <button
                                                type="button"
                                                disabled={savingResultId === item.registration_id}
                                                onClick={() => {
                                                  if (item.registration_id) saveResult(item.registration_id);
                                                }}
                                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all"
                                                title="Simpan Hasil (Enter)"
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingId(null)}
                                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-all"
                                                title="Batal (Esc)"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div
                                            onClick={() => startEdit(item)}
                                            className="cursor-pointer group py-1 px-3 rounded-xl hover:bg-sky-100/70 inline-flex items-center justify-center gap-1.5 transition-colors border border-transparent hover:border-sky-200"
                                            title="Klik untuk input / ubah catatan waktu hasil lomba"
                                          >
                                            <span
                                              className={
                                                item.result && item.result !== "-"
                                                  ? "text-blue-700 font-mono font-black text-xs"
                                                  : "text-slate-400 font-bold text-[11px] group-hover:text-sky-700"
                                              }
                                            >
                                              {item.result && item.result !== "-"
                                                ? item.result
                                                : "+ Catat Waktu"}
                                            </span>
                                            <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-600" />
                                          </div>
                                        )}
                                      </td>

                                      {/* PERINGKAT / RANK */}
                                      <td className="py-3 px-3 text-center border-r border-slate-100">
                                        {isEmpty ? (
                                          "-"
                                        ) : isEditing ? (
                                          <input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={rank}
                                            onChange={(e) => setRank(Number(e.target.value))}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" && item.registration_id) {
                                                saveResult(item.registration_id);
                                              } else if (e.key === "Escape") {
                                                setEditingId(null);
                                              }
                                            }}
                                            className="w-14 px-1 py-1.5 bg-white border-2 border-sky-500 rounded-xl text-center text-xs font-black text-amber-700 shadow-sm focus:outline-none"
                                          />
                                        ) : item.rank && item.rank > 0 ? (
                                          !isGroup ? (
                                            item.rank === 1 ? (
                                              <span className="px-2.5 py-1 rounded-xl font-black text-xs bg-amber-400 text-amber-950 shadow-sm inline-flex items-center gap-1 border border-amber-500">
                                                🥇 Juara 1 (Emas)
                                              </span>
                                            ) : item.rank === 2 ? (
                                              <span className="px-2.5 py-1 rounded-xl font-black text-xs bg-slate-200 text-slate-900 shadow-sm inline-flex items-center gap-1 border border-slate-400">
                                                🥈 Juara 2 (Perak)
                                              </span>
                                            ) : item.rank === 3 ? (
                                              <span className="px-2.5 py-1 rounded-xl font-black text-xs bg-amber-700/20 text-amber-950 shadow-sm inline-flex items-center gap-1 border border-amber-700/30">
                                                🥉 Juara 3 (Perunggu)
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-slate-100 text-slate-700">
                                                Peringkat {item.rank}
                                              </span>
                                            )
                                          ) : item.rank === 1 ? (
                                            <span className="px-2.5 py-1 rounded-xl font-black text-xs inline-flex items-center gap-1 border shadow-xs bg-purple-100 text-purple-950 border-purple-300">
                                              ★ Juara Group ({rowLabel})
                                            </span>
                                          ) : (
                                            <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-slate-100 text-slate-700">
                                              Rank {item.rank}
                                            </span>
                                          )
                                        ) : (
                                          <span className="text-slate-300 font-bold">-</span>
                                        )}
                                      </td>

                                      {/* AKSI JURI & TUKAR POSISI */}
                                      <td className="py-3 px-4 text-center">
                                        {isEmpty ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openFillSlotModal(item.heat, item.line, event)
                                            }
                                            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-[11px] font-black flex items-center gap-1 mx-auto transition-all shadow-sm"
                                            title="Pindahkan atlet lain ke lintasan kosong ini"
                                          >
                                            <UserPlus className="w-3.5 h-3.5 text-sky-600" />
                                            <span>+ Pindah ke Sini</span>
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => openSwapModal(item, event)}
                                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-[11px] font-black flex items-center gap-1.5 mx-auto transition-all shadow-sm hover:border-indigo-400"
                                            title="Tukar posisi perenang dengan seri/lintasan lain"
                                          >
                                            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>⇄ Tukar Posisi</span>
                                          </button>
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
        )
      }

      {/* ============================================================ */}
      {/* 1. POPUP MODAL: TUKAR / PINDAH POSISI PERENANG               */}
      {/* ============================================================ */}
      {swapModalOpen && swimmerToMove && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Pindah / Tukar Posisi Perenang
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    {swimmerToMove.event_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Swimmer Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Data Perenang Saat Ini:
              </div>
              <div className="text-sm font-black text-slate-900 uppercase">
                {swimmerToMove.name}
              </div>
              <div className="text-xs font-bold text-slate-600">
                Klub: {swimmerToMove.club} • Seed: {swimmerToMove.time_seed}
              </div>
              <div className="pt-2">
                <span className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg text-xs font-black">
                  Posisi Sekarang: Seri {swimmerToMove.heat} — Lintasan {swimmerToMove.line}
                </span>
              </div>
            </div>

            {/* Target Seri & Lintasan */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                  Seri (Heat) Tujuan:
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={targetHeat}
                  onChange={(e) => setTargetHeat(Number(e.target.value))}
                  className="w-full bg-slate-50 border-2 border-indigo-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-900 text-center focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                  Lintasan (Line) Tujuan:
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={targetLine}
                  onChange={(e) => setTargetLine(Number(e.target.value))}
                  className="w-full bg-slate-50 border-2 border-indigo-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-900 text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Target Occupant Detection */}
            <div className="p-4 rounded-2xl border text-xs font-bold">
              {currentEventOccupant ? (
                <div className="space-y-2 text-amber-900 bg-amber-50 -m-4 p-4 rounded-2xl border border-amber-300">
                  <div className="flex items-center gap-2 text-amber-700 font-black uppercase text-[11px]">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Lintasan Tujuan Sedang Terisi</span>
                  </div>
                  <p className="text-xs text-amber-950 font-medium">
                    Lintasan {targetLine} pada Seri {targetHeat} saat ini ditempati oleh:{" "}
                    <strong className="uppercase">{currentEventOccupant.nama}</strong> (
                    {currentEventOccupant.club}).
                  </p>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={swapIfOccupied}
                      onChange={(e) => setSwapIfOccupied(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-black text-indigo-950">
                      Tukar Posisi (Swap): {currentEventOccupant.nama} akan otomatis bertukar ke Seri {swimmerToMove.heat} Line {swimmerToMove.line}.
                    </span>
                  </label>
                </div>
              ) : (
                <div className="text-emerald-800 bg-emerald-50 -m-4 p-4 rounded-2xl border border-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Lintasan {targetLine} pada Seri {targetHeat} saat ini <strong>KOSONG</strong>. Perenang akan langsung menempati posisi ini.
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-2xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={swapLoading}
                onClick={handleExecuteSwap}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-black text-xs rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <ArrowLeftRight className={`w-4 h-4 ${swapLoading ? "animate-spin" : ""}`} />
                <span>{swapLoading ? "Memproses..." : "Konfirmasi Pindah / Tukar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. POPUP MODAL: ISI LINTASAN KOSONG                         */}
      {/* ============================================================ */}
      {fillSlotModalOpen && targetSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-sky-100 text-sky-700 rounded-2xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Pindahkan Atlet ke Lintasan Kosong
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    {targetSlot.event_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFillSlotModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-1 text-sky-950">
              <div className="text-[10px] font-black uppercase tracking-wider text-sky-600">
                Slot Target yang Dituju:
              </div>
              <div className="text-sm font-black">
                Seri (Heat) {targetSlot.heat} — Lintasan (Line) {targetSlot.line}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-2">
                Pilih Atlet dari Seri/Line Lain untuk Pindah ke Sini:
              </label>
              <select
                value={selectedSwimmerIdToMove}
                onChange={(e) => setSelectedSwimmerIdToMove(Number(e.target.value))}
                className="w-full bg-slate-50 border-2 border-sky-300 rounded-xl px-4 py-3 text-xs font-black text-slate-900 focus:outline-none focus:border-sky-500"
              >
                <option value={0}>-- Pilih atlet yang ingin dipindahkan --</option>
                {availableSwimmersInEvent.map((h) => (
                  <option key={h.registration_id} value={h.registration_id}>
                    H{h.heat} L{h.line}: {h.nama} ({h.club}) - Seed: {h.time_seed}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFillSlotModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-2xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={swapLoading || !selectedSwimmerIdToMove}
                onClick={handleFillEmptySlot}
                className="flex-1 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs rounded-2xl transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Check className={`w-4 h-4 ${swapLoading ? "animate-spin" : ""}`} />
                <span>{swapLoading ? "Memproses..." : "Pindahkan Atlet ke Sini"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
