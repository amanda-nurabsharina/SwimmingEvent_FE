"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getBukuAcara, getTournaments, getStartingList } from "../../lib/api-client";
import {
  Trophy,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Tv,
  Users,
  Timer,
  Search,
  Sun,
  Clock,
  MapPin,
  CheckCircle2,
  Zap,
  RotateCcw,
  SlidersHorizontal,
  Medal,
  Award,
  Sparkles,
  Filter,
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface ParticipantEntry {
  id: number | string;
  eventCode: string | number;
  heat: number;
  lane: number;
  seedTime: string;
  resultTime: string;
  status: "BELUM TANDING" | "BERLOMBA" | "SELESAI";
  name: string;
  ku: string;
  gender: "L" | "P";
  club: string;
  rank?: number;
}

interface LivePoolLane {
  laneNumber: number;
  blockNumber: number;
  swimmerName: string;
  club: string;
  seedTime: string;
  resultTime?: string;
  rank?: number;
  isRacing: boolean;
}

interface LivePoolEvent {
  eventCode: string | number;
  eventName: string;
  gender: string;
  ku: string;
  heatCurrent: number;
  heatTotal: number;
  blockRange: string;
  lanes: LivePoolLane[];
}

interface CallingRoomEvent {
  matchKey: string;
  eventCode: string | number;
  eventName: string;
  gender: string;
  ku: string;
  estimatedTime: string;
  heatCurrent: number;
  heatTotal: number;
  lanes: {
    laneNumber: number;
    swimmerName: string;
    club: string;
    seedTime: string;
  }[];
}

interface PodiumItem {
  eventCode: string | number;
  eventName: string;
  ku: string;
  rank: number;
  swimmerName: string;
  resultTime: string;
  timeDiff: string;
  heatLane: string;
  club: string;
}

// Speed time parser helper for single/multi-round swimming competitions
function parseSpeedTimeToSeconds(timeStr?: string): number {
  if (!timeStr) return 9999999;
  const clean = timeStr.trim().toUpperCase();
  if (
    clean === "" ||
    clean === "-" ||
    clean === "NT" ||
    clean.includes("DQ") ||
    clean.includes("DNF") ||
    clean.includes("DNS") ||
    clean.includes("RANK") ||
    clean.startsWith("99")
  ) {
    return 9999999;
  }

  const colonParts = clean.split(":");
  if (colonParts.length === 3) {
    if (colonParts[2].includes(".")) {
      const h = parseFloat(colonParts[0]) || 0;
      const m = parseFloat(colonParts[1]) || 0;
      const s = parseFloat(colonParts[2]) || 0;
      return h * 3600 + m * 60 + s;
    } else {
      const m = parseFloat(colonParts[0]) || 0;
      const s = parseFloat(colonParts[1]) || 0;
      const cs = parseFloat(colonParts[2].slice(0, 2)) || 0;
      return m * 60 + s + cs / 100;
    }
  } else if (colonParts.length === 2) {
    const m = parseFloat(colonParts[0]) || 0;
    const secParts = colonParts[1].split(".");
    if (secParts.length === 2) {
      const s = parseFloat(secParts[0]) || 0;
      const cs = parseFloat(secParts[1].slice(0, 2)) || 0;
      return m * 60 + s + cs / 100;
    } else {
      const s = parseFloat(colonParts[1]) || 0;
      return m * 60 + s;
    }
  } else {
    const val = parseFloat(clean);
    return isNaN(val) ? 9999999 : val;
  }
}

function formatSpeedDiff(diff: number): string {
  if (diff <= 0.001) return "0.00s";
  return `+${diff.toFixed(2)}s`;
}

interface Slide4EventData {
  eventCode: string | number;
  eventName: string;
  distance: string;
  stroke: string;
  gender: string;
  ageGroup: string;
  isGroup: boolean;
  hasResults: boolean;
  totalSwimmers: number;
  overallChampions: {
    rank: 1 | 2 | 3;
    swimmerName: string;
    club: string;
    resultTime: string;
    timeDiff: string;
    heatLane: string;
    heat: number;
    lane: number;
    parsedSeconds: number;
  }[];
  heatBreakdowns: {
    heatNum: number;
    champions: {
      rank: 1 | 2 | 3;
      swimmerName: string;
      club: string;
      resultTime: string;
      heatLane: string;
      lane: number;
      timeDiff: string;
    }[];
  }[];
  groupBreakdowns: {
    groupNum: number;
    groupLabel: string;
    champions: {
      rank: 1 | 2 | 3;
      swimmerName: string;
      club: string;
      resultTime: string;
      lane: number;
      heatLane: string;
      timeDiff: string;
    }[];
    allSwimmersCount: number;
  }[];
}

function LiveScoreboardContent() {
  const searchParams = useSearchParams();
  const urlTourneyId = searchParams.get("tournament_id");

  // Tournament & Data States
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(0);
  const [realEventGroups, setRealEventGroups] = useState<any[]>([]);
  const [realStartingList, setRealStartingList] = useState<any[]>([]);

  // Manual Live Selection & Calling Room States
  // manualLiveMatches stores an array of { eventCode, heat } set to live in the pool
  const [manualLiveMatches, setManualLiveMatches] = useState<{ eventCode: string | number; heat: number }[]>([]);
  const [callingFilterEvent, setCallingFilterEvent] = useState<string>("all");
  const [callingFilterHeat, setCallingFilterHeat] = useState<string>("all");
  const [accelerationNotice, setAccelerationNotice] = useState<string | null>(null);

  // Playback & Slide States
  const [activeSlide, setActiveSlide] = useState<1 | 2 | 3 | 4>(2); // Default to Slide 2: Live & Calling Room
  const [slide1Page, setSlide1Page] = useState<number>(1);
  const [slide3Page, setSlide3Page] = useState<number>(1);
  const [slide4Page, setSlide4Page] = useState<number>(1);
  const [slide4CategoryFilter, setSlide4CategoryFilter] = useState<"ALL" | "HEAT" | "GROUP">("ALL");
  const [slide4StatusFilter, setSlide4StatusFilter] = useState<"ALL" | "HAS_RESULTS">("ALL");
  const [slide4Search, setSlide4Search] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [slideDuration, setSlideDuration] = useState<number>(6);
  const [progress, setProgress] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [isOutdoorMode, setIsOutdoorMode] = useState<boolean>(false);

  // Pool Mode Filter on Slide 2 (1 Acara, 2 Acara, 3 Acara Maks)
  const [poolMode, setPoolMode] = useState<1 | 2 | 3>(1);

  // Search Filter on Slide 1
  const [searchQuery, setSearchQuery] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<any>(null);

  // 1. Digital Clock (Realtime WIB)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Tournaments
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

  // 3. Fetch Real Data from API
  const fetchRealData = async (tid?: number) => {
    const targetId = tid !== undefined ? tid : selectedTournamentId;
    if (targetId <= 0) return;
    try {
      const [resBuku, resStart] = await Promise.all([
        getBukuAcara(targetId, "preliminary"),
        getStartingList(targetId),
      ]);
      if (resBuku?.success && Array.isArray(resBuku.data)) {
        setRealEventGroups(resBuku.data);
      }
      if (resStart?.success && Array.isArray(resStart.data)) {
        setRealStartingList(resStart.data);
      }
    } catch (err) {
      console.error("Error fetching live scoreboard data:", err);
    }
  };

  useEffect(() => {
    if (selectedTournamentId > 0) {
      fetchRealData(selectedTournamentId);
    }
  }, [selectedTournamentId]);

  // Background auto-refresh for real data every 8s
  useEffect(() => {
    if (selectedTournamentId <= 0) return;
    const interval = setInterval(() => {
      fetchRealData(selectedTournamentId);
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedTournamentId]);

  // Active Tournament metadata
  const currentTournament = useMemo(() => {
    return tournaments.find((t) => t.id === selectedTournamentId) || null;
  }, [tournaments, selectedTournamentId]);

  // Load saved manual live matches from localStorage
  useEffect(() => {
    if (selectedTournamentId > 0 && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`live_matches_${selectedTournamentId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setManualLiveMatches(parsed);
          } else {
            setManualLiveMatches([]);
          }
        } else {
          setManualLiveMatches([]);
        }
      } catch (e) {
        setManualLiveMatches([]);
      }
    }
  }, [selectedTournamentId]);

  // Sorted Event Groups
  const sortedEventGroups = useMemo(() => {
    return [...realEventGroups].sort((a: any, b: any) => {
      const codeA = Number(String(a.event_code || 0).replace(/[^0-9]/g, ""));
      const codeB = Number(String(b.event_code || 0).replace(/[^0-9]/g, ""));
      if (codeA !== codeB) return codeA - codeB;
      return String(a.event_code || "").localeCompare(String(b.event_code || ""));
    });
  }, [realEventGroups]);

  // Compute all individual race matches across every event & heat
  const allMatches = useMemo(() => {
    const list: CallingRoomEvent[] = [];

    sortedEventGroups.forEach((ev: any, evIdx: number) => {
      const validHeats = (ev.heats || []).filter((h: any) => !h.is_empty);
      const heatNums: number[] = Array.from(
        new Set<number>(validHeats.map((h: any) => Number(h.heat)))
      )
        .filter((h: number) => !isNaN(h) && h > 0)
        .sort((a: number, b: number) => a - b);

      const totalHeats = heatNums.length > 0 ? Math.max(...heatNums) : 1;
      const listHeats = heatNums.length > 0 ? heatNums : [1];

      listHeats.forEach((hNum, hIdx) => {
        const heatLanes = (ev.heats || [])
          .filter((h: any) => Number(h.heat) === hNum && !h.is_empty)
          .sort((a: any, b: any) => (a.line || 0) - (b.line || 0));

        const estTime = ev.schedule_time
          ? `${ev.schedule_time}${hNum > 1 ? ` (H${hNum})` : ""}`
          : `0${Math.min(8 + Math.floor((evIdx * 2 + hIdx) / 3), 17)}:${(
              ((evIdx * 2 + hIdx) * 15) %
              60
            )
              .toString()
              .padStart(2, "0")} WIB`;

        list.push({
          matchKey: `${ev.event_code}-heat-${hNum}`,
          eventCode: ev.event_code,
          eventName: ev.event_name,
          gender: ev.gender,
          ku: ev.age_group,
          heatCurrent: hNum,
          heatTotal: totalHeats,
          estimatedTime: estTime,
          lanes: heatLanes.map((h: any) => ({
            laneNumber: h.line,
            swimmerName: h.nama,
            club: h.club,
            seedTime: h.time_seed || "NT",
            resultTime: h.result && h.result !== "-" ? h.result : undefined,
            rank: h.rank,
            isRacing: !h.result || h.result === "-",
          })),
        });
      });
    });

    return list;
  }, [sortedEventGroups]);

  // Handler to set a match to live in the pool (Percepatan Tanding)
  const handleSetMatchToLive = (eventCode: string | number, heat: number, slotIndex = 0) => {
    setManualLiveMatches((prev) => {
      const next = [...prev];
      while (next.length <= slotIndex) {
        next.push({ eventCode: "", heat: 1 });
      }
      next[slotIndex] = { eventCode, heat };
      if (typeof window !== "undefined" && selectedTournamentId > 0) {
        try {
          localStorage.setItem(`live_matches_${selectedTournamentId}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    const targetMatch = allMatches.find(
      (m) => String(m.eventCode) === String(eventCode) && m.heatCurrent === heat
    );
    const label = targetMatch
      ? `Acara #${targetMatch.eventCode} - Heat ${heat} (${targetMatch.eventName})`
      : `Acara #${eventCode} - Heat ${heat}`;
    setAccelerationNotice(`⚡ ${label} kini dijadikan pertandingan yang sedang berlangsung di kolam!`);
    setTimeout(() => {
      setAccelerationNotice(null);
    }, 5000);
  };

  // Handler to reset live pool matches to default chronological order
  const handleResetLiveMatches = () => {
    setManualLiveMatches([]);
    if (typeof window !== "undefined" && selectedTournamentId > 0) {
      try {
        localStorage.removeItem(`live_matches_${selectedTournamentId}`);
      } catch (e) {}
    }
    setAccelerationNotice("🔄 Urutan pertandingan kolam dikembalikan ke jadwal normal.");
    setTimeout(() => {
      setAccelerationNotice(null);
    }, 4000);
  };

  // Available heats for selected event in Calling Room filter
  const availableHeatsForSelectedEvent = useMemo(() => {
    if (callingFilterEvent === "all") return [];
    const ev = sortedEventGroups.find(
      (e: any) => String(e.event_code) === String(callingFilterEvent)
    );
    if (!ev) return [];
    const heats: number[] = Array.from(
      new Set<number>(
        (ev.heats || [])
          .filter((h: any) => !h.is_empty)
          .map((h: any) => Number(h.heat))
      )
    )
      .filter((h: number) => !isNaN(h) && h > 0)
      .sort((a: number, b: number) => a - b);
    return heats.length > 0 ? heats : [1];
  }, [callingFilterEvent, sortedEventGroups]);

  // Compute Live Pool Events based on poolMode and manualLiveMatches
  const liveEvents = useMemo(() => {
    if (allMatches.length === 0) return [];

    const activeLiveList: LivePoolEvent[] = [];
    const neededCount = poolMode;

    for (let slot = 0; slot < neededCount; slot++) {
      let chosenMatch: (typeof allMatches)[0] | undefined;

      if (manualLiveMatches[slot] && manualLiveMatches[slot].eventCode) {
        chosenMatch = allMatches.find(
          (m) =>
            String(m.eventCode) === String(manualLiveMatches[slot].eventCode) &&
            m.heatCurrent === manualLiveMatches[slot].heat
        );
      }

      if (!chosenMatch) {
        chosenMatch = allMatches.find(
          (m) =>
            !activeLiveList.some(
              (al) =>
                String(al.eventCode) === String(m.eventCode) &&
                al.heatCurrent === m.heatCurrent
            )
        );
      }

      if (chosenMatch) {
        const laneCount = chosenMatch.lanes.length;
        const startBlock = slot * 3 + 1;
        const endBlock = slot * 3 + Math.max(laneCount, 1);

        activeLiveList.push({
          eventCode: chosenMatch.eventCode,
          eventName: chosenMatch.eventName,
          gender: chosenMatch.gender,
          ku: chosenMatch.ku,
          heatCurrent: chosenMatch.heatCurrent,
          heatTotal: chosenMatch.heatTotal,
          blockRange: `Balok Kolam ${startBlock}-${endBlock}`,
          lanes: chosenMatch.lanes.map((l: any, lIdx: number) => ({
            laneNumber: l.laneNumber,
            blockNumber: startBlock + lIdx,
            swimmerName: l.swimmerName,
            club: l.club,
            seedTime: l.seedTime,
            resultTime: l.resultTime,
            rank: l.rank,
            isRacing: l.isRacing,
          })),
        });
      }
    }

    return activeLiveList;
  }, [allMatches, manualLiveMatches, poolMode]);

  // Compute Calling Room Events (Includes Heat 2, Heat 3, and subsequent events)
  const callingEvents = useMemo(() => {
    if (callingFilterEvent !== "all") {
      let filtered = allMatches.filter(
        (m) => String(m.eventCode) === String(callingFilterEvent)
      );
      if (callingFilterHeat !== "all") {
        filtered = filtered.filter(
          (m) => m.heatCurrent === Number(callingFilterHeat)
        );
      }
      return filtered;
    }

    // Default: all matches not currently active in the pool
    const activeKeys = new Set(
      liveEvents.map((le) => `${le.eventCode}-${le.heatCurrent}`)
    );
    return allMatches.filter(
      (m) => !activeKeys.has(`${m.eventCode}-${m.heatCurrent}`)
    );
  }, [allMatches, callingFilterEvent, callingFilterHeat, liveEvents]);

  // Compute All Participants for Slide 1
  const allParticipants = useMemo(() => {
    const participants: ParticipantEntry[] = [];
    realEventGroups.forEach((ev: any) => {
      (ev.heats || []).forEach((h: any) => {
        if (!h.is_empty) {
          participants.push({
            id: h.registration_id || `${ev.event_code}-${h.heat}-${h.line}`,
            eventCode: `#${ev.event_code}`,
            heat: h.heat,
            lane: h.line,
            seedTime: h.time_seed || "NT",
            resultTime: h.result && h.result !== "-" ? h.result : "",
            status: h.result && h.result !== "-" ? "SELESAI" : "BELUM TANDING",
            name: (h.nama || "").toUpperCase(),
            ku: ev.age_group || "KU",
            gender:
              (h.gender || ev.gender || "PUTRA").toUpperCase().includes("PI") ||
              (h.gender || ev.gender || "").toUpperCase().includes("PUTRI")
                ? "P"
                : "L",
            club: h.club || "-",
            rank: h.rank,
          });
        }
      });
    });

    if (participants.length === 0 && realStartingList.length > 0) {
      realStartingList.forEach((r: any, idx: number) => {
        participants.push({
          id: r.id || idx + 1,
          eventCode: r.nomor_lomba ? `#${r.nomor_lomba}` : `#${idx + 101}`,
          heat: 1,
          lane: (idx % 6) + 1,
          seedTime: r.time_seed || "NT",
          resultTime: r.result || "",
          status: r.result ? "SELESAI" : "BELUM TANDING",
          name: (r.nama || "").toUpperCase(),
          ku: "KU",
          gender: (r.jenis_kelamin || "").toUpperCase().includes("PUTRI")
            ? "P"
            : "L",
          club: r.club || "-",
          rank: r.rank,
        });
      });
    }

    return participants;
  }, [realEventGroups, realStartingList]);

  // Compute Official Podium List for Slide 3
  const podiumList = useMemo(() => {
    const podium: PodiumItem[] = [];
    realEventGroups.forEach((ev: any) => {
      const winners = (ev.heats || [])
        .filter((h: any) => !h.is_empty && h.rank && h.rank >= 1 && h.rank <= 3)
        .sort((a: any, b: any) => (a.rank || 0) - (b.rank || 0));

      winners.forEach((w: any) => {
        podium.push({
          eventCode: ev.event_code,
          eventName: ev.event_name,
          ku: ev.age_group,
          rank: w.rank,
          swimmerName: w.nama,
          resultTime: w.result || "-",
          timeDiff: w.rank === 1 ? "0.00" : "+0.00",
          heatLane: `H${w.heat}-L${w.line}`,
          club: w.club,
        });
      });
    });
    return podium;
  }, [realEventGroups]);

  // Filtered Participants in Slide 1
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return allParticipants;
    const q = searchQuery.toLowerCase();
    return allParticipants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.club.toLowerCase().includes(q) ||
        String(p.eventCode).toLowerCase().includes(q) ||
        p.ku.toLowerCase().includes(q)
    );
  }, [allParticipants, searchQuery]);

  // Pagination for Slide 1 (2 Columns x 20 Rows = 40 Per Page)
  const ROWS_PER_COLUMN = 20;
  const ITEMS_PER_PAGE = ROWS_PER_COLUMN * 2;
  const totalSlide1Pages = Math.max(1, Math.ceil(filteredParticipants.length / ITEMS_PER_PAGE));

  const slide1PageItems = useMemo(() => {
    const startIndex = (slide1Page - 1) * ITEMS_PER_PAGE;
    return filteredParticipants.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredParticipants, slide1Page, ITEMS_PER_PAGE]);

  const leftColumnItems = useMemo(() => slide1PageItems.slice(0, ROWS_PER_COLUMN), [slide1PageItems]);
  const rightColumnItems = useMemo(() => slide1PageItems.slice(ROWS_PER_COLUMN, ITEMS_PER_PAGE), [slide1PageItems]);

  // Total podium pages (Slide 3)
  const PODIUM_PER_PAGE = 8;
  const totalSlide3Pages = Math.max(1, Math.ceil(podiumList.length / PODIUM_PER_PAGE));
  const slide3PageItems = useMemo(() => {
    const startIndex = (slide3Page - 1) * PODIUM_PER_PAGE;
    return podiumList.slice(startIndex, startIndex + PODIUM_PER_PAGE);
  }, [podiumList, slide3Page]);

  const podiumLeftItems = useMemo(() => slide3PageItems.slice(0, 4), [slide3PageItems]);
  const podiumRightItems = useMemo(() => slide3PageItems.slice(4, 8), [slide3PageItems]);

  // Compute Slide 4: Juara 1, 2, 3 per Nomor Lomba (Heat & Group Abjad) Berdasarkan Speed Time
  const slide4Events = useMemo<Slide4EventData[]>(() => {
    return sortedEventGroups.map((ev: any) => {
      const rawCat = String(ev.heat_category || "").toUpperCase();
      const hasGroupLabel = (ev.heats || []).some(
        (h: any) =>
          h.heat_category === "GROUP" ||
          (typeof h.heat_label === "string" && /^[A-Z]$/i.test(h.heat_label.trim()))
      );
      const isGroup = rawCat === "GROUP" || rawCat === "CLUSTER" || hasGroupLabel;

      const activeSwimmers = (ev.heats || []).filter(
        (h: any) => !h.is_empty && h.nama && h.nama !== "(KOSONG)"
      );

      let eventHasResults = false;

      if (isGroup) {
        // Group Abjad logic: swimmers in each group are ranked by speed time
        const groupMap: { [heatNum: number]: any[] } = {};
        activeSwimmers.forEach((s: any) => {
          const hNum = Number(s.heat) || 1;
          if (!groupMap[hNum]) groupMap[hNum] = [];
          groupMap[hNum].push(s);
        });

        const groupNums = Object.keys(groupMap)
          .map(Number)
          .sort((a, b) => a - b);

        const groupBreakdowns = groupNums.map((gNum) => {
          const swimmers = groupMap[gNum] || [];
          const label =
            swimmers[0]?.heat_label ||
            (gNum >= 1 && gNum <= 26 ? String.fromCharCode(64 + gNum) : `Group ${gNum}`);

          const valid = swimmers
            .map((s: any) => {
              const sec = parseSpeedTimeToSeconds(s.result);
              if (sec < 9999990) eventHasResults = true;
              return { ...s, parsedSec: sec };
            })
            .filter((s: any) => s.parsedSec < 9999990)
            .sort((a: any, b: any) => a.parsedSec - b.parsedSec);

          const fastestSec = valid.length > 0 ? valid[0].parsedSec : 0;

          const champions = valid.slice(0, 3).map((s: any, idx: number) => ({
            rank: (idx + 1) as 1 | 2 | 3,
            swimmerName: s.nama,
            club: s.club || "-",
            resultTime: s.result,
            lane: s.line,
            heatLane: `Line ${s.line}`,
            timeDiff: idx === 0 ? "WAKTU TERCEPAT" : formatSpeedDiff(s.parsedSec - fastestSec),
            parsedSeconds: s.parsedSec,
          }));

          return {
            groupNum: gNum,
            groupLabel: label,
            champions,
            allSwimmersCount: swimmers.length,
          };
        });

        return {
          eventCode: ev.event_code,
          eventName: ev.event_name,
          distance: ev.distance,
          stroke: ev.stroke,
          gender: ev.gender,
          ageGroup: ev.age_group || "OPEN",
          isGroup: true,
          hasResults: eventHasResults,
          totalSwimmers: activeSwimmers.length,
          overallChampions: [],
          heatBreakdowns: [],
          groupBreakdowns,
        };
      } else {
        // Heat Category logic
        const validOverall = activeSwimmers
          .map((s: any) => {
            const sec = parseSpeedTimeToSeconds(s.result);
            if (sec < 9999990) eventHasResults = true;
            return { ...s, parsedSec: sec };
          })
          .filter((s: any) => s.parsedSec < 9999990)
          .sort((a: any, b: any) => a.parsedSec - b.parsedSec);

        const fastestSec = validOverall.length > 0 ? validOverall[0].parsedSec : 0;

        const overallChampions = validOverall.slice(0, 3).map((s: any, idx: number) => ({
          rank: (idx + 1) as 1 | 2 | 3,
          swimmerName: s.nama,
          club: s.club || "-",
          resultTime: s.result,
          timeDiff: idx === 0 ? "WAKTU TERCEPAT" : formatSpeedDiff(s.parsedSec - fastestSec),
          heatLane: `Seri ${s.heat} • Line ${s.line}`,
          heat: s.heat,
          lane: s.line,
          parsedSeconds: s.parsedSec,
        }));

        const heatMap: { [heatNum: number]: any[] } = {};
        activeSwimmers.forEach((s: any) => {
          const hNum = Number(s.heat) || 1;
          if (!heatMap[hNum]) heatMap[hNum] = [];
          heatMap[hNum].push(s);
        });

        const heatNums = Object.keys(heatMap)
          .map(Number)
          .sort((a, b) => a - b);

        const heatBreakdowns = heatNums.map((hNum) => {
          const swimmers = heatMap[hNum] || [];
          const valid = swimmers
            .map((s: any) => ({ ...s, parsedSec: parseSpeedTimeToSeconds(s.result) }))
            .filter((s: any) => s.parsedSec < 9999990)
            .sort((a: any, b: any) => a.parsedSec - b.parsedSec);

          const hFastest = valid.length > 0 ? valid[0].parsedSec : 0;

          const champions = valid.slice(0, 3).map((s: any, idx: number) => ({
            rank: (idx + 1) as 1 | 2 | 3,
            swimmerName: s.nama,
            club: s.club || "-",
            resultTime: s.result,
            heatLane: `Seri ${hNum} • Line ${s.line}`,
            lane: s.line,
            timeDiff: idx === 0 ? "Tercepat di Seri" : formatSpeedDiff(s.parsedSec - hFastest),
          }));

          return {
            heatNum: hNum,
            champions,
          };
        });

        return {
          eventCode: ev.event_code,
          eventName: ev.event_name,
          distance: ev.distance,
          stroke: ev.stroke,
          gender: ev.gender,
          ageGroup: ev.age_group || "OPEN",
          isGroup: false,
          hasResults: eventHasResults,
          totalSwimmers: activeSwimmers.length,
          overallChampions,
          heatBreakdowns,
          groupBreakdowns: [],
        };
      }
    });
  }, [sortedEventGroups]);

  // Filtered Slide 4 events
  const filteredSlide4Events = useMemo(() => {
    let list = slide4Events;

    if (slide4CategoryFilter === "HEAT") {
      list = list.filter((e) => !e.isGroup);
    } else if (slide4CategoryFilter === "GROUP") {
      list = list.filter((e) => e.isGroup);
    }

    if (slide4StatusFilter === "HAS_RESULTS") {
      list = list.filter((e) => e.hasResults);
    }

    if (slide4Search.trim()) {
      const q = slide4Search.toLowerCase();
      list = list.filter(
        (e) =>
          String(e.eventCode).toLowerCase().includes(q) ||
          e.eventName.toLowerCase().includes(q) ||
          e.ageGroup.toLowerCase().includes(q) ||
          e.gender.toLowerCase().includes(q) ||
          e.overallChampions.some(
            (c) => c.swimmerName.toLowerCase().includes(q) || c.club.toLowerCase().includes(q)
          ) ||
          e.groupBreakdowns.some((gb) =>
            gb.champions.some(
              (c) => c.swimmerName.toLowerCase().includes(q) || c.club.toLowerCase().includes(q)
            )
          )
      );
    }

    return list;
  }, [slide4Events, slide4CategoryFilter, slide4StatusFilter, slide4Search]);

  const SLIDE4_PER_PAGE = 2;
  const totalSlide4Pages = Math.max(1, Math.ceil(filteredSlide4Events.length / SLIDE4_PER_PAGE));
  const slide4PageItems = useMemo(() => {
    const start = (slide4Page - 1) * SLIDE4_PER_PAGE;
    return filteredSlide4Events.slice(start, start + SLIDE4_PER_PAGE);
  }, [filteredSlide4Events, slide4Page, SLIDE4_PER_PAGE]);

  // Reset slide 4 page on filter change
  useEffect(() => {
    setSlide4Page(1);
  }, [slide4CategoryFilter, slide4StatusFilter, slide4Search]);

  // 4. Auto Slide Progression
  useEffect(() => {
    if (!isPlaying) {
      setProgress(0);
      return;
    }

    setProgress(0);
    const stepMs = 50;
    const totalMs = slideDuration * 1000;
    const increment = (stepMs / totalMs) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (activeSlide === 1) {
            if (slide1Page < totalSlide1Pages) {
              setSlide1Page((p) => p + 1);
            } else {
              setSlide1Page(1);
              setActiveSlide(2);
            }
          } else if (activeSlide === 2) {
            setActiveSlide(3);
          } else if (activeSlide === 3) {
            if (slide3Page < totalSlide3Pages) {
              setSlide3Page((p) => p + 1);
            } else {
              setSlide3Page(1);
              setActiveSlide(4);
            }
          } else if (activeSlide === 4) {
            if (slide4Page < totalSlide4Pages) {
              setSlide4Page((p) => p + 1);
            } else {
              setSlide4Page(1);
              setActiveSlide(1);
            }
          }
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, slideDuration, activeSlide, slide1Page, totalSlide1Pages, slide3Page, totalSlide3Pages, slide4Page, totalSlide4Pages]);

  // Handlers for manual step
  const handlePrev = () => {
    setProgress(0);
    if (activeSlide === 1) {
      if (slide1Page > 1) {
        setSlide1Page((p) => p - 1);
      } else {
        setActiveSlide(4);
      }
    } else if (activeSlide === 2) {
      setActiveSlide(1);
    } else if (activeSlide === 3) {
      if (slide3Page > 1) {
        setSlide3Page((p) => p - 1);
      } else {
        setActiveSlide(2);
      }
    } else if (activeSlide === 4) {
      if (slide4Page > 1) {
        setSlide4Page((p) => p - 1);
      } else {
        setActiveSlide(3);
      }
    }
  };

  const handleNext = () => {
    setProgress(0);
    if (activeSlide === 1) {
      if (slide1Page < totalSlide1Pages) {
        setSlide1Page((p) => p + 1);
      } else {
        setActiveSlide(2);
      }
    } else if (activeSlide === 2) {
      setActiveSlide(3);
    } else if (activeSlide === 3) {
      if (slide3Page < totalSlide3Pages) {
        setSlide3Page((p) => p + 1);
      } else {
        setActiveSlide(4);
      }
    } else if (activeSlide === 4) {
      if (slide4Page < totalSlide4Pages) {
        setSlide4Page((p) => p + 1);
      } else {
        setActiveSlide(1);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
        setProgress(0);
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "PageDown") {
        if (activeSlide === 1) setSlide1Page((p) => Math.min(totalSlide1Pages, p + 1));
        if (activeSlide === 3) setSlide3Page((p) => Math.min(totalSlide3Pages, p + 1));
        if (activeSlide === 4) setSlide4Page((p) => Math.min(totalSlide4Pages, p + 1));
      } else if (e.key === "PageUp") {
        if (activeSlide === 1) setSlide1Page((p) => Math.max(1, p - 1));
        if (activeSlide === 3) setSlide3Page((p) => Math.max(1, p - 1));
        if (activeSlide === 4) setSlide4Page((p) => Math.max(1, p - 1));
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSlide, slide1Page, totalSlide1Pages, slide3Page, totalSlide3Pages, slide4Page, totalSlide4Pages]);

  const visibleLiveEvents = useMemo(() => {
    return liveEvents.slice(0, poolMode);
  }, [liveEvents, poolMode]);

  return (
    <div
      ref={containerRef}
      className={`min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
        isOutdoorMode ? "bg-amber-50/40 text-black" : "bg-[#f4f7fb] text-slate-900"
      }`}
    >
      {/* ========================================================= */}
      {/* 1. TOP HEADER & VENUE CONTROLLER BAR */}
      {/* ========================================================= */}
      <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 shadow-xs shrink-0 relative z-30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 max-w-[1750px] mx-auto">
          {/* LEFT: VENUE BADGE & TOURNAMENT SPECS */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/25">
              <Tv className="w-6 h-6" />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                  TV LIVE 41°
                </span>
                <span className="text-[11px] font-bold text-slate-500 truncate max-w-xs sm:max-w-md">
                  Ruang Tunggu Orang Tua &amp; Ruang Persiapan COC
                </span>
              </div>

              {tournaments.length > 1 ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTournamentId}
                    onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
                    className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight bg-transparent border-b border-slate-300 focus:outline-none focus:border-blue-600 cursor-pointer max-w-lg"
                  >
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">
                  {currentTournament?.name || "TIME TRIAL AKUATIK INDONESIA"}
                </h1>
              )}

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold text-slate-500">
                <span>📅 {currentTournament?.event_start_date || "Hari Ini"} •</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  {currentTournament?.location || "Kolam Renang"}
                </span>
                <span className="text-sky-600 font-extrabold">
                  • ≈ {currentTournament?.pool_lanes || 6} Lintasan ({currentTournament?.pool_length || "25m"})
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: SLIDE CONTROLLERS, PLAYBACK, CLOCK */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 3 SLIDE TABS */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => {
                  setActiveSlide(1);
                  setProgress(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSlide === 1
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Slide 1: Seluruh Peserta ({allParticipants.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveSlide(2);
                  setProgress(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSlide === 2
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Slide 2: Sedang &amp; Akan Berlangsung</span>
              </button>

              <button
                onClick={() => {
                  setActiveSlide(3);
                  setProgress(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSlide === 3
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>Slide 3: Podium Juara ({podiumList.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveSlide(4);
                  setProgress(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSlide === 4
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Slide 4: Juara Speed Time ({slide4Events.length})</span>
              </button>
            </div>

            {/* MINI STEPPER BUTTONS */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition cursor-pointer"
                title="Slide / Hal Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-12 h-1.5 bg-slate-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition cursor-pointer"
                title="Slide / Hal Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* STATUS DATA ASLI RESMI TURNAMEN */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Data Turnamen Asli</span>
            </div>

            {/* PLAY / PAUSE AUTO SLIDE */}
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                setProgress(0);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                isPlaying
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? "Jeda" : "Lanjut"}</span>
            </button>

            {/* SLIDE DURATION DROPDOWN */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={slideDuration}
                onChange={(e) => {
                  setSlideDuration(Number(e.target.value));
                  setProgress(0);
                }}
                className="bg-transparent font-black focus:outline-none cursor-pointer pr-1"
              >
                <option value={4}>4 Detik</option>
                <option value={6}>6 Detik</option>
                <option value={8}>8 Detik</option>
                <option value={10}>10 Detik</option>
                <option value={15}>15 Detik</option>
              </select>
            </div>

            {/* FULLSCREEN BUTTON */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
              title="Layar Penuh (F)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* REALTIME WIB DIGITAL CLOCK */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono font-black text-xs sm:text-sm tracking-wider shadow-inner">
              {currentTimeStr || "--:--:-- WIB"}
            </div>
          </div>
        </div>

        {/* TOP ACCENT PROGRESS BAR (ANIMATED) */}
        <div className="w-full h-1 bg-slate-100 absolute bottom-0 left-0 right-0 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
              isPlaying ? "bg-amber-400" : "bg-slate-300"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN DISPLAY CONTENT AREA */}
      {/* ========================================================= */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1750px] mx-auto w-full flex flex-col justify-start">
        {/* ======================================================= */}
        {/* SLIDE 1: DAFTAR SELURUH NAMA PESERTA & SEED TIME         */}
        {/* ======================================================= */}
        {activeSlide === 1 && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* SUBHEADER BAR SLIDE 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                SLIDE 1: DAFTAR SELURUH NAMA PESERTA &amp; SEED TIME
              </h2>

              <div className="flex items-center gap-2.5">
                {/* SEARCH INPUT */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSlide1Page(1);
                    }}
                    placeholder="Cari atlet / #acara.."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
                  />
                </div>

                {/* PAGINATION BADGE & CONTROLS */}
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 font-mono text-xs font-black text-blue-700">
                    Hal {slide1Page}/{totalSlide1Pages}
                  </span>
                  <button
                    onClick={() => setSlide1Page((p) => Math.max(1, p - 1))}
                    disabled={slide1Page <= 1}
                    className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>
                  <button
                    onClick={() => setSlide1Page((p) => Math.min(totalSlide1Pages, p + 1))}
                    disabled={slide1Page >= totalSlide1Pages}
                    className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* EMPTY STATE OR TABLE GRID */}
            {filteredParticipants.length === 0 ? (
              <div className="p-16 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">Belum Ada Data Peserta</h3>
                <p className="text-xs text-slate-500">
                  Data peserta turnamen ini belum tersedia atau Buku Acara belum digenerate.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* LEFT TABLE COLUMN */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                  <div className="bg-[#0b1e38] text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-wide text-sky-200">
                      {`${(slide1Page - 1) * ITEMS_PER_PAGE + 1}-${Math.min(
                        (slide1Page - 1) * ITEMS_PER_PAGE + ROWS_PER_COLUMN,
                        filteredParticipants.length
                      )}/${filteredParticipants.length}`}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300">
                      {leftColumnItems.length} Baris
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wide">
                          <th className="py-2 px-2.5 text-center w-14"># ACARA</th>
                          <th className="py-2 px-2 text-center w-16">HEAT-LN</th>
                          <th className="py-2 px-2 text-center w-16">SEED TIME</th>
                          <th className="py-2 px-2 text-center w-20">HASIL LOMBA</th>
                          <th className="py-2 px-3">NAMA LENGKAP MURID</th>
                          <th className="py-2 px-2 text-center w-12">KU</th>
                          <th className="py-2 px-2 text-center w-10">JK</th>
                          <th className="py-2 px-3">KLUB ASAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {leftColumnItems.map((item, idx) => (
                          <tr
                            key={item.id || idx}
                            className="hover:bg-sky-50/60 transition-colors"
                          >
                            <td className="py-1.5 px-2.5 text-center font-mono font-black text-blue-600">
                              {item.eventCode}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700">
                              H{item.heat}-L{item.lane}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-600">
                              {item.seedTime}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {item.status === "SELESAI" && item.resultTime ? (
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                  {item.resultTime}
                                </span>
                              ) : (
                                <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  BELUM TANDING
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 font-black text-slate-900 uppercase truncate max-w-[170px]">
                              {item.name}
                            </td>
                            <td className="py-1.5 px-2 text-center font-bold text-slate-600">
                              <span className="border border-slate-200 px-1 py-0.2 rounded text-[10px]">
                                {item.ku}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded-full font-black text-[9px] text-white ${
                                  item.gender === "L" ? "bg-blue-600" : "bg-pink-600"
                                }`}
                              >
                                {item.gender}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-slate-700 font-medium truncate max-w-[140px]">
                              {item.club}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RIGHT TABLE COLUMN */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                  <div className="bg-[#0b1e38] text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-wide text-sky-200">
                      {rightColumnItems.length > 0
                        ? `${(slide1Page - 1) * ITEMS_PER_PAGE + ROWS_PER_COLUMN + 1}-${Math.min(
                            slide1Page * ITEMS_PER_PAGE,
                            filteredParticipants.length
                          )}/${filteredParticipants.length}`
                        : "- / -"}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300">
                      {rightColumnItems.length} Baris
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wide">
                          <th className="py-2 px-2.5 text-center w-14"># ACARA</th>
                          <th className="py-2 px-2 text-center w-16">HEAT-LN</th>
                          <th className="py-2 px-2 text-center w-16">SEED TIME</th>
                          <th className="py-2 px-2 text-center w-20">HASIL LOMBA</th>
                          <th className="py-2 px-3">NAMA LENGKAP MURID</th>
                          <th className="py-2 px-2 text-center w-12">KU</th>
                          <th className="py-2 px-2 text-center w-10">JK</th>
                          <th className="py-2 px-3">KLUB ASAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {rightColumnItems.map((item, idx) => (
                          <tr
                            key={item.id || idx}
                            className="hover:bg-sky-50/60 transition-colors"
                          >
                            <td className="py-1.5 px-2.5 text-center font-mono font-black text-blue-600">
                              {item.eventCode}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700">
                              H{item.heat}-L{item.lane}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-600">
                              {item.seedTime}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {item.status === "SELESAI" && item.resultTime ? (
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                  {item.resultTime}
                                </span>
                              ) : (
                                <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  BELUM TANDING
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 font-black text-slate-900 uppercase truncate max-w-[170px]">
                              {item.name}
                            </td>
                            <td className="py-1.5 px-2 text-center font-bold text-slate-600">
                              <span className="border border-slate-200 px-1 py-0.2 rounded text-[10px]">
                                {item.ku}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded-full font-black text-[9px] text-white ${
                                  item.gender === "L" ? "bg-blue-600" : "bg-pink-600"
                                }`}
                              >
                                {item.gender}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-slate-700 font-medium truncate max-w-[140px]">
                              {item.club}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================= */}
        {/* SLIDE 2: PERLOMBAAN SEDANG BERLANGSUNG & ACARA BERIKUTNYA */}
        {/* ======================================================= */}
        {activeSlide === 2 && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* SUBHEADER BAR SLIDE 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                SLIDE 2: PERLOMBAAN SEDANG BERLANGSUNG &amp; ACARA BERIKUTNYA
              </h2>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="text-[11px] font-black uppercase text-slate-400">Acara Kolam:</span>
                <button
                  onClick={() => setPoolMode(1)}
                  className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                    poolMode === 1
                      ? "bg-slate-900 text-white font-black"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  1 Acara
                </button>
                <button
                  onClick={() => setPoolMode(2)}
                  className={`px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                    poolMode === 2
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <span>⚡ 2 Acara Serentak (4+4)</span>
                </button>
                <button
                  onClick={() => setPoolMode(3)}
                  className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                    poolMode === 3
                      ? "bg-emerald-600 text-white font-black shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  3 Acara Serentak
                </button>
              </div>
            </div>

            {/* SPLIT 2 KOLOM (KIRI: SEDANG BERLANGSUNG, KANAN: ACARA BERIKUTNYA / COC) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* KOLOM KIRI (7/12): ACARA BERLANGSUNG DI KOLAM */}
              <div className="lg:col-span-7 space-y-3.5">
                {visibleLiveEvents.length === 0 ? (
                  <div className="p-12 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
                    <Timer className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="font-bold text-slate-700 text-sm">Tidak Ada Pertandingan Aktif</h3>
                    <p className="text-xs text-slate-500">
                      Belum ada jadwal pertandingan aktif di kolam untuk turnamen ini.
                    </p>
                  </div>
                ) : (
                  visibleLiveEvents.map((ev, evIdx) => {
                    const headerColor =
                      evIdx === 0
                        ? "bg-blue-600"
                        : evIdx === 1
                        ? "bg-amber-500 text-slate-950"
                        : "bg-emerald-700";

                    return (
                      <div
                        key={`${ev.eventCode}-${ev.heatCurrent}`}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
                      >
                        {/* HEADER CARD ACARA */}
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-md font-mono font-black text-xs text-white ${headerColor}`}
                            >
                              ACARA #{ev.eventCode}
                            </span>
                            <span className="font-black text-slate-900 uppercase text-xs sm:text-sm">
                              {ev.eventName} • {ev.ku} ({ev.gender})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            {/* STEPPER HEAT DI LIVE CARD */}
                            <div className="flex items-center bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
                              <button
                                onClick={() => {
                                  if (ev.heatCurrent > 1) {
                                    handleSetMatchToLive(ev.eventCode, ev.heatCurrent - 1, evIdx);
                                  }
                                }}
                                disabled={ev.heatCurrent <= 1}
                                className="px-2 py-0.5 hover:bg-slate-100 disabled:opacity-20 text-slate-700 cursor-pointer font-black text-xs"
                                title="Heat Sebelumnya"
                              >
                                ◀
                              </button>
                              <span className="px-2 py-0.5 font-mono font-black text-slate-800 text-xs bg-slate-50">
                                HEAT {ev.heatCurrent} / {ev.heatTotal}
                              </span>
                              <button
                                onClick={() => {
                                  if (ev.heatCurrent < ev.heatTotal) {
                                    handleSetMatchToLive(ev.eventCode, ev.heatCurrent + 1, evIdx);
                                  }
                                }}
                                disabled={ev.heatCurrent >= ev.heatTotal}
                                className="px-2 py-0.5 hover:bg-slate-100 disabled:opacity-20 text-slate-700 cursor-pointer font-black text-xs"
                                title="Heat Berikutnya"
                              >
                                ▶
                              </button>
                            </div>

                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[11px]">
                              {ev.blockRange}
                            </span>
                            <span className="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-0.5 rounded-md font-black text-[10px] flex items-center gap-1 uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                              • LIVE
                            </span>
                          </div>
                        </div>

                        {/* LANES IN ACTIVE EVENT */}
                        <div className="divide-y divide-slate-100 p-2 space-y-1">
                          {ev.lanes.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 font-semibold">
                              Tidak ada atlet pada heat ini
                            </div>
                          ) : (
                            ev.lanes.map((lane) => (
                              <div
                                key={lane.laneNumber}
                                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {/* LANE NUMBER BADGE */}
                                  <div className="w-10 h-9 rounded-xl bg-slate-900 text-white font-mono font-black text-xs flex flex-col items-center justify-center shrink-0">
                                    <span className="text-[9px] text-slate-400">LN</span>
                                    <span>{lane.laneNumber}</span>
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-500 font-bold">
                                        • Kolam #{lane.blockNumber}
                                      </span>
                                      <h3 className="font-black text-slate-900 uppercase text-xs sm:text-sm tracking-tight">
                                        {lane.swimmerName}
                                      </h3>
                                      <span className="text-xs font-bold text-blue-600">
                                        - {lane.club}
                                      </span>
                                    </div>
                                    <p className="text-[10px] font-mono font-semibold text-slate-500 mt-0.5">
                                      Seed: {lane.seedTime}
                                    </p>
                                  </div>
                                </div>

                                {/* RESULT / RACING STATUS */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {lane.isRacing ? (
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono font-black text-xs uppercase tracking-wider shadow-2xs">
                                      BERLOMBA
                                    </span>
                                  ) : lane.resultTime ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-3 py-1 rounded-xl bg-slate-900 text-amber-300 font-mono font-black text-sm shadow-2xs">
                                        {lane.resultTime}
                                      </span>
                                      {lane.rank === 1 && (
                                        <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1">
                                          🥇 1
                                        </span>
                                      )}
                                      {lane.rank === 2 && (
                                        <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800 font-black text-xs flex items-center gap-1">
                                          🥈 2
                                        </span>
                                      )}
                                      {lane.rank === 3 && (
                                        <span className="px-2 py-0.5 rounded-lg bg-amber-700 text-white font-black text-xs flex items-center gap-1">
                                          🥉 3
                                        </span>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* KOLOM KANAN (5/12): ACARA BERIKUTNYA / CALLING ROOM / COC */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      ACARA BERIKUTNYA (CALLING ROOM / COC)
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">
                      Antrean panggilan atlet &amp; percepatan pertandingan
                    </p>
                  </div>
                  {manualLiveMatches.length > 0 && (
                    <button
                      onClick={handleResetLiveMatches}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
                      title="Kembalikan urutan kolam ke jadwal berurutan normal"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-700" />
                      <span>Reset Urutan Kolam</span>
                    </button>
                  )}
                </div>

                {/* NOTIFIKASI PERCEPATAN TANDING */}
                {accelerationNotice && (
                  <div className="p-2.5 bg-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-between gap-2 shadow-xs animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 fill-slate-950 shrink-0" />
                      <span>{accelerationNotice}</span>
                    </div>
                    <button
                      onClick={() => setAccelerationNotice(null)}
                      className="text-slate-950/70 hover:text-slate-950 font-mono text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* STATUS SERENTAK SEDANG DI KOLAM */}
                <div className="p-2 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] font-bold text-blue-800 flex items-center justify-between">
                  <div>
                    SEDANG TANDING DI KOLAM:{" "}
                    <span className="font-mono font-black">
                      {liveEvents.length > 0
                        ? liveEvents
                            .map((e) => `Acara #${e.eventCode} (Heat ${e.heatCurrent})`)
                            .join(", ")
                        : "Tidak ada pertandingan aktif"}
                    </span>
                  </div>
                  {liveEvents.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono font-black text-[9px] uppercase tracking-wider animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>

                {/* ========================================================= */}
                {/* FITUR MANUAL SELECT ACARA & HEAT UNTUK CALLING ROOM / COC */}
                {/* ========================================================= */}
                <div className="p-3 bg-gradient-to-r from-slate-900 to-[#0b1e38] text-white rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-[11px] font-black uppercase tracking-wide text-amber-300">
                        PILIH TAMPIL MANUAL &amp; PERCEPATAN TANDING
                      </span>
                    </div>
                    {(callingFilterEvent !== "all" || callingFilterHeat !== "all") && (
                      <button
                        onClick={() => {
                          setCallingFilterEvent("all");
                          setCallingFilterHeat("all");
                        }}
                        className="text-[10px] text-sky-300 hover:text-white underline cursor-pointer"
                      >
                        Tampilkan Semua Antrean
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    {/* SELECT ACARA */}
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-300 mb-0.5">
                        Pilih Acara (Event):
                      </label>
                      <select
                        value={callingFilterEvent}
                        onChange={(e) => {
                          setCallingFilterEvent(e.target.value);
                          setCallingFilterHeat("all");
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                      >
                        <option value="all">Semua Antrean Calling Room</option>
                        {sortedEventGroups.map((ev: any) => (
                          <option key={ev.event_code} value={String(ev.event_code)}>
                            #{ev.event_code} - {ev.event_name} ({ev.age_group} {ev.gender})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* SELECT HEAT */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-300 mb-0.5">
                        Pilih Heat:
                      </label>
                      <select
                        value={callingFilterHeat}
                        onChange={(e) => setCallingFilterHeat(e.target.value)}
                        disabled={callingFilterEvent === "all"}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-40 cursor-pointer"
                      >
                        <option value="all">Semua Heat</option>
                        {availableHeatsForSelectedEvent.map((hNum) => (
                          <option key={hNum} value={String(hNum)}>
                            Heat {hNum}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* BUTTON JADIKAN SEDANG BERLANGSUNG */}
                    <div className="sm:col-span-4 flex items-end">
                      <button
                        onClick={() => {
                          if (callingFilterEvent !== "all") {
                            const hNum =
                              callingFilterHeat !== "all"
                                ? Number(callingFilterHeat)
                                : availableHeatsForSelectedEvent[0] || 1;
                            handleSetMatchToLive(callingFilterEvent, hNum, 0);
                          }
                        }}
                        disabled={callingFilterEvent === "all"}
                        className="w-full py-1.5 px-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-[11px] rounded-lg transition shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Jadikan pertandingan ini sedang berlangsung di kolam (percepatan tanding)"
                      >
                        <Zap className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Jadikan Sedang Berlangsung</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* CALLING ROOM CARDS (INCLUDES HEAT 2, HEAT 3, ETC.) */}
                <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                  {callingEvents.length === 0 ? (
                    <div className="p-8 text-center space-y-1 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs font-bold text-slate-500">
                        Tidak ada antrean acara berikutnya di Calling Room / COC.
                      </p>
                    </div>
                  ) : (
                    callingEvents.map((ce) => (
                      <div
                        key={ce.matchKey}
                        className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 hover:border-blue-300 transition"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-600 text-white font-mono font-black text-xs rounded-md">
                              #{ce.eventCode}
                            </span>
                            <div>
                              <h4 className="font-black text-xs text-slate-900 leading-tight">
                                {ce.eventName}
                              </h4>
                              <p className="text-[10px] font-bold text-slate-500">
                                {ce.ku} • {ce.gender}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="font-mono text-xs font-black text-slate-800 block">
                                {ce.estimatedTime}
                              </span>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                Heat {ce.heatCurrent} dari {ce.heatTotal}
                              </span>
                            </div>

                            {/* TOMBOL LANGSUNG JADIKAN SEDANG BERLANGSUNG PADA SETIAP HEAT */}
                            <button
                              onClick={() => handleSetMatchToLive(ce.eventCode, ce.heatCurrent, 0)}
                              className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                              title={`Percepatan: Jadikan Acara #${ce.eventCode} Heat ${ce.heatCurrent} Sedang Berlangsung`}
                            >
                              <Zap className="w-3 h-3 fill-slate-950" />
                              <span>Jadikan Sedang Berlangsung</span>
                            </button>
                          </div>
                        </div>

                        {/* MINI TABLE LANES */}
                        <div className="bg-white rounded-lg border border-slate-200/80 overflow-hidden text-[10px]">
                          <div className="grid grid-cols-12 bg-slate-100 py-1 px-2 font-black text-slate-600 uppercase border-b border-slate-200">
                            <span className="col-span-1 text-center">LN</span>
                            <span className="col-span-5">NAMA PERENANG</span>
                            <span className="col-span-4">KLUB ASAL</span>
                            <span className="col-span-2 text-right">SEED</span>
                          </div>
                          {ce.lanes.length === 0 ? (
                            <div className="py-2 text-center text-slate-400 font-medium">
                              Belum ada atlet terdaftar di lintasan
                            </div>
                          ) : (
                            ce.lanes.map((l, lIdx) => (
                              <div
                                key={l.laneNumber}
                                className="grid grid-cols-12 py-1 px-2 border-b border-slate-100 last:border-b-0 items-center font-medium"
                              >
                                <span className="col-span-1 text-center font-black">
                                  <span
                                    className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] text-white ${
                                      lIdx === 0 ? "bg-rose-500" : "bg-blue-600"
                                    }`}
                                  >
                                    {l.laneNumber}
                                  </span>
                                </span>
                                <span className="col-span-5 font-bold uppercase truncate pr-1 text-slate-900">
                                  {l.swimmerName}
                                </span>
                                <span className="col-span-4 text-slate-600 truncate pr-1">
                                  {l.club}
                                </span>
                                <span className="col-span-2 text-right font-mono text-slate-600">
                                  {l.seedTime}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* SLIDE 3: PODIUM PERAIH MEDALI & JUARA 1, 2, 3 (HASIL)    */}
        {/* ======================================================= */}
        {activeSlide === 3 && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* SUBHEADER BAR SLIDE 3 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                SLIDE 3: PODIUM PERAIH MEDALI &amp; JUARA 1, 2, 3 (HASIL RESMI)
              </h2>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 font-mono text-xs font-black text-amber-800">
                  Hal {slide3Page}/{totalSlide3Pages}
                </span>
                <button
                  onClick={() => setSlide3Page((p) => Math.max(1, p - 1))}
                  disabled={slide3Page <= 1}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  onClick={() => setSlide3Page((p) => Math.min(totalSlide3Pages, p + 1))}
                  disabled={slide3Page >= totalSlide3Pages}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            </div>

            {/* 2 KOLOM PODIUM RESULT TABLE */}
            {podiumList.length === 0 ? (
              <div className="p-16 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
                <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">Belum Ada Hasil Resmi Podium</h3>
                <p className="text-xs text-slate-500">
                  Hasil lomba pemenang juara 1, 2, dan 3 akan muncul setelah diinput oleh juri / panitia.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* KOLOM KIRI PODIUM */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                  <div className="bg-[#0b1e38] text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-wide text-sky-200">
                      1-{podiumLeftItems.length}/{podiumList.length}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300">
                      {podiumLeftItems.length} Juara
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wide">
                          <th className="py-2.5 px-3 text-center w-16">#ACARA</th>
                          <th className="py-2.5 px-2 text-center w-16">POSISI</th>
                          <th className="py-2.5 px-3">NAMA PERENANG</th>
                          <th className="py-2.5 px-3 text-center w-24">WAKTU RESMI</th>
                          <th className="py-2.5 px-2 text-center w-16">SELISIH</th>
                          <th className="py-2.5 px-2 text-center w-16">HEAT-LN</th>
                          <th className="py-2.5 px-3">KLUB ASAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set(podiumLeftItems.map((p) => p.eventCode))).map((code) => {
                          const items = podiumLeftItems.filter((p) => p.eventCode === code);
                          const first = items[0];

                          return (
                            <div key={code} className="contents">
                              <tr className="bg-slate-900 text-white font-bold text-xs">
                                <td colSpan={7} className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
                                      ACARA #{first.eventCode}
                                    </span>
                                    <span className="font-bold text-slate-200 text-xs">
                                      {first.eventName} • {first.ku}
                                    </span>
                                  </div>
                                </td>
                              </tr>

                              {items.map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className="border-b border-slate-100 hover:bg-slate-50 transition font-medium"
                                >
                                  <td className="py-2 px-3 text-center font-mono font-black text-blue-600">
                                    #{row.eventCode}
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-black text-xs ${
                                        row.rank === 1
                                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                                          : row.rank === 2
                                          ? "bg-slate-100 text-slate-800 border border-slate-300"
                                          : "bg-orange-100 text-amber-900 border border-orange-300"
                                      }`}
                                    >
                                      {row.rank === 1 ? "🥇 1" : row.rank === 2 ? "🥈 2" : "🥉 3"}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-black text-slate-900 uppercase">
                                    {row.swimmerName}
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono font-black text-emerald-700">
                                    {row.resultTime}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono text-slate-500">
                                    {row.timeDiff}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono text-slate-600">
                                    {row.heatLane}
                                  </td>
                                  <td className="py-2 px-3 text-slate-700 truncate max-w-[150px]">
                                    {row.club}
                                  </td>
                                </tr>
                              ))}
                            </div>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* KOLOM KANAN PODIUM */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                  <div className="bg-[#0b1e38] text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-wide text-sky-200">
                      {podiumRightItems.length > 0 ? `5-8/${podiumList.length}` : "-/4"}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300">
                      {podiumRightItems.length} Juara
                    </span>
                  </div>

                  {podiumRightItems.length === 0 ? (
                    <div className="p-16 text-center space-y-2">
                      <p className="text-xs font-bold text-slate-400">
                        Semua hasil selesai pada halaman ini tercantum di tabel kiri.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wide">
                            <th className="py-2.5 px-3 text-center w-16">#ACARA</th>
                            <th className="py-2.5 px-2 text-center w-16">POSISI</th>
                            <th className="py-2.5 px-3">NAMA PERENANG</th>
                            <th className="py-2.5 px-3 text-center w-24">WAKTU RESMI</th>
                            <th className="py-2.5 px-2 text-center w-16">SELISIH</th>
                            <th className="py-2.5 px-2 text-center w-16">HEAT-LN</th>
                            <th className="py-2.5 px-3">KLUB ASAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(new Set(podiumRightItems.map((p) => p.eventCode))).map((code) => {
                            const items = podiumRightItems.filter((p) => p.eventCode === code);
                            const first = items[0];

                            return (
                              <div key={code} className="contents">
                                <tr className="bg-slate-900 text-white font-bold text-xs">
                                  <td colSpan={7} className="py-2 px-3">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
                                        ACARA #{first.eventCode}
                                      </span>
                                      <span className="font-bold text-slate-200 text-xs">
                                        {first.eventName} • {first.ku}
                                      </span>
                                    </div>
                                  </td>
                                </tr>

                                {items.map((row, rIdx) => (
                                  <tr
                                    key={rIdx}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition font-medium"
                                  >
                                    <td className="py-2 px-3 text-center font-mono font-black text-blue-600">
                                      #{row.eventCode}
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-black text-xs ${
                                          row.rank === 1
                                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                                            : row.rank === 2
                                            ? "bg-slate-100 text-slate-800 border border-slate-300"
                                            : "bg-orange-100 text-amber-900 border border-orange-300"
                                        }`}
                                      >
                                        {row.rank === 1 ? "🥇 1" : row.rank === 2 ? "🥈 2" : "🥉 3"}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 font-black text-slate-900 uppercase">
                                      {row.swimmerName}
                                    </td>
                                    <td className="py-2 px-3 text-center font-mono font-black text-emerald-700">
                                      {row.resultTime}
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono text-slate-500">
                                      {row.timeDiff}
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono text-slate-600">
                                      {row.heatLane}
                                    </td>
                                    <td className="py-2 px-3 text-slate-700 truncate max-w-[150px]">
                                      {row.club}
                                    </td>
                                  </tr>
                                ))}
                              </div>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================= */}
        {/* SLIDE 4: JUARA 1, 2, 3 NOMOR LOMBA (SPEED TIME)         */}
        {/* UNTUK KATEGORI HEAT & GROUP ABJAD                       */}
        {/* ======================================================= */}
        {activeSlide === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* SUBHEADER BAR SLIDE 4 */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  SLIDE 4: JUARA 1, 2, 3 NOMOR LOMBA (SPEED TIME)
                </h2>
                <span className="text-[11px] font-bold text-slate-500 hidden xl:inline">
                  • Perhitungan Otomatis Catatan Waktu Tercepat untuk Kategori Heat &amp; Group Abjad
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* SEARCH INPUT */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={slide4Search}
                    onChange={(e) => setSlide4Search(e.target.value)}
                    placeholder="Cari acara / perenang..."
                    className="pl-8 pr-3 py-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-200 w-36 sm:w-44"
                  />
                  {slide4Search && (
                    <button
                      onClick={() => setSlide4Search("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* FILTER KATEGORI: SEMUA / HEAT / GROUP ABJAD */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setSlide4CategoryFilter("ALL")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      slide4CategoryFilter === "ALL"
                        ? "bg-white text-slate-900 font-black shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Semua ({slide4Events.length})
                  </button>
                  <button
                    onClick={() => setSlide4CategoryFilter("HEAT")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      slide4CategoryFilter === "HEAT"
                        ? "bg-sky-600 text-white font-black shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Heat ({slide4Events.filter((e) => !e.isGroup).length})
                  </button>
                  <button
                    onClick={() => setSlide4CategoryFilter("GROUP")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      slide4CategoryFilter === "GROUP"
                        ? "bg-purple-600 text-white font-black shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Group Abjad ({slide4Events.filter((e) => e.isGroup).length})
                  </button>
                </div>

                {/* TOGGLE HANYA YANG SUDAH ADA HASIL */}
                <button
                  onClick={() =>
                    setSlide4StatusFilter(slide4StatusFilter === "ALL" ? "HAS_RESULTS" : "ALL")
                  }
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    slide4StatusFilter === "HAS_RESULTS"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-black"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {slide4StatusFilter === "HAS_RESULTS" ? "✓ Ada Hasil" : "Semua Status"}
                </button>

                {/* PAGINATION CONTROLS */}
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 font-mono text-xs font-black text-amber-800">
                    Hal {slide4Page}/{totalSlide4Pages}
                  </span>
                  <button
                    onClick={() => setSlide4Page((p) => Math.max(1, p - 1))}
                    disabled={slide4Page <= 1}
                    className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Hal Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>
                  <button
                    onClick={() => setSlide4Page((p) => Math.min(totalSlide4Pages, p + 1))}
                    disabled={slide4Page >= totalSlide4Pages}
                    className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Hal Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* EVENT CARDS GRID */}
            {filteredSlide4Events.length === 0 ? (
              <div className="p-16 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
                <Medal className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">
                  Tidak Ada Nomor Lomba Sesuai Filter
                </h3>
                <p className="text-xs text-slate-500">
                  Coba ubah filter kategori atau kata kunci pencarian di atas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                {slide4PageItems.map((event) => {
                  const isPutri =
                    event.gender?.toUpperCase().includes("PI") ||
                    event.gender?.toUpperCase().includes("PUTRI") ||
                    event.gender?.toUpperCase() === "P" ||
                    event.gender?.toUpperCase() === "W";

                  return (
                    <div
                      key={event.eventCode}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between"
                    >
                      {/* CARD HEADER BANNER */}
                      <div className="bg-[#0b1e38] text-white p-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs tracking-wider uppercase font-mono shadow-xs">
                            ACARA #{event.eventCode}
                          </span>
                          <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                            {event.distance} {event.stroke || event.eventName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200 text-[11px] font-black border border-white/20">
                            {event.ageGroup}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {event.isGroup ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-600/90 text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-xs border border-purple-400/40">
                              <Sparkles className="w-3 h-3 text-purple-200" />
                              <span>GROUP ABJAD</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-600/90 text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-xs border border-sky-400/40">
                              <Timer className="w-3 h-3 text-sky-200" />
                              <span>HEAT (TIMED FINAL)</span>
                            </span>
                          )}

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isPutri
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                            }`}
                          >
                            {event.gender}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              event.hasResults
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {event.hasResults ? "✓ Ada Hasil" : "⏳ Menunggu"}
                          </span>
                        </div>
                      </div>

                      {/* CARD BODY CONTENT */}
                      <div className="p-4 sm:p-5 space-y-4 bg-slate-50/50 flex-1">
                        {!event.hasResults ? (
                          <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center space-y-1.5 my-2">
                            <Clock className="w-8 h-8 text-amber-500/70 mx-auto" />
                            <div className="text-xs font-black text-slate-800 uppercase tracking-wide">
                              Menunggu Pencatatan Hasil Waktu Juri
                            </div>
                            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                              Juara 1, 2, dan 3 berdasarkan catatan waktu (speed time) akan dihitung otomatis segera setelah panitia memasukkan hasil lomba ({event.totalSwimmers} perenang terdaftar).
                            </p>
                          </div>
                        ) : !event.isGroup ? (
                          /* ============================================== */
                          /* HEAT CATEGORY: PODIUM OVERALL TOP 3            */
                          /* ============================================== */
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span>Podium Juara 1, 2, 3 Nomor Lomba (Waktu Tercepat):</span>
                              </span>
                              <span className="text-[11px] font-bold text-slate-500">
                                {event.totalSwimmers} Peserta Lomba
                              </span>
                            </div>

                            {/* 3 PODIUM CARDS (EMAS, PERAK, PERUNGGU) */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* 🥇 JUARA 1 (EMAS) */}
                              {event.overallChampions[0] ? (
                                <div className="bg-gradient-to-b from-amber-50 to-white border-2 border-amber-400 rounded-xl p-3.5 shadow-xs relative overflow-hidden flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-2">
                                      <span className="px-2 py-0.5 bg-amber-400 text-amber-950 rounded-lg text-[10px] font-black tracking-wider uppercase inline-flex items-center gap-1">
                                        🥇 JUARA 1
                                      </span>
                                      <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                                        EMAS
                                      </span>
                                    </div>
                                    <div className="font-black text-xs sm:text-sm text-slate-900 uppercase leading-snug line-clamp-2">
                                      {event.overallChampions[0].swimmerName}
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-500 truncate mt-0.5 uppercase">
                                      {event.overallChampions[0].club}
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-2.5 border-t border-amber-200 flex items-center justify-between">
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 block uppercase">
                                        Waktu Resmi
                                      </span>
                                      <span className="text-base font-mono font-black text-amber-950">
                                        {event.overallChampions[0].resultTime}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[9px] font-bold text-slate-400 block uppercase">
                                        Lintasan
                                      </span>
                                      <span className="text-[11px] font-bold text-slate-700 font-mono">
                                        {event.overallChampions[0].heatLane}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-4 text-center text-slate-400 text-xs">
                                  Belum ada perenang finis Juara 1
                                </div>
                              )}

                              {/* 🥈 JUARA 2 (PERAK) */}
                              {event.overallChampions[1] ? (
                                <div className="bg-gradient-to-b from-slate-100/60 to-white border-2 border-slate-300 rounded-xl p-3.5 shadow-xs relative overflow-hidden flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-2">
                                      <span className="px-2 py-0.5 bg-slate-200 text-slate-900 rounded-lg text-[10px] font-black tracking-wider uppercase inline-flex items-center gap-1 border border-slate-300">
                                        🥈 JUARA 2
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        {event.overallChampions[1].timeDiff}
                                      </span>
                                    </div>
                                    <div className="font-black text-xs sm:text-sm text-slate-900 uppercase leading-snug line-clamp-2">
                                      {event.overallChampions[1].swimmerName}
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-500 truncate mt-0.5 uppercase">
                                      {event.overallChampions[1].club}
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 block uppercase">
                                        Waktu Resmi
                                      </span>
                                      <span className="text-base font-mono font-black text-slate-800">
                                        {event.overallChampions[1].resultTime}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[9px] font-bold text-slate-400 block uppercase">
                                        Lintasan
                                      </span>
                                      <span className="text-[11px] font-bold text-slate-700 font-mono">
                                        {event.overallChampions[1].heatLane}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-4 text-center text-slate-400 text-xs">
                                  Belum ada perenang finis Juara 2
                                </div>
                              )}

                              {/* 🥉 JUARA 3 (PERUNGGU) */}
                              {event.overallChampions[2] ? (
                                <div className="bg-gradient-to-b from-orange-50/50 to-white border-2 border-orange-300/80 rounded-xl p-3.5 shadow-xs relative overflow-hidden flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-2">
                                      <span className="px-2 py-0.5 bg-orange-200 text-orange-950 rounded-lg text-[10px] font-black tracking-wider uppercase inline-flex items-center gap-1 border border-orange-300">
                                        🥉 JUARA 3
                                      </span>
                                      <span className="text-[9px] font-bold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200">
                                        {event.overallChampions[2].timeDiff}
                                      </span>
                                    </div>
                                    <div className="font-black text-xs sm:text-sm text-slate-900 uppercase leading-snug line-clamp-2">
                                      {event.overallChampions[2].swimmerName}
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-500 truncate mt-0.5 uppercase">
                                      {event.overallChampions[2].club}
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-2.5 border-t border-orange-200 flex items-center justify-between">
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 block uppercase">
                                        Waktu Resmi
                                      </span>
                                      <span className="text-base font-mono font-black text-orange-950">
                                        {event.overallChampions[2].resultTime}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[9px] font-bold text-slate-400 block uppercase">
                                        Lintasan
                                      </span>
                                      <span className="text-[11px] font-bold text-slate-700 font-mono">
                                        {event.overallChampions[2].heatLane}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-4 text-center text-slate-400 text-xs">
                                  Belum ada perenang finis Juara 3
                                </div>
                              )}
                            </div>

                            {/* PER-HEAT BREAKDOWN STRIP (IF MULTIPLE HEATS) */}
                            {event.heatBreakdowns.length > 1 && (
                              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                                <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                                  <SlidersHorizontal className="w-3 h-3 text-sky-600" />
                                  <span>Hasil Juara Tercepat Per-Seri (Heat):</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {event.heatBreakdowns.map((hb) => (
                                    <div
                                      key={hb.heatNum}
                                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                                    >
                                      <div className="font-black text-slate-800 text-[11px] flex items-center justify-between">
                                        <span>SERI {hb.heatNum}</span>
                                        <span className="text-[10px] text-slate-500 font-normal">
                                          {hb.champions.length} finis
                                        </span>
                                      </div>
                                      {hb.champions.slice(0, 3).map((c, cIdx) => (
                                        <div
                                          key={cIdx}
                                          className="flex items-center justify-between text-[11px]"
                                        >
                                          <span className="truncate pr-1 font-bold text-slate-700">
                                            {c.rank === 1 ? "🥇" : c.rank === 2 ? "🥈" : "🥉"}{" "}
                                            {c.swimmerName}
                                          </span>
                                          <span className="font-mono font-black text-slate-900 shrink-0">
                                            {c.resultTime}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* ============================================== */
                          /* GROUP ABJAD CATEGORY: JUARA 1, 2, 3 PER GROUP   */
                          /* ============================================== */
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between text-xs bg-purple-50/80 p-2.5 rounded-xl border border-purple-200/80">
                              <span className="font-black text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-purple-600" />
                                <span>Juara 1, 2, 3 di Setiap Group Abjad (Waktu Tercepat):</span>
                              </span>
                              <span className="text-[11px] font-bold text-purple-700">
                                Total {event.groupBreakdowns.length} Group
                              </span>
                            </div>

                            {/* GRID OF GROUP BOXES */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {event.groupBreakdowns.map((grp) => (
                                <div
                                  key={grp.groupNum}
                                  className="bg-white border-2 border-purple-200 rounded-xl p-3.5 shadow-2xs space-y-2.5 relative overflow-hidden"
                                >
                                  {/* GROUP HEADER */}
                                  <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                                    <span className="px-2.5 py-0.5 bg-purple-600 text-white rounded-lg text-xs font-black tracking-wider uppercase shadow-xs">
                                      GROUP {grp.groupLabel}
                                    </span>
                                    <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                                      {grp.allSwimmersCount} Perenang
                                    </span>
                                  </div>

                                  {/* JUARA 1, 2, 3 ROWS */}
                                  <div className="space-y-2">
                                    {/* 🥇 JUARA 1 GROUP */}
                                    {grp.champions[0] ? (
                                      <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-300 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-black text-[9px]">
                                              🥇 1
                                            </span>
                                            <span className="font-black text-xs text-slate-900 uppercase truncate">
                                              {grp.champions[0].swimmerName}
                                            </span>
                                          </div>
                                          <div className="text-[10px] font-medium text-slate-500 truncate pl-6">
                                            {grp.champions[0].club} • Line {grp.champions[0].lane}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className="font-mono font-black text-xs text-amber-950">
                                            {grp.champions[0].resultTime}
                                          </div>
                                          <div className="text-[9px] font-bold text-amber-700">
                                            Waktu Tercepat
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-2 text-center text-slate-400 text-[11px] italic">
                                        Belum ada finis di Group {grp.groupLabel}
                                      </div>
                                    )}

                                    {/* 🥈 JUARA 2 GROUP */}
                                    {grp.champions[1] ? (
                                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-black text-[9px]">
                                              🥈 2
                                            </span>
                                            <span className="font-black text-xs text-slate-900 uppercase truncate">
                                              {grp.champions[1].swimmerName}
                                            </span>
                                          </div>
                                          <div className="text-[10px] font-medium text-slate-500 truncate pl-6">
                                            {grp.champions[1].club} • Line {grp.champions[1].lane}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className="font-mono font-black text-xs text-slate-800">
                                            {grp.champions[1].resultTime}
                                          </div>
                                          <div className="text-[9px] font-bold text-slate-500">
                                            {grp.champions[1].timeDiff}
                                          </div>
                                        </div>
                                      </div>
                                    ) : null}

                                    {/* 🥉 JUARA 3 GROUP */}
                                    {grp.champions[2] ? (
                                      <div className="p-2 rounded-lg bg-orange-50/50 border border-orange-200 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="px-1.5 py-0.5 rounded bg-orange-200 text-orange-950 font-black text-[9px]">
                                              🥉 3
                                            </span>
                                            <span className="font-black text-xs text-slate-900 uppercase truncate">
                                              {grp.champions[2].swimmerName}
                                            </span>
                                          </div>
                                          <div className="text-[10px] font-medium text-slate-500 truncate pl-6">
                                            {grp.champions[2].club} • Line {grp.champions[2].lane}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className="font-mono font-black text-xs text-orange-950">
                                            {grp.champions[2].resultTime}
                                          </div>
                                          <div className="text-[9px] font-bold text-orange-700">
                                            {grp.champions[2].timeDiff}
                                          </div>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* 3. BOTTOM FOOTER BAR (KEYBOARD SHORTCUTS & OUTDOOR MODE)   */}
      {/* ========================================================= */}
      <footer className="bg-white border-t border-slate-200/90 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 relative z-30">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 font-bold text-[11px]">
          <span className="text-slate-800 font-black">Shortcut:</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono">Spasi</kbd> Jeda</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono">◀ / ▶</kbd> Slide</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono">PgUp / PgDn</kbd> Hal</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono">F</kbd> Layar Penuh</span>
        </div>

        <div className="flex items-center gap-3">
          {/* MODE OUTDOOR ANTI SILAU */}
          <button
            onClick={() => setIsOutdoorMode(!isOutdoorMode)}
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              isOutdoorMode
                ? "bg-amber-400 text-slate-950 border-amber-500 font-black shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Mode Outdoor Anti-Silau</span>
          </button>

          {/* STATUS JEDA MANUAL / AUTO */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className={isPlaying ? "text-emerald-700 font-black" : "text-amber-800 font-bold"}>
              {isPlaying ? "Auto-Slide Aktif" : "Jeda Manual"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LiveScoreboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-blue-600 font-mono font-bold">
          Menyiapkan Live Venue Scoreboard TV...
        </div>
      }
    >
      <LiveScoreboardContent />
    </Suspense>
  );
}
