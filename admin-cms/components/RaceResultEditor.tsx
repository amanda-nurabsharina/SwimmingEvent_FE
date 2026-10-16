"use client";

import { useState, useMemo, useEffect } from "react";
import {
  getBukuAcara,
  recordRaceResult,
  swapRegistrationHeatLine,
  lockTournamentBukuAcara,
  publishTournamentBukuAcara,
  generateFinalRound,
  PUBLIC_LANDING_URL,
} from "../lib/api-admin";
import { toast, confirmDialog } from "./Toast";
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
  SlidersHorizontal,
} from "lucide-react";
import ChampionsView from "./ChampionsView";
import SwimmingTimeInput from "./SwimmingTimeInput";

interface HeatItem {
  registration_id?: number;
  registration_code?: string;
  heat: number;
  heat_label?: string;
  heat_category?: string;
  line: number;
  nama: string;
  gender?: string;
  jenis_kelamin?: string;
  club: string;
  birth_date?: string;
  age_group?: string;
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

// Check if string represents zero or empty time (e.g. "00", "00.00.00", "00:00.00", "-", "")
export const isZeroOrEmptyTime = (timeStr?: string): boolean => {
  if (!timeStr) return true;
  const clean = timeStr.trim().toUpperCase();
  if (clean === "" || clean === "-" || clean === "NT" || clean === "OK") return true;
  if (clean.includes("DQ") || clean.includes("DNF") || clean.includes("DNS")) return false;
  return !/[1-9]/.test(clean);
};

// Normalize KU string for uniform comparison
export const normalizeKU = (ku?: string): string => {
  if (!ku) return "";
  return ku
    .toUpperCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// Match target with word/alphanumeric boundary so "KU 1" doesn't match "KU 10" or "KU 11"
export const matchKUWord = (source: string, target: string): boolean => {
  if (!source || !target) return false;
  if (source === target) return true;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
  const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
  return regex.test(source);
};

// Check if a KU string represents OPEN / TERBUKA / UMUM category
export const isOpenKU = (ku?: string): boolean => {
  if (!ku) return false;
  const upper = ku.toUpperCase().trim();
  return upper === "OPEN" || upper === "TERBUKA" || upper === "UMUM";
};

// Extract best Kelompok Umur (KU) label for event header display and filter matching
export const getEventKULabel = (event: { age_group?: string; event_name?: string; heats?: any[] }): string => {
  const rawAge = (event.age_group || "").trim();
  if (rawAge !== "") {
    return rawAge.toUpperCase();
  }
  if (event.event_name) {
    const match = event.event_name.match(/\b(KU\s*[0-9]+[A-Za-z]?|SENIOR|MASTERS|OPEN|TERBUKA|UMUM)\b/i);
    if (match) return match[0].toUpperCase();
  }
  if (event.heats && event.heats.length > 0) {
    for (const h of event.heats) {
      if (!h.is_empty && h.age_group && h.age_group.trim() !== "") {
        return h.age_group.trim().toUpperCase();
      }
    }
  }
  return "OPEN";
};

// Check if an individual heat item matches target KU
export const doesHeatItemMatchKU = (
  item: HeatItem,
  targetKU: string,
  eventKU?: string,
  eventName?: string
): boolean => {
  if (!targetKU || targetKU === "ALL") return true;
  if (item.is_empty || !item.nama || item.nama === "(KOSONG)") return false;

  const normTarget = normalizeKU(targetKU);
  const targetIsOpen = isOpenKU(normTarget);

  // 1. Check swimmer's explicit age_group
  if (item.age_group && item.age_group.trim() !== "") {
    const itemKU = normalizeKU(item.age_group);
    if (isOpenKU(itemKU)) return targetIsOpen;
    if (targetIsOpen) return false;
    return matchKUWord(itemKU, normTarget);
  }

  // 2. Fallback to event level age_group or event_name
  const evtAge = normalizeKU(eventKU || "");
  if (evtAge && !isOpenKU(evtAge)) {
    return matchKUWord(evtAge, normTarget);
  }
  if (eventName) {
    const match = eventName.match(/\b(KU\s*[0-9]+[A-Za-z]?|SENIOR|MASTERS|OPEN|TERBUKA|UMUM)\b/i);
    if (match) {
      const nameKU = normalizeKU(match[0]);
      if (isOpenKU(nameKU)) return targetIsOpen;
      return matchKUWord(nameKU, normTarget);
    }
  }

  return targetIsOpen;
};

// Check if an individual heat item matches target Gender
export const doesHeatItemMatchGender = (
  item: HeatItem,
  targetGender: string,
  eventGender?: string,
  eventName?: string
): boolean => {
  if (!targetGender || targetGender === "ALL") return true;
  if (item.is_empty || !item.nama || item.nama === "(KOSONG)") return false;

  const target = targetGender.toUpperCase().trim();
  const raw = (item.gender || item.jenis_kelamin || eventGender || "").toUpperCase().trim();
  let eff = "PUTRA";
  if (raw.includes("PUTRI") || raw.includes("FEMALE") || raw === "P" || raw === "W" || raw.includes("WANITA") || raw.includes("PEREMPUAN")) {
    eff = "PUTRI";
  } else if (raw.includes("PUTRA") || raw.includes("MALE") || raw === "L" || raw.includes("PRIA")) {
    eff = "PUTRA";
  } else if (raw.includes("CAMPURAN") || raw.includes("MIXED")) {
    eff = "CAMPURAN";
  } else if (eventName) {
    const n = eventName.toUpperCase();
    if (n.includes("PUTRI") || n.includes("WANITA") || n.includes("GIRLS") || n.includes("WOMEN")) eff = "PUTRI";
    else if (n.includes("CAMPURAN") || n.includes("MIXED")) eff = "CAMPURAN";
  }

  if (target === "PUTRA" || target === "MALE" || target === "L") return eff === "PUTRA" || eff === "CAMPURAN";
  if (target === "PUTRI" || target === "FEMALE" || target === "P" || target === "W") return eff === "PUTRI" || eff === "CAMPURAN";
  return eff === target;
};

// Match Kelompok Umur (KU) across event age_group, event name, and swimmers in heats
export const matchKU = (
  eventKU?: string,
  eventName?: string,
  heats?: HeatItem[],
  targetKU?: string
): boolean => {
  if (!targetKU || targetKU === "ALL") return true;
  const normTarget = normalizeKU(targetKU);
  const targetIsOpen = isOpenKU(normTarget);

  // 1. Check if event itself explicitly specifies a non-OPEN age_group
  const rawAge = (eventKU || "").trim();
  if (rawAge !== "") {
    const normAge = normalizeKU(rawAge);
    if (isOpenKU(normAge)) {
      if (targetIsOpen) return true;
    } else {
      if (matchKUWord(normAge, normTarget)) return true;
    }
  }

  // 2. Check event name
  if (eventName) {
    const match = eventName.match(/\b(KU\s*[0-9]+[A-Za-z]?|SENIOR|MASTERS|OPEN|TERBUKA|UMUM)\b/i);
    if (match) {
      const normMatch = normalizeKU(match[0]);
      if (isOpenKU(normMatch)) {
        if (targetIsOpen) return true;
      } else {
        if (matchKUWord(normMatch, normTarget)) return true;
      }
    }
  }

  // 3. Check individual swimmers in heats
  if (heats && heats.length > 0) {
    const hasMatch = heats.some((h) => doesHeatItemMatchKU(h, targetKU, eventKU, eventName));
    if (hasMatch) return true;
  }

  return false;
};

// Extract best Gender label for event display and filter matching
export const getEventGenderLabel = (event: { gender?: string; event_name?: string; heats?: any[] }): string => {
  const g = (event.gender || "").toUpperCase().trim();
  if (g.includes("PUTRI") || g.includes("FEMALE") || g === "P" || g === "W" || g.includes("WANITA") || g.includes("PEREMPUAN")) {
    return "PUTRI";
  }
  if (g.includes("PUTRA") || g.includes("MALE") || g === "L" || g === "PRIA") {
    return "PUTRA";
  }
  if (g.includes("CAMPURAN") || g.includes("MIXED")) {
    return "CAMPURAN";
  }

  // Check event name
  const n = (event.event_name || "").toUpperCase().trim();
  if (n.includes("PUTRI") || n.includes("WANITA") || n.includes("GIRLS") || n.includes("WOMEN")) {
    return "PUTRI";
  }
  if (n.includes("PUTRA") || n.includes("PRIA") || n.includes("BOYS") || n.includes("MEN")) {
    return "PUTRA";
  }
  if (n.includes("CAMPURAN") || n.includes("MIXED")) {
    return "CAMPURAN";
  }

  // Check heats
  if (event.heats && event.heats.length > 0) {
    for (const h of event.heats) {
      if (!h.is_empty) {
        const hg = (h.gender || h.jenis_kelamin || "").toUpperCase().trim();
        if (hg.includes("PUTRI") || hg === "P" || hg === "W" || hg.includes("WANITA")) return "PUTRI";
        if (hg.includes("PUTRA") || hg === "L" || hg.includes("PRIA")) return "PUTRA";
      }
    }
  }

  return "PUTRA";
};

// Match Gender (Putra / Putri / Pria / Wanita)
export const matchGender = (
  eventGender: string = "",
  targetGender: string,
  eventName: string = "",
  heats?: any[]
): boolean => {
  if (!targetGender || targetGender === "ALL") return true;
  const target = targetGender.toUpperCase().trim();
  const effectiveGender = getEventGenderLabel({ gender: eventGender, event_name: eventName, heats });

  if (target === "PUTRA" || target === "MALE" || target === "L") {
    return effectiveGender === "PUTRA" || effectiveGender === "CAMPURAN";
  }
  if (target === "PUTRI" || target === "FEMALE" || target === "P" || target === "W") {
    return effectiveGender === "PUTRI" || effectiveGender === "CAMPURAN";
  }
  return effectiveGender === target;
};

// Robust Match Gaya Renang (Stroke) supporting Indonesian and English terms & aliases
export const matchStroke = (
  eventStroke: string = "",
  eventName: string = "",
  targetStroke: string
): boolean => {
  if (!targetStroke || targetStroke === "ALL") return true;
  const s = (eventStroke || "").toUpperCase().trim();
  const n = (eventName || "").toUpperCase().trim();
  const combined = `${s} ${n}`;
  const target = targetStroke.toUpperCase().trim();

  const isFins = combined.includes("FIN") || combined.includes("BIFIN");
  const isKicking = combined.includes("KICK") || combined.includes("BOARD") || combined.includes("PAPAN");

  switch (target) {
    case "FREESTYLE":
      if (isFins || isKicking) return false;
      return combined.includes("FREE") || combined.includes("BEBAS") || combined.includes("CRAWL");

    case "FREESTYLE_FIN":
    case "BIFINS":
      if (!isFins) return false;
      if (
        combined.includes("BACK") ||
        combined.includes("PUNGGUNG") ||
        combined.includes("KUPU") ||
        combined.includes("FLY") ||
        combined.includes("BUTTERFLY") ||
        combined.includes("DADA") ||
        combined.includes("BREAST")
      ) {
        return false;
      }
      return true;

    case "BREASTSTROKE":
      return combined.includes("BREAST") || combined.includes("DADA") || combined.includes("KATAK");

    case "BACKSTROKE":
      if (isFins) return false;
      return combined.includes("BACK") || combined.includes("PUNGGUNG");

    case "BACKSTROKE_FIN":
      return isFins && (combined.includes("BACK") || combined.includes("PUNGGUNG"));

    case "BUTTERFLY":
      if (isFins) return false;
      return combined.includes("BUTTERFLY") || combined.includes("KUPU") || combined.includes("FLY");

    case "BUTTERFLY_FIN":
      return isFins && (combined.includes("BUTTERFLY") || combined.includes("KUPU") || combined.includes("FLY"));

    case "KICKING_BOARD":
      return isKicking;

    case "INDIVIDUALMEDLEY":
    case "MEDLEY":
      return (
        combined.includes("INDIVIDUALMEDLEY") ||
        combined.includes("INDIVIDUAL MEDLEY") ||
        combined.includes("INDIVIDUAL_MEDLEY") ||
        combined.includes("MEDLEY") ||
        combined.includes("GANTI") ||
        combined.includes(" IM") ||
        combined.includes("(IM)") ||
        s === "IM"
      );

    default:
      return s.includes(target) || n.includes(target);
  }
};

// Match Jarak Lomba (Distance) cleanly using numeric extraction
export const matchDistance = (
  eventDistance: string = "",
  eventName: string = "",
  targetDistance: string
): boolean => {
  if (!targetDistance || targetDistance === "ALL") return true;
  const targetNum = targetDistance.replace(/\D/g, "");
  if (!targetNum) return true;

  const d = (eventDistance || "").toUpperCase();
  const dMatches = d.match(/\d+/g);
  if (dMatches && dMatches.includes(targetNum)) return true;

  const n = (eventName || "").toUpperCase();
  const numRegex = new RegExp(`(^|\\D)${targetNum}\\s*(M|MTR|METER)?(\\D|$)`, "i");
  return numRegex.test(n);
};


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
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedEventCode, setSelectedEventCode] = useState<string>("ALL");
  const [selectedHeatFilter, setSelectedHeatFilter] = useState<string>("ALL");
  const [selectedResultStatus, setSelectedResultStatus] = useState<string>("ALL");
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

  // 3b. BULK / EDITABLE TABLE RESULT RECORDING STATE (PER HEAT / GROUP)
  const [bulkEditingHeats, setBulkEditingHeats] = useState<Set<string>>(new Set());
  const [bulkValues, setBulkValues] = useState<{
    [regId: number]: {
      time: string;
      status: "OK" | "DQ" | "DNF" | "DNS";
      rank: number;
    };
  }>({});
  const [savingHeatKey, setSavingHeatKey] = useState<string | null>(null);

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
      toast.error(res?.message || "Gagal mengubah status publikasi");
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
  const fetchBaganData = async (tourneyId?: number, isSilent: boolean = false) => {
    if (!isSilent && eventGroups.length === 0) {
      setLoading(true);
    }
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
      toast.error(res?.message || "Gagal mengubah status kunci Buku Acara");
    }
  };

  // Active filters count for badge and clear button
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategoryFilter !== "ALL") count++;
    if (selectedStroke !== "ALL") count++;
    if (selectedDistance !== "ALL") count++;
    if (selectedKU !== "ALL") count++;
    if (selectedGender !== "ALL") count++;
    if (selectedEventCode !== "ALL") count++;
    if (selectedHeatFilter !== "ALL") count++;
    if (selectedResultStatus !== "ALL") count++;
    if (searchQuery.trim() !== "") count++;
    return count;
  }, [
    selectedCategoryFilter,
    selectedStroke,
    selectedDistance,
    selectedKU,
    selectedGender,
    selectedEventCode,
    selectedHeatFilter,
    selectedResultStatus,
    searchQuery,
  ]);

  const handleResetFilters = () => {
    setSelectedCategoryFilter("ALL");
    setSelectedStroke("ALL");
    setSelectedDistance("ALL");
    setSelectedKU("ALL");
    setSelectedGender("ALL");
    setSelectedEventCode("ALL");
    setSelectedHeatFilter("ALL");
    setSelectedResultStatus("ALL");
    setSearchQuery("");
  };

  // Dynamic filter options from event groups
  const dynamicFilterOptions = useMemo(() => {
    const strokes = new Set<string>();
    const distances = new Set<string>();
    const ageGroups = new Set<string>();
    const eventCodesMap = new Map<number, { code: number; name: string; gender: string; age_group?: string }>();
    let maxHeatFound = 1;

    eventGroups.forEach((eg) => {
      if (eg.stroke) strokes.add(eg.stroke.trim());
      if (eg.distance) distances.add(eg.distance.trim());

      const effectiveKU = getEventKULabel(eg);
      if (effectiveKU && !isOpenKU(effectiveKU)) {
        ageGroups.add(normalizeKU(effectiveKU));
      } else if (isOpenKU(effectiveKU)) {
        ageGroups.add("OPEN");
      }

      const effectiveGender = getEventGenderLabel(eg);

      if (!eventCodesMap.has(eg.event_code)) {
        eventCodesMap.set(eg.event_code, {
          code: eg.event_code,
          name: eg.event_name,
          gender: effectiveGender,
          age_group: effectiveKU,
        });
      }

      eg.heats?.forEach((h) => {
        if (!h.is_empty) {
          if (h.age_group && h.age_group.trim() !== "") {
            const hKU = normalizeKU(h.age_group);
            if (!isOpenKU(hKU)) {
              ageGroups.add(hKU);
            }
          }
          if (h.heat && h.heat > maxHeatFound) {
            maxHeatFound = h.heat;
          }
        }
      });
    });

    const eventCodes = Array.from(eventCodesMap.values()).sort((a, b) => a.code - b.code);

    const standardKUSort = ["KU 6A", "KU 6B", "KU 5", "KU 4", "KU 3", "KU 2", "KU 1", "SENIOR", "OPEN", "TERBUKA"];
    const sortedAgeGroups = Array.from(ageGroups).filter(Boolean).sort((a, b) => {
      const idxA = standardKUSort.findIndex((k) => a.toUpperCase().includes(k));
      const idxB = standardKUSort.findIndex((k) => b.toUpperCase().includes(k));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    const defaultDists = ["25", "50", "100", "200", "400", "800", "1500"];
    const dynamicDists = Array.from(distances).map((d) => d.replace(/\D/g, "")).filter(Boolean);
    const sortedDistances = Array.from(new Set([...defaultDists, ...dynamicDists])).sort(
      (a, b) => Number(a) - Number(b)
    );

    return {
      strokes: Array.from(strokes),
      distances: sortedDistances,
      ageGroups: sortedAgeGroups.length > 0 ? sortedAgeGroups : standardKUSort,
      eventCodes,
      maxHeat: Math.max(maxHeatFound, 10),
    };
  }, [eventGroups]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return eventGroups
      .filter((event) => {
        // 1. Tipe Bagan (Heat vs Group)
        if (selectedCategoryFilter !== "ALL") {
          const isEvtGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
          if (selectedCategoryFilter === "GROUP" && !isEvtGroup) return false;
          if (selectedCategoryFilter === "HEAT" && isEvtGroup) return false;
        }

        // 2. Gaya Renang (Stroke)
        if (selectedStroke !== "ALL") {
          if (!matchStroke(event.stroke, event.event_name, selectedStroke)) return false;
        }

        // 3. Jarak Lomba (Distance)
        if (selectedDistance !== "ALL") {
          if (!matchDistance(event.distance, event.event_name, selectedDistance)) return false;
        }

        // 4. Kelompok Umur (KU) & 5. Gender / Jenis Kelamin
        if (selectedKU !== "ALL" || selectedGender !== "ALL") {
          const hasMatchingSwimmer = event.heats?.some((h) => {
            if (h.is_empty || !h.nama || h.nama === "(KOSONG)") return false;
            const kuOk = selectedKU === "ALL" || doesHeatItemMatchKU(h, selectedKU, event.age_group, event.event_name);
            const genderOk = selectedGender === "ALL" || doesHeatItemMatchGender(h, selectedGender, event.gender, event.event_name);
            return kuOk && genderOk;
          });
          if (!hasMatchingSwimmer) return false;
        }

        // 6. Nomor Lomba (Event Code)
        if (selectedEventCode !== "ALL" && String(event.event_code) !== selectedEventCode) {
          return false;
        }

        // 7. Filter Seri (Heat Number)
        if (selectedHeatFilter !== "ALL") {
          const hasHeat = event.heats?.some((h) => String(h.heat) === selectedHeatFilter);
          if (!hasHeat) return false;
        }

        // 8. Status Hasil Lomba (Pending vs Selesai)
        if (selectedResultStatus !== "ALL") {
          const activeSwimmers = event.heats?.filter((h) => !h.is_empty && h.registration_id) || [];
          if (activeSwimmers.length > 0) {
            const recordedCount = activeSwimmers.filter(
              (h) => h.result && h.result !== "-" && h.result.trim() !== "" && !isZeroOrEmptyTime(h.result)
            ).length;
            const isAllRecorded = recordedCount === activeSwimmers.length;
            if (selectedResultStatus === "PENDING" && isAllRecorded) return false;
            if (selectedResultStatus === "COMPLETED" && !isAllRecorded) return false;
          }
        }

        // 9. Search query (Swimmer name, club, KU, event name, or event code)
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase().trim();
          const matchEv =
            event.event_name?.toLowerCase().includes(q) ||
            String(event.event_code).includes(q) ||
            event.stroke?.toLowerCase().includes(q) ||
            event.distance?.toLowerCase().includes(q);
          const matchSwimmer = event.heats?.some(
            (h) =>
              !h.is_empty &&
              (h.nama?.toLowerCase().includes(q) ||
                h.club?.toLowerCase().includes(q) ||
                (h.age_group && h.age_group.toLowerCase().includes(q)))
          );
          if (!matchEv && !matchSwimmer) return false;
        }

        return true;
      })
      .sort((a, b) => (a.event_code || 0) - (b.event_code || 0));
  }, [
    eventGroups,
    selectedCategoryFilter,
    selectedStroke,
    selectedDistance,
    selectedKU,
    selectedGender,
    selectedEventCode,
    selectedHeatFilter,
    selectedResultStatus,
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
          if (h.result && h.result !== "-" && h.result.trim() !== "" && !isZeroOrEmptyTime(h.result)) {
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

  // Helper to normalize input time string
  const normalizeSwimTime = (raw: string): string => {
    if (!raw) return "-";
    const clean = raw.trim();
    if (isZeroOrEmptyTime(clean)) return "-";
    if (clean === "DQ" || clean === "DNF" || clean === "DNS") return clean;

    const normalized = clean.replace(/:/g, ".");
    const parts = normalized.split(".");
    if (parts.length === 2) {
      const s = parts[0].padStart(2, "0");
      const ms = parts[1].padEnd(2, "0").slice(0, 2);
      return `00.${s}.${ms}`;
    } else if (parts.length >= 3) {
      const m = parts[0].padStart(2, "0");
      const s = parts[1].padStart(2, "0");
      const ms = parts[2].padEnd(2, "0").slice(0, 2);
      return `${m}.${s}.${ms}`;
    }
    return clean;
  };

  // Helper to parse swim time to seconds for auto-rank
  const parseTimeToSeconds = (timeStr?: string): number => {
    if (!timeStr) return 9999999;
    const clean = timeStr.trim().toUpperCase();
    if (
      clean === "" ||
      clean === "-" ||
      isZeroOrEmptyTime(clean) ||
      clean === "NT" ||
      clean.includes("DQ") ||
      clean.includes("DNF") ||
      clean.includes("DNS")
    ) {
      return 9999999;
    }
    const normalized = clean.replace(/:/g, ".");
    const parts = normalized.split(".");
    if (parts.length >= 3) {
      const min = parseFloat(parts[0]) || 0;
      const sec = parseFloat(parts[1]) || 0;
      const ms = parseFloat(parts[2].slice(0, 2)) || 0;
      return min * 60 + sec + ms / 100;
    } else if (parts.length === 2) {
      const sec = parseFloat(parts[0]) || 0;
      const ms = parseFloat(parts[1].slice(0, 2)) || 0;
      return sec + ms / 100;
    }
    const val = parseFloat(normalized);
    return isNaN(val) ? 9999999 : val;
  };

  // Memoized dynamic champion & ranking calculator based on actual recorded result times
  const dynamicRankingsMap = useMemo(() => {
    const map = new Map<number, { rank: number; label: string; isChampion: boolean }>();

    eventGroups.forEach((event) => {
      const isGroup = event.heat_category === "GROUP" || event.heat_category === "CLUSTER";
      const activeSwimmers = (event.heats || []).filter(
        (h) => !h.is_empty && h.registration_id && h.nama && h.nama !== "(KOSONG)"
      );

      if (isGroup) {
        // Group Abjad: Rank swimmers per group / heat
        const groupMap = new Map<number, typeof activeSwimmers>();
        activeSwimmers.forEach((s) => {
          const h = s.heat || 1;
          if (!groupMap.has(h)) groupMap.set(h, []);
          groupMap.get(h)!.push(s);
        });

        groupMap.forEach((swimmers, hNum) => {
          const firstSwimmer = swimmers[0];
          const groupLabel =
            firstSwimmer?.heat_label && /^[A-Z]$/i.test(firstSwimmer.heat_label.trim())
              ? firstSwimmer.heat_label.toUpperCase()
              : hNum >= 1 && hNum <= 26
              ? String.fromCharCode(64 + hNum)
              : String(hNum);

          const valid = swimmers
            .filter((s) => s.result && s.result !== "-" && !isZeroOrEmptyTime(s.result))
            .map((s) => ({
              ...s,
              parsedSec: parseTimeToSeconds(s.result),
            }))
            .filter((s) => s.parsedSec < 9999990)
            .sort((a, b) => a.parsedSec - b.parsedSec);

          valid.forEach((s, idx) => {
            const calculatedRank = idx + 1;
            map.set(s.registration_id!, {
              rank: calculatedRank,
              isChampion: calculatedRank === 1,
              label: calculatedRank === 1 ? `★ Juara Group (${groupLabel})` : `Rank ${calculatedRank}`,
            });
          });
        });
      } else {
        // Heat Angka: Rank swimmers across all heats in the event (Timed Final)
        const valid = activeSwimmers
          .filter((s) => s.result && s.result !== "-" && !isZeroOrEmptyTime(s.result))
          .map((s) => ({
            ...s,
            parsedSec: parseTimeToSeconds(s.result),
          }))
          .filter((s) => s.parsedSec < 9999990)
          .sort((a, b) => a.parsedSec - b.parsedSec);

        valid.forEach((s, idx) => {
          const calculatedRank = idx + 1;
          let label = `Peringkat ${calculatedRank}`;
          if (calculatedRank === 1) label = "🥇 Juara 1 (Emas)";
          else if (calculatedRank === 2) label = "🥈 Juara 2 (Perak)";
          else if (calculatedRank === 3) label = "🥉 Juara 3 (Perunggu)";

          map.set(s.registration_id!, {
            rank: calculatedRank,
            isChampion: calculatedRank <= 3,
            label,
          });
        });
      }
    });

    return map;
  }, [eventGroups]);

  // Start inline result edit
  const startEdit = async (item: HeatItem) => {
    if (!item.registration_id) return;
    if (!isLocked) {
      const ok = await confirmDialog({
        title: "Kunci Buku Acara",
        message:
          "⚠️ Buku Acara belum dikunci!\n\nUntuk memulai pencatatan hasil lomba, Buku Acara harus dipatenkan/dikunci terlebih dahulu agar nomor seri dan lintasan resmi tidak bergeser otomatis.\n\nApakah Anda ingin mengunci Buku Acara sekarang?",
        confirmText: "Ya, Kunci Sekarang",
        cancelText: "Batal",
        variant: "warning",
      });
      if (ok) {
        handleLockBukuAcara(true);
      }
      return;
    }
    setEditingId(item.registration_id);
    let timeVal = item.result !== "-" ? item.result : "";
    let statusVal = "OK";

    if (timeVal.includes("DQ")) {
      statusVal = "DQ";
      timeVal = "";
    } else if (timeVal.includes("DNF")) {
      statusVal = "DNF";
      timeVal = "";
    } else if (timeVal.includes("DNS")) {
      statusVal = "DNS";
      timeVal = "";
    }

    setTimeStr(timeVal);
    setStatus(statusVal);
    const dynamicRank = item.registration_id ? dynamicRankingsMap.get(item.registration_id)?.rank : 0;
    setRank(dynamicRank || item.rank || 0);
  };

  // Save race result with automatic rank calculation
  const saveResult = async (regId: number) => {
    if (!isLocked) {
      toast.warning(
        "Buku Acara belum dikunci! Untuk memulai pencatatan hasil lomba, Buku Acara harus dipatenkan/dikunci terlebih dahulu.",
        { title: "Buku Acara Belum Dikunci" }
      );
      return;
    }

    setSavingResultId(regId);
    let finalTime = timeStr.trim();
    let finalRank = rank;
    const isReset = status === "OK" && isZeroOrEmptyTime(finalTime);

    if (status !== "OK") {
      finalTime = status;
      finalRank = 0;
    } else if (isReset) {
      finalTime = "";
      finalRank = 0;
    } else {
      finalTime = normalizeSwimTime(finalTime);
      // Auto-compute rank based on speed time compared with peers
      const targetEvent = eventGroups.find((eg) =>
        eg.heats.some((h) => h.registration_id === regId)
      );
      if (targetEvent) {
        const isGroupEvent =
          targetEvent.heat_category === "GROUP" || targetEvent.heat_category === "CLUSTER";
        const currentItem = targetEvent.heats.find((h) => h.registration_id === regId);
        const currentHeat = currentItem?.heat || 1;

        // Swimmers in the same ranking scope (whole event for Heat Angka, or same heat for Group Abjad)
        const peerSwimmers = targetEvent.heats.filter(
          (h) =>
            !h.is_empty &&
            h.registration_id &&
            h.nama &&
            h.nama !== "(KOSONG)" &&
            (!isGroupEvent || h.heat === currentHeat)
        );

        const newTargetSec = parseTimeToSeconds(finalTime);
        if (newTargetSec < 9999990) {
          let calcRank = 1;
          peerSwimmers.forEach((p) => {
            if (p.registration_id === regId) return;
            const pTime = p.result;
            if (pTime && pTime !== "-" && !isZeroOrEmptyTime(pTime)) {
              const pSec = parseTimeToSeconds(pTime);
              if (pSec < newTargetSec) {
                calcRank++;
              }
            }
          });
          finalRank = calcRank;
        }
      }
    }

    const res = await recordRaceResult(regId, finalTime, finalRank, status, "preliminary");
    setSavingResultId(null);

    if (res && res.success) {
      setEditingId(null);
      if (isReset) {
        toast.info("Catatan waktu hasil lomba dikosongkan / belum bertanding");
      } else {
        toast.success("Catatan waktu hasil lomba berhasil disimpan!");
      }

      // Update local state in place so the order, heat, and scroll remain completely stable
      setEventGroups((prev) =>
        prev.map((eg) => ({
          ...eg,
          heats: eg.heats.map((h) =>
            h.registration_id === regId
              ? {
                  ...h,
                  result: finalTime || "-",
                  rank: finalRank,
                }
              : h
          ),
        }))
      );

      fetchBaganData(selectedTournamentId, true);
    } else {
      toast.error(res?.message || "Gagal menyimpan hasil lomba");
    }
  };

  // Start bulk editable mode for a heat / group
  const handleStartBulkHeat = (heatKey: string, items: HeatItem[]) => {
    setBulkEditingHeats((prev) => {
      const next = new Set(prev);
      next.add(heatKey);
      return next;
    });

    setBulkValues((prev) => {
      const updated = { ...prev };
      items.forEach((item) => {
        if (!item.registration_id || item.is_empty || item.nama === "(KOSONG)") return;
        let timeVal = item.result && item.result !== "-" ? item.result : "";
        let statusVal: "OK" | "DQ" | "DNF" | "DNS" = "OK";
        if (timeVal.includes("DQ")) {
          statusVal = "DQ";
          timeVal = "";
        } else if (timeVal.includes("DNF")) {
          statusVal = "DNF";
          timeVal = "";
        } else if (timeVal.includes("DNS")) {
          statusVal = "DNS";
          timeVal = "";
        }

        updated[item.registration_id] = {
          time: timeVal,
          status: statusVal,
          rank: item.rank || 0,
        };
      });
      return updated;
    });

    setTimeout(() => {
      const firstActive = items.find((i) => i.registration_id && !i.is_empty && i.nama !== "(KOSONG)");
      if (firstActive?.registration_id) {
        const el = document.querySelector(`input[data-reg-id="${firstActive.registration_id}"]`) as HTMLInputElement | null;
        if (el) {
          el.focus();
          el.select();
        }
      }
    }, 60);
  };

  // Cancel bulk editable mode for a heat / group
  const handleCancelBulkHeat = (heatKey: string) => {
    setBulkEditingHeats((prev) => {
      const next = new Set(prev);
      next.delete(heatKey);
      return next;
    });
  };

  // Update time for a registration in bulk mode
  const handleBulkTimeChange = (regId: number, val: string) => {
    setBulkValues((prev) => ({
      ...prev,
      [regId]: {
        ...(prev[regId] || { status: "OK", rank: 0 }),
        time: val,
      },
    }));
  };

  // Update status for a registration in bulk mode
  const handleBulkStatusChange = (regId: number, statusVal: "OK" | "DQ" | "DNF" | "DNS") => {
    setBulkValues((prev) => ({
      ...prev,
      [regId]: {
        ...(prev[regId] || { time: "", rank: 0 }),
        status: statusVal,
        time: statusVal !== "OK" ? "" : prev[regId]?.time || "",
      },
    }));
  };

  // Update rank for a registration in bulk mode
  const handleBulkRankChange = (regId: number, rankVal: number) => {
    setBulkValues((prev) => ({
      ...prev,
      [regId]: {
        ...(prev[regId] || { time: "", status: "OK" }),
        rank: rankVal,
      },
    }));
  };

  // Auto-Rank all swimmers in this heat based on entered times
  const handleAutoRankHeat = (items: HeatItem[]) => {
    const active = items.filter((i) => i.registration_id && !i.is_empty && i.nama !== "(KOSONG)");
    const evaluated = active.map((item) => {
      const row = bulkValues[item.registration_id!] || { time: item.result || "", status: "OK", rank: 0 };
      const sec = row.status === "OK" ? parseTimeToSeconds(row.time) : 9999999;
      return { regId: item.registration_id!, sec, status: row.status };
    });

    const valid = evaluated.filter((e) => e.sec < 9999990).sort((a, b) => a.sec - b.sec);

    setBulkValues((prev) => {
      const updated = { ...prev };
      valid.forEach((item, idx) => {
        if (updated[item.regId]) {
          updated[item.regId].rank = idx + 1;
        }
      });
      return updated;
    });

    toast.success(`Berhasil mengurutkan ranking untuk ${valid.length} perenang finis!`);
  };

  // Focus next lane input on Enter key
  const focusNextBulkInput = (currentRegId: number, items: HeatItem[]) => {
    const active = items.filter((i) => i.registration_id && !i.is_empty && i.nama !== "(KOSONG)");
    const currIdx = active.findIndex((i) => i.registration_id === currentRegId);
    if (currIdx >= 0 && currIdx < active.length - 1) {
      const nextRegId = active[currIdx + 1].registration_id;
      const el = document.querySelector(`input[data-reg-id="${nextRegId}"]`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  // Save all results in a heat / group
  const handleSaveBulkHeat = async (heatKey: string, items: HeatItem[], label: string | number) => {
    if (!isLocked) {
      toast.warning(
        "Buku Acara belum dikunci! Untuk memulai pencatatan hasil lomba, Buku Acara harus dipatenkan/dikunci terlebih dahulu.",
        { title: "Buku Acara Belum Dikunci" }
      );
      return;
    }

    const active = items.filter((i) => i.registration_id && !i.is_empty && i.nama !== "(KOSONG)");
    if (active.length === 0) return;

    // Automatically calculate ranks for all swimmers in this heat based on their entered times
    const evaluated = active.map((item) => {
      const row = bulkValues[item.registration_id!] || { time: item.result || "", status: "OK", rank: 0 };
      const sec = row.status === "OK" ? parseTimeToSeconds(row.time) : 9999999;
      return { item, row, sec };
    });

    const validSorted = evaluated.filter((e) => e.sec < 9999990).sort((a, b) => a.sec - b.sec);
    const autoAssignedRanks: { [regId: number]: number } = {};
    validSorted.forEach((e, idx) => {
      autoAssignedRanks[e.item.registration_id!] = idx + 1;
    });

    setSavingHeatKey(heatKey);

    const savePromises = active.map(async (item) => {
      const row = bulkValues[item.registration_id!];
      if (!row) return;
      let finalTime = normalizeSwimTime(row.time);
      let finalRank = row.rank > 0 ? row.rank : (autoAssignedRanks[item.registration_id!] || 0);
      if (row.status !== "OK") {
        finalTime = row.status;
        finalRank = 0;
      } else if (isZeroOrEmptyTime(finalTime) || finalTime === "-") {
        finalTime = "";
        finalRank = 0;
      }
      return recordRaceResult(item.registration_id!, finalTime, finalRank, row.status, "preliminary");
    });

    const results = await Promise.all(savePromises);
    setSavingHeatKey(null);

    const hasFailure = results.some((r) => r && !r.success);
    if (hasFailure) {
      toast.error("Sebagian catatan waktu gagal disimpan");
    } else {
      toast.success(`Seluruh catatan waktu ${label} berhasil disimpan!`);
      handleCancelBulkHeat(heatKey);

      // Update local state in place so the order, heat, and scroll remain completely stable
      setEventGroups((prev) =>
        prev.map((eg) => ({
          ...eg,
          heats: eg.heats.map((h) => {
            if (h.registration_id && bulkValues[h.registration_id]) {
              const row = bulkValues[h.registration_id];
              const autoRank = autoAssignedRanks[h.registration_id] || 0;
              const fRank = row.rank > 0 ? row.rank : autoRank;
              return {
                ...h,
                result: row.status !== "OK" ? row.status : row.time || "-",
                rank: row.status !== "OK" ? 0 : fRank,
              };
            }
            return h;
          }),
        }))
      );

      fetchBaganData(selectedTournamentId, true);
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
      toast.warning("Nomor Seri (Heat) dan Lintasan (Line) harus bernilai minimal 1", { title: "Validasi Lintasan" });
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
      toast.success(res.message || "Posisi perenang berhasil dipindahkan / ditukar!");
      fetchBaganData(selectedTournamentId);
      if (onRefresh) onRefresh();
    } else {
      toast.error(res?.message || "Gagal memindahkan posisi perenang");
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
      toast.success(`Lintasan ${item.nama} digeser ke Line ${newLine}`);
      fetchBaganData(selectedTournamentId);
      if (onRefresh) onRefresh();
    } else {
      toast.error(res?.message || "Gagal menggeser lintasan");
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
      toast.warning("Pilih perenang yang ingin dipindahkan ke lintasan kosong ini", { title: "Pilih Perenang" });
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
      toast.success(res.message || "Perenang berhasil dipindahkan ke lintasan kosong!");
      fetchBaganData(selectedTournamentId);
      if (onRefresh) onRefresh();
    } else {
      toast.error(res?.message || "Gagal memindahkan perenang");
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
              href={`${PUBLIC_LANDING_URL}/buku-acara?tournament_id=${selectedTournamentId}&tab=juara`}
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
              onClick={async () => {
                const ok = await confirmDialog({
                  title: "Buka Kunci Buku Acara",
                  message:
                    "Buka kembali kunci Buku Acara ke mode draft?\n\nPerhatian: Jika dibuka, susunan seri & lintasan dapat digenerate ulang.",
                  confirmText: "Ya, Buka Kunci",
                  cancelText: "Batal",
                  variant: "warning",
                });
                if (ok) {
                  handleLockBukuAcara(false);
                }
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-[11px] font-bold transition-all shadow-sm cursor-pointer"
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
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
              title="Refresh Data Bagan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search & Tournament Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Pencarian Atlet / Club / Nomor */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari perenang, nama klub, kelompok umur (KU), atau nomor lomba..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Turnamen Selector */}
          <div className="w-full md:w-72">
            <select
              value={selectedTournamentId}
              onChange={(e) => {
                const newTid = Number(e.target.value);
                setSelectedTournamentId(newTid);
                if (onSelectTournamentId) onSelectTournamentId(newTid);
                handleResetFilters();
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-2xs"
            >
              {tournaments.length === 0 ? (
                <option value={0}>Memuat turnamen...</option>
              ) : (
                tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    🏆 {t.name} {t.is_active ? "(Aktif)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Filter Section Header & Grid */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Filter Nomor Lomba & Bagan
              </span>
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Filter ({activeFiltersCount})</span>
              </button>
            )}
          </div>

          {/* Primary Filter Grid - Balanced 4 Columns across 2 Rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Nomor Lomba */}
            <div>
              <label className="h-4 text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                <span>#️⃣</span>
                <span>Nomor Lomba</span>
              </label>
              <select
                value={selectedEventCode}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedEventCode(val);
                  if (val !== "ALL") {
                    const targetEv = eventGroups.find((eg) => String(eg.event_code) === val);
                    if (targetEv) {
                      if (selectedKU !== "ALL" && !matchKU(targetEv.age_group, targetEv.event_name, targetEv.heats, selectedKU)) {
                        setSelectedKU("ALL");
                      }
                      if (selectedGender !== "ALL" && !matchGender(targetEv.gender, selectedGender, targetEv.event_name, targetEv.heats)) {
                        setSelectedGender("ALL");
                      }
                    }
                  }
                }}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer"
              >
                <option value="ALL">Semua Nomor Lomba ({dynamicFilterOptions.eventCodes.length})</option>
                {dynamicFilterOptions.eventCodes.map((ev) => (
                  <option key={ev.code} value={String(ev.code)}>
                    #{ev.code} - {ev.name} ({ev.gender})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Kelompok Umur (KU) */}
            <div>
              <label className="h-4 text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                <span>🎂</span>
                <span>Kelompok Umur (KU)</span>
              </label>
              <select
                value={selectedKU}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedKU(val);
                  if (selectedEventCode !== "ALL" && val !== "ALL") {
                    const currentEv = eventGroups.find((eg) => String(eg.event_code) === selectedEventCode);
                    if (currentEv && !matchKU(currentEv.age_group, currentEv.event_name, currentEv.heats, val)) {
                      setSelectedEventCode("ALL");
                    }
                  }
                }}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer"
              >
                <option value="ALL">Semua Kelompok Umur</option>
                {dynamicFilterOptions.ageGroups.map((ku) => (
                  <option key={ku} value={ku}>
                    {ku}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Gender */}
            <div>
              <label className="h-4 text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                <span>👤</span>
                <span>Jenis Kelamin</span>
              </label>
              <select
                value={selectedGender}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedGender(val);
                  if (selectedEventCode !== "ALL" && val !== "ALL") {
                    const currentEv = eventGroups.find((eg) => String(eg.event_code) === selectedEventCode);
                    if (currentEv && !matchGender(currentEv.gender, val, currentEv.event_name, currentEv.heats)) {
                      setSelectedEventCode("ALL");
                    }
                  }
                }}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer"
              >
                <option value="ALL">Semua Gender (Putra & Putri)</option>
                <option value="PUTRA">Putra</option>
                <option value="PUTRI">Putri</option>
              </select>
            </div>

            {/* 4. Tipe Bagan */}
            <div>
              <label className="h-4 text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                <span>📊</span>
                <span>Tipe Bagan</span>
              </label>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer"
              >
                <option value="ALL">Semua Bagan (Heat & Group)</option>
                <option value="HEAT">Heat Angka (1, 2, 3...)</option>
                <option value="GROUP">Group Abjad (A, B, C...)</option>
              </select>
            </div>

            {/* 5. Gaya Renang */}
            <div>
              <label className="h-4 text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                <span>🏊‍♂️</span>
                <span>Gaya Renang</span>
              </label>
              <select
                value={selectedStroke}
                onChange={(e) => setSelectedStroke(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer"
              >
                <option value="ALL">Semua Gaya Renang</option>
                <option value="FREESTYLE">Gaya Bebas</option>
                <option value="FREESTYLE_FIN">Freestyle FIN</option>
                <option value="BREASTSTROKE">Gaya Dada</option>
                <option value="BACKSTROKE">Gaya Punggung</option>
                <option value="BACKSTROKE_FIN">Backstroke FIN</option>
                <option value="BUTTERFLY">Gaya Kupu-kupu</option>
                <option value="BUTTERFLY_FIN">Butterfly FIN</option>
                <option value="INDIVIDUALMEDLEY">Gaya Ganti (IM)</option>
                <option value="KICKING_BOARD">Kicking Board</option>
              </select>
            </div>

            {/* 6. Jarak Lomba */}
            <div>
              <label className="h-4 text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                <span>📏</span>
                <span>Jarak Lomba</span>
              </label>
              <select
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer"
              >
                <option value="ALL">Semua Jarak Lomba</option>
                {dynamicFilterOptions.distances.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist} Meter
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Filter Seri (Heat) */}
            <div>
              <label className="h-4 text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                <span>🔥</span>
                <span>Filter Seri (Heat)</span>
              </label>
              <select
                value={selectedHeatFilter}
                onChange={(e) => setSelectedHeatFilter(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer"
              >
                <option value="ALL">Semua Seri / Heat</option>
                {Array.from({ length: dynamicFilterOptions.maxHeat }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={String(h)}>
                    Seri (Heat) {h}
                  </option>
                ))}
              </select>
            </div>

            {/* 8. Status Hasil */}
            <div>
              <label className="h-4 text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                <span>⏱️</span>
                <span>Status Hasil Lomba</span>
              </label>
              <select
                value={selectedResultStatus}
                onChange={(e) => setSelectedResultStatus(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer"
              >
                <option value="ALL">Semua Status Catatan</option>
                <option value="PENDING">Belum Lengkap / Masih Ada Kosong</option>
                <option value="COMPLETED">Sudah Selesai (Semua Finis)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters Bar & Reset Action */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black text-slate-600 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sky-600" />
                <span>{activeFiltersCount} Filter Aktif:</span>
              </span>

              {selectedCategoryFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-2xs">
                  Bagan: {selectedCategoryFilter}
                  <button type="button" onClick={() => setSelectedCategoryFilter("ALL")} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedStroke !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-2xs">
                  Gaya: {selectedStroke}
                  <button type="button" onClick={() => setSelectedStroke("ALL")} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedDistance !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-2xs">
                  Jarak: {selectedDistance}m
                  <button type="button" onClick={() => setSelectedDistance("ALL")} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedKU !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold rounded-lg shadow-2xs">
                  KU: {selectedKU}
                  <button type="button" onClick={() => setSelectedKU("ALL")} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedGender !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-2xs">
                  Gender: {selectedGender}
                  <button type="button" onClick={() => setSelectedGender("ALL")} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedEventCode !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-2xs">
                  Nomor: #{selectedEventCode}
                  <button type="button" onClick={() => setSelectedEventCode("ALL")} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedHeatFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-2xs">
                  Seri: {selectedHeatFilter}
                  <button type="button" onClick={() => setSelectedHeatFilter("ALL")} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedResultStatus !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-2xs">
                  Status: {selectedResultStatus === "PENDING" ? "Belum Lengkap" : "Selesai"}
                  <button type="button" onClick={() => setSelectedResultStatus("ALL")} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-100 border border-sky-300 text-sky-900 text-[10px] font-bold rounded-lg shadow-2xs">
                  Cari: &ldquo;{searchQuery}&rdquo;
                  <button type="button" onClick={() => setSearchQuery("")} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Reset semua filter ke posisi awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. MAIN CONTENT: HASIL JUARA VS SUSUNAN BAGAN                */}
      {/* ============================================================ */}
      {activeTab === "juara" ? (
        <ChampionsView
          events={filteredEvents as any}
          tournamentName={currentTournament?.name}
        />
      ) : loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
          <div className="text-sm font-black text-slate-700">Memuat Bagan Acara Lomba...</div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <div className="space-y-1">
            <div className="text-base font-black text-slate-800">Tidak ada nomor lomba yang sesuai filter</div>
            <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
              Tidak ditemukan nomor lomba atau atlet dengan kombinasi filter yang dipilih saat ini.
            </p>
          </div>
          {activeFiltersCount > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-md shadow-sky-600/20 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Filter ({activeFiltersCount})</span>
              </button>
            </div>
          )}
        </div>
      ) : !filteredEvents.some((ev) => ev.heats && ev.heats.length > 0) ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <div className="space-y-1">
            <div className="text-base font-black text-slate-800">Tidak ada atlet atau susunan seri pada filter ini</div>
            <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
              Pastikan peserta telah diverifikasi pembayarannya dan Buku Acara telah di-generate.
            </p>
          </div>
          {activeFiltersCount > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-md shadow-sky-600/20 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredEvents.map((event) => {
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
                    if (selectedKU !== "ALL" && !doesHeatItemMatchKU(item, selectedKU, event.age_group, event.event_name)) {
                      return false;
                    }
                    if (selectedGender !== "ALL" && !doesHeatItemMatchGender(item, selectedGender, event.gender, event.event_name)) {
                      return false;
                    }
                    return true;
                  });
                  return { ...group, items: filteredItems };
                })
                .filter((group) => {
                  if (selectedHeatFilter !== "ALL" && String(group.heatNum) !== selectedHeatFilter) {
                    return false;
                  }
                  if (selectedKU !== "ALL" || selectedGender !== "ALL") {
                    return group.items.some((i) => !i.is_empty && i.nama && i.nama !== "(KOSONG)");
                  }
                  return true;
                });

              return (
                <div
                  key={event.event_code}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Event Header Banner */}
                  <div className={`p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-white border-b ${
                    isPutri
                      ? "bg-slate-900 border-rose-900/50"
                      : "bg-slate-900 border-sky-900/50"
                  }`}>
                    <div className="flex items-center gap-3.5 flex-wrap">
                      <div className={`px-3.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black shrink-0 shadow-inner border ${
                        isPutri
                          ? "bg-rose-950/60 border-rose-800/80 text-rose-400"
                          : "bg-slate-800 border-slate-700 text-sky-400"
                      }`}>
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
                        <span className={`px-3 py-1 ${isPutri ? "bg-rose-600" : "bg-sky-600"} text-white rounded-full text-[10px] font-black tracking-wider uppercase shadow-sm shrink-0`}>
                          HEAT ANGKA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3.5 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider ${
                        isPutri
                          ? "bg-rose-600/30 text-rose-300 border-rose-500/50 shadow-xs"
                          : "bg-sky-600/30 text-sky-300 border-sky-500/50 shadow-xs"
                      }`}>
                        {displayGender} • {displayKU}
                      </span>
                    </div>
                  </div>

                  {/* Spacious Separated Heat/Group Cards */}
                  <div className="p-4 sm:p-6 space-y-6 bg-slate-50/60">
                    {visibleHeatGroups.map((group) => {
                      const labelDisplay = isGroup
                        ? group.heatLabel || String.fromCharCode(64 + group.heatNum)
                        : group.heatNum;
                      const activeSwimmers = group.items.filter((i) => !i.is_empty && i.nama !== "(KOSONG)");

                      return (
                        <div
                          key={group.heatNum}
                          className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                            isPutri ? "border-rose-100" : "border-slate-200/90"
                          }`}
                        >
                          {/* Heat / Group Subheader Bar */}
                          <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                            isPutri
                              ? "bg-rose-50/80 border-rose-200/70"
                              : "bg-slate-100/90 border-slate-200"
                          }`}>
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                                  isGroup
                                    ? "bg-purple-600 text-white shadow-sm"
                                    : isPutri
                                    ? "bg-rose-600 text-white shadow-sm"
                                    : "bg-sky-600 text-white shadow-sm"
                                }`}
                              >
                                {isGroup ? `GROUP ${labelDisplay}` : `SERI (HEAT) ${group.heatNum}`}
                              </span>
                              <span className={`text-xs font-bold ${isPutri ? "text-rose-950" : "text-slate-700"}`}>
                                {isGroup ? `Kelompok Group ${labelDisplay}` : `Seri ${group.heatNum}`}
                                <span className="mx-1.5 text-slate-300">•</span>
                                <span className={`font-semibold ${isPutri ? "text-rose-700/80" : "text-slate-500"}`}>{activeSwimmers.length} Atlet Terdaftar</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {bulkEditingHeats.has(`${event.event_code}-heat-${group.heatNum}`) ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAutoRankHeat(group.items)}
                                    className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                                    title="Otomatis tentukan ranking 1, 2, 3... berdasarkan catatan waktu tercepat di heat ini"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Auto Rank</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={savingHeatKey === `${event.event_code}-heat-${group.heatNum}`}
                                    onClick={() => handleSaveBulkHeat(`${event.event_code}-heat-${group.heatNum}`, group.items, isGroup ? `Group ${labelDisplay}` : `Seri ${group.heatNum}`)}
                                    className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                  >
                                    {savingHeatKey === `${event.event_code}-heat-${group.heatNum}` ? (
                                      <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Menyimpan...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Simpan Waktu {isGroup ? `Group ${labelDisplay}` : `Seri ${group.heatNum}`}</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={savingHeatKey === `${event.event_code}-heat-${group.heatNum}`}
                                    onClick={() => handleCancelBulkHeat(`${event.event_code}-heat-${group.heatNum}`)}
                                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Batal</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  {activeSwimmers.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartBulkHeat(`${event.event_code}-heat-${group.heatNum}`, group.items)}
                                      className={`px-3 py-1 text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                                        isGroup
                                          ? "bg-purple-600 hover:bg-purple-700 text-white"
                                          : isPutri
                                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                                          : "bg-sky-600 hover:bg-sky-700 text-white"
                                      }`}
                                      title="Klik untuk membuka input waktu semua perenang di heat ini secara langsung (editable table)"
                                    >
                                      <Zap className="w-3.5 h-3.5" />
                                      <span>Catat Waktu {isGroup ? `Group ${labelDisplay}` : `Seri ${group.heatNum}`}</span>
                                    </button>
                                  )}
                                </>
                              )}

                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-white ${
                                isPutri ? "text-rose-700 border-rose-200" : "text-slate-500 border-slate-200"
                              }`}>
                                Kapasitas {event.max_lanes || 3} Lintasan
                              </span>
                            </div>
                          </div>

                          {/* Table for this Heat/Cluster */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className={`font-black uppercase tracking-wider border-b text-[10px] ${
                                  isPutri
                                    ? "bg-rose-50/90 text-rose-900 border-rose-200/80"
                                    : "bg-sky-50/80 text-sky-950 border-sky-200/80"
                                }`}>
                                  <th className={`py-2.5 px-2 w-20 min-w-[5rem] text-center border-r whitespace-nowrap ${isPutri ? "border-rose-100" : "border-slate-200"}`}>
                                    {isGroup ? "GROUP" : "SERI"}
                                  </th>
                                  <th className={`py-2.5 px-3 w-20 text-center border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>LINE</th>
                                  <th className={`py-2.5 px-4 border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>NAMA PERENANG</th>
                                  <th className={`py-2.5 px-3 w-24 text-center border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>JENIS KELAMIN</th>
                                  <th className={`py-2.5 px-4 border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>CLUB</th>
                                  <th className={`py-2.5 px-3 w-28 text-center border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>TIME SEED</th>
                                  <th className={`py-2.5 px-4 w-44 text-center border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>WAKTU HASIL (RESULT)</th>
                                  <th className={`py-2.5 px-3 w-28 text-center border-r ${isPutri ? "border-rose-100" : "border-slate-200"}`}>PERINGKAT</th>
                                  <th className="py-2.5 px-4 w-44 text-center">TUKAR / PINDAH LINE</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.items.map((item, rIdx) => {
                                  const isEmpty = item.is_empty || item.nama === "(KOSONG)";
                                  const heatKey = `${event.event_code}-heat-${group.heatNum}`;
                                  const isBulkEditing = bulkEditingHeats.has(heatKey);
                                  const isBulkRow = isBulkEditing && !isEmpty && Boolean(item.registration_id);
                                  const bulkRow = item.registration_id ? bulkValues[item.registration_id] : undefined;
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
                                      <td className="py-3 px-2 text-center font-black text-slate-800 border-r border-slate-100 whitespace-nowrap">
                                        <span
                                          className={`inline-flex items-center justify-center whitespace-nowrap min-w-[3.5rem] px-2.5 py-1 rounded-lg text-xs font-black tracking-wide ${
                                            isGroup ? "bg-purple-100 text-purple-900 border border-purple-200/80 shadow-2xs" : "bg-sky-100 text-sky-900 border border-sky-200/80 shadow-2xs"
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
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span>{item.nama}</span>
                                            {item.age_group && (
                                              <span
                                                className={`px-1.5 py-0.5 text-[10px] rounded font-bold border transition ${
                                                  selectedKU !== "ALL" &&
                                                  normalizeKU(item.age_group).includes(normalizeKU(selectedKU))
                                                    ? "bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-400/40 font-black shadow-xs"
                                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                                }`}
                                                title={`Kelompok Umur (KU): ${item.age_group}`}
                                              >
                                                {item.age_group}
                                              </span>
                                            )}
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
                                        {isEmpty ? "-" : (item.gender || item.jenis_kelamin || "-")}
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
                                      <td className={`py-3 px-4 text-center border-r border-slate-100 ${isBulkRow ? "bg-amber-50/50" : ""}`}>
                                        {isEmpty ? (
                                          <span className="text-slate-300 font-bold">-</span>
                                        ) : isBulkRow ? (
                                          <div className="flex items-center justify-center gap-1.5">
                                            {bulkRow?.status === "OK" ? (
                                              <SwimmingTimeInput
                                                value={bulkRow?.time || "00.00.00"}
                                                onChange={(val) => handleBulkTimeChange(item.registration_id!, val)}
                                                onEnter={() => focusNextBulkInput(item.registration_id!, group.items)}
                                                dataRegId={item.registration_id}
                                                size="sm"
                                              />
                                            ) : (
                                              <div className="h-8 px-3 bg-rose-100 text-rose-800 rounded-2xl text-xs font-black tracking-wider uppercase border-2 border-rose-300 flex items-center justify-center min-w-[7.5rem]">
                                                {bulkRow?.status}
                                              </div>
                                            )}
                                            <select
                                              value={bulkRow?.status || "OK"}
                                              onChange={(e) => handleBulkStatusChange(item.registration_id!, e.target.value as any)}
                                              className={`h-8 px-1.5 text-[10px] font-black rounded-xl border-2 outline-none cursor-pointer transition ${
                                                bulkRow?.status === "OK"
                                                  ? "bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400"
                                                  : "bg-rose-50 text-rose-800 border-rose-300 font-bold"
                                              }`}
                                            >
                                              <option value="OK">OK</option>
                                              <option value="DQ">DQ</option>
                                              <option value="DNF">DNF</option>
                                              <option value="DNS">DNS</option>
                                            </select>
                                          </div>
                                        ) : isEditing ? (
                                          <div className="flex flex-col gap-1 items-center justify-center">
                                            {status === "OK" ? (
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
                                            ) : (
                                              <div className="py-1 px-3 bg-rose-100 text-rose-800 rounded-xl text-xs font-black tracking-wider uppercase border border-rose-300 shadow-2xs">
                                                Status: {status}
                                              </div>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                              <select
                                                value={status}
                                                onChange={(e) => {
                                                  const nextStatus = e.target.value;
                                                  setStatus(nextStatus);
                                                  if (nextStatus !== "OK") {
                                                    setTimeStr("");
                                                  }
                                                }}
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
                                                item.result && item.result !== "-" && !isZeroOrEmptyTime(item.result)
                                                  ? "text-blue-700 font-mono font-black text-xs"
                                                  : "text-slate-400 font-bold text-[11px] group-hover:text-sky-700"
                                              }
                                            >
                                              {item.result && item.result !== "-" && !isZeroOrEmptyTime(item.result) ? (
                                                item.result.includes("DQ") || item.result.includes("DNF") || item.result.includes("DNS") ? (
                                                  <span className={`px-2 py-0.5 rounded-lg font-black text-xs uppercase shadow-2xs ${
                                                    item.result.includes("DQ")
                                                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                                                      : "bg-amber-100 text-amber-800 border border-amber-300"
                                                  }`}>
                                                    {item.result.includes("DQ") ? "DQ" : item.result.includes("DNF") ? "DNF" : "DNS"}
                                                  </span>
                                                ) : (
                                                  item.result
                                                )
                                              ) : (
                                                "+ Catat Waktu"
                                              )}
                                            </span>
                                            <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-600" />
                                          </div>
                                        )}
                                      </td>

                                      {/* PERINGKAT / RANK */}
                                      <td className={`py-3 px-3 text-center border-r border-slate-100 ${isBulkRow ? "bg-amber-50/50" : ""}`}>
                                        {isEmpty ? (
                                          "-"
                                        ) : isBulkRow ? (
                                          <input
                                            type="number"
                                            min={0}
                                            max={20}
                                            value={bulkRow?.rank || ""}
                                            placeholder="-"
                                            onChange={(e) => handleBulkRankChange(item.registration_id!, Number(e.target.value))}
                                            className="w-12 px-1 py-1 text-center font-mono font-black text-xs bg-white border-2 border-amber-400 rounded-xl text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                            title="Peringkat (atau klik Auto Rank di atas)"
                                          />
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
                                        ) : (() => {
                                          const dynamicInfo = item.registration_id ? dynamicRankingsMap.get(item.registration_id) : undefined;
                                          const effectiveRank = dynamicInfo ? dynamicInfo.rank : (item.rank || 0);
                                          const hasResult = item.result && item.result !== "-" && !isZeroOrEmptyTime(item.result);

                                          if (!hasResult || effectiveRank <= 0) {
                                            return <span className="text-slate-300 font-bold">-</span>;
                                          }

                                          if (!isGroup) {
                                            if (effectiveRank === 1) {
                                              return (
                                                <span className="px-2.5 py-1 rounded-xl font-black text-xs bg-amber-400 text-amber-950 shadow-sm inline-flex items-center gap-1 border border-amber-500">
                                                  🥇 Juara 1 (Emas)
                                                </span>
                                              );
                                            } else if (effectiveRank === 2) {
                                              return (
                                                <span className="px-2.5 py-1 rounded-xl font-black text-xs bg-slate-200 text-slate-900 shadow-sm inline-flex items-center gap-1 border border-slate-400">
                                                  🥈 Juara 2 (Perak)
                                                </span>
                                              );
                                            } else if (effectiveRank === 3) {
                                              return (
                                                <span className="px-2.5 py-1 rounded-xl font-black text-xs bg-amber-700/20 text-amber-950 shadow-sm inline-flex items-center gap-1 border border-amber-700/30">
                                                  🥉 Juara 3 (Perunggu)
                                                </span>
                                              );
                                            } else {
                                              return (
                                                <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-slate-100 text-slate-700">
                                                  Peringkat {effectiveRank}
                                                </span>
                                              );
                                            }
                                          } else {
                                            if (effectiveRank === 1) {
                                              return (
                                                <span className="px-2.5 py-1 rounded-xl font-black text-xs inline-flex items-center gap-1 border shadow-xs bg-purple-100 text-purple-950 border-purple-300">
                                                  ★ Juara Group ({rowLabel})
                                                </span>
                                              );
                                            } else {
                                              return (
                                                <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-slate-100 text-slate-700">
                                                  Rank {effectiveRank}
                                                </span>
                                              );
                                            }
                                          }
                                        })()}
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
