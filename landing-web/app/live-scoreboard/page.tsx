"use client";

import React, { useEffect, useState, useMemo, useRef, Suspense, Fragment } from "react";
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

interface PodiumWinner {
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

interface PodiumGroupBlock {
  key: string;
  eventCode: string | number;
  eventName: string;
  ku: string;
  isGroup: boolean;
  heatNum: number;
  heatLabel: string;
  winners: PodiumWinner[];
}

interface PodiumItem extends PodiumWinner {}

// Speed time parser helper for single/multi-round swimming competitions
function isValidResultTime(timeStr?: string): boolean {
  if (!timeStr) return false;
  const clean = timeStr.trim().toUpperCase();
  if (clean === "" || clean === "-" || clean === "NT" || clean === "OK") return false;
  if (clean.includes("DQ") || clean.includes("DNF") || clean.includes("DNS")) return true;
  return /[1-9]/.test(clean);
}

function parseSpeedTimeToSeconds(timeStr?: string): number {
  if (!timeStr) return 9999999;
  const clean = timeStr.trim().toUpperCase();
  if (
    clean === "" ||
    clean === "-" ||
    clean === "NT" ||
    !/[1-9]/.test(clean) ||
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
          lanes: heatLanes.map((h: any) => {
            const hasValid = isValidResultTime(h.result);
            return {
              laneNumber: h.line,
              swimmerName: h.nama,
              club: h.club,
              seedTime: h.time_seed || "NT",
              resultTime: hasValid ? h.result : undefined,
              rank: hasValid ? h.rank : undefined,
              isRacing: !hasValid,
            };
          }),
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

  // Helper to determine if a match/heat has all valid results recorded (done)
  const isMatchDone = (m: (typeof allMatches)[0]) => {
    const activeLanes = m.lanes.filter(
      (l: any) => l.swimmerName && l.swimmerName !== "(KOSONG)"
    );
    return (
      activeLanes.length > 0 &&
      activeLanes.every(
        (l: any) => Boolean(l.resultTime && isValidResultTime(l.resultTime))
      )
    );
  };

  // Compute Live Pool Events based on poolMode and manualLiveMatches
  // When all data in a heat is filled (done), automatically advance to the next heat
  const liveEvents = useMemo(() => {
    if (allMatches.length === 0) return [];

    const activeLiveList: LivePoolEvent[] = [];
    const neededCount = poolMode;

    for (let slot = 0; slot < neededCount; slot++) {
      let chosenMatch: (typeof allMatches)[0] | undefined;

      // 1. Check if user manually pinned a match and if it is still ongoing
      if (manualLiveMatches[slot] && manualLiveMatches[slot].eventCode) {
        const manualMatch = allMatches.find(
          (m) =>
            String(m.eventCode) === String(manualLiveMatches[slot].eventCode) &&
            m.heatCurrent === manualLiveMatches[slot].heat
        );
        // Only keep if not finished yet, otherwise replace with next
        if (manualMatch && !isMatchDone(manualMatch)) {
          chosenMatch = manualMatch;
        }
      }

      // 2. Default: pick the first UNFINISHED match not yet in the active pool
      if (!chosenMatch) {
        chosenMatch = allMatches.find(
          (m) =>
            !isMatchDone(m) &&
            !activeLiveList.some(
              (al) =>
                String(al.eventCode) === String(m.eventCode) &&
                al.heatCurrent === m.heatCurrent
            )
        );
      }

      // 3. Fallback: if all matches across the whole tournament are done, pick remaining matches
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

  // Compute Calling Room Events (Auto-hide completed heats to keep calling room clean)
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

    // Default: exclude matches currently active in the pool AND omit completed heats
    const activeKeys = new Set(
      liveEvents.map((le) => `${le.eventCode}-${le.heatCurrent}`)
    );
    const unfinishedMatches = allMatches.filter(
      (m) => !activeKeys.has(`${m.eventCode}-${m.heatCurrent}`) && !isMatchDone(m)
    );

    // If all are finished, fallback to all matches not active in the pool
    return unfinishedMatches.length > 0
      ? unfinishedMatches
      : allMatches.filter((m) => !activeKeys.has(`${m.eventCode}-${m.heatCurrent}`));
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
            resultTime: isValidResultTime(h.result) ? h.result : "",
            status: isValidResultTime(h.result) ? "SELESAI" : "BELUM TANDING",
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
          resultTime: isValidResultTime(r.result) ? r.result : "",
          status: isValidResultTime(r.result) ? "SELESAI" : "BELUM TANDING",
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

  // Compute Official Podium List for Slide 3 (Compact Layout matching Image 1)
  const podiumList = useMemo(() => {
    const list: PodiumWinner[] = [];

    sortedEventGroups.forEach((ev: any) => {
      const rawCat = String(ev.heat_category || "").toUpperCase();
      const hasGroupLabel = (ev.heats || []).some(
        (h: any) =>
          h.heat_category === "GROUP" ||
          (typeof h.heat_label === "string" && /^[A-Z]$/i.test(h.heat_label.trim()))
      );
      const isGroup = rawCat === "GROUP" || rawCat === "CLUSTER" || hasGroupLabel;
      const eventWinners: (PodiumWinner & { parsedSec: number })[] = [];

      if (isGroup) {
        // Group Abjad: Rank swimmers per group (A, B, C...) purely by speed time
        const groupMap: { [heatNum: number]: any[] } = {};
        (ev.heats || []).forEach((h: any) => {
          const hNum = Number(h.heat) || 1;
          if (!groupMap[hNum]) groupMap[hNum] = [];
          groupMap[hNum].push(h);
        });

        const heatNums = Object.keys(groupMap)
          .map(Number)
          .sort((a, b) => a - b);

        heatNums.forEach((hNum) => {
          const swimmers = groupMap[hNum] || [];
          const firstSwimmer = swimmers[0];
          let groupLabel = "";
          if (firstSwimmer?.heat_label && /^[A-Z]$/i.test(firstSwimmer.heat_label.trim())) {
            groupLabel = `GROUP ${firstSwimmer.heat_label.toUpperCase()}`;
          } else if (hNum >= 1 && hNum <= 26) {
            groupLabel = `GROUP ${String.fromCharCode(64 + hNum)}`;
          } else {
            groupLabel = `GROUP ${hNum}`;
          }

          const validSwimmers = swimmers
            .filter(
              (s: any) => !s.is_empty && s.nama && s.nama !== "(KOSONG)" && isValidResultTime(s.result)
            )
            .map((s: any) => ({
              ...s,
              parsedSec: parseSpeedTimeToSeconds(s.result),
            }))
            .filter((s: any) => s.parsedSec < 9999990)
            .sort((a, b) => a.parsedSec - b.parsedSec);

          if (validSwimmers.length === 0) return;

          const fastestSec = validSwimmers[0]?.parsedSec || 0;

          validSwimmers.slice(0, 3).forEach((w: any, idx: number) => {
            const rank = idx + 1; // Pure speed time ranking
            const timeDiff =
              idx === 0 || w.parsedSec === fastestSec
                ? "0.00"
                : formatSpeedDiff(w.parsedSec - fastestSec);

            eventWinners.push({
              eventCode: ev.event_code,
              eventName: ev.event_name,
              ku: ev.age_group || "OPEN",
              rank,
              swimmerName: (w.nama || "").toUpperCase(),
              resultTime: w.result || "-",
              timeDiff,
              heatLane: `${groupLabel}-L${w.line}`,
              club: w.club || "-",
              parsedSec: w.parsedSec,
            });
          });
        });
      } else {
        // Heat Angka: TIMED FINAL across the entire event!
        // Rank all swimmers with valid results across all heats by fastest speed time
        const activeSwimmers = (ev.heats || [])
          .filter(
            (s: any) => !s.is_empty && s.nama && s.nama !== "(KOSONG)" && isValidResultTime(s.result)
          )
          .map((s: any) => ({
            ...s,
            parsedSec: parseSpeedTimeToSeconds(s.result),
          }))
          .filter((s: any) => s.parsedSec < 9999990)
          .sort((a, b) => a.parsedSec - b.parsedSec);

        if (activeSwimmers.length > 0) {
          const fastestSec = activeSwimmers[0]?.parsedSec || 0;

          // Top 3 fastest swimmers in the event get podium: 1 (Emas), 2 (Perak), 3 (Perunggu)
          activeSwimmers.slice(0, 3).forEach((w: any, idx: number) => {
            const rank = idx + 1; // Pure speed time ranking
            const timeDiff =
              idx === 0 || w.parsedSec === fastestSec
                ? "0.00"
                : formatSpeedDiff(w.parsedSec - fastestSec);

            eventWinners.push({
              eventCode: ev.event_code,
              eventName: ev.event_name,
              ku: ev.age_group || "OPEN",
              rank,
              swimmerName: (w.nama || "").toUpperCase(),
              resultTime: w.result || "-",
              timeDiff,
              heatLane: `H${w.heat}-L${w.line}`,
              club: w.club || "-",
              parsedSec: w.parsedSec,
            });
          });
        }
      }

      // Sort event winners so ALL Juara 1 are at the top, then Juara 2, then Juara 3
      eventWinners.sort(
        (a, b) =>
          a.rank - b.rank ||
          a.parsedSec - b.parsedSec ||
          String(a.heatLane).localeCompare(String(b.heatLane))
      );

      list.push(...eventWinners);
    });

    return list;
  }, [sortedEventGroups]);

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

  // Slide 3 Pagination (Compact Layout: 16 items per page = 8 per column)
  const PODIUM_PER_PAGE = 16;
  const PODIUM_HALF = 8;
  const totalSlide3Pages = Math.max(1, Math.ceil(podiumList.length / PODIUM_PER_PAGE));
  const slide3PageItems = useMemo(() => {
    const startIndex = (slide3Page - 1) * PODIUM_PER_PAGE;
    return podiumList.slice(startIndex, startIndex + PODIUM_PER_PAGE);
  }, [podiumList, slide3Page]);

  const podiumLeftItems = useMemo(() => slide3PageItems.slice(0, PODIUM_HALF), [slide3PageItems]);
  const podiumRightItems = useMemo(() => slide3PageItems.slice(PODIUM_HALF, PODIUM_PER_PAGE), [slide3PageItems]);

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
          timeDiff: idx === 0 ? "0.00" : formatSpeedDiff(s.parsedSec - fastestSec),
          heatLane: `H${s.heat || 1}-L${s.line}`,
          heat: s.heat,
          lane: s.line,
          parsedSeconds: s.parsedSec,
        }));

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
          overallChampions,
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
          timeDiff: idx === 0 ? "0.00" : formatSpeedDiff(s.parsedSec - fastestSec),
          heatLane: `H${s.heat}-L${s.line}`,
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

  const SLIDE4_PER_PAGE = 9;
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

  // Sync fullscreen state with native browser events (e.g. Esc key, TV remote, F11)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

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
      {/* FULLSCREEN PROGRESS BAR (WHEN TOP HEADER IS HIDDEN) */}
      {isFullscreen && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-slate-800/40 z-50 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
              isPlaying ? "bg-amber-400" : "bg-slate-400"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* FULLSCREEN FLOATING INFO & EXIT PILL */}
      {isFullscreen && (
        <div className="fixed top-2.5 right-3 z-50 flex items-center gap-2.5 bg-slate-900/85 hover:bg-slate-900 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-xl border border-white/10 backdrop-blur-md transition-all">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[11px] text-amber-300 font-black">{currentTimeStr}</span>
          <span className="text-slate-600">|</span>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 text-[11px] font-bold text-sky-200 hover:text-white transition cursor-pointer"
            title="Keluar Layar Penuh (F / Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Keluar Layar Penuh (F)</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TOP HEADER & VENUE CONTROLLER BAR                      */}
      {/* (DI-SEMBUNYIKAN / HIDE SAAT FULLSCREEN SESUAI REQUEST)    */}
      {/* ========================================================= */}
      {!isFullscreen && (
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
      )}

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
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
                {/* LEFT TABLE COLUMN */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                  <div className="bg-[#0b1e38] text-white px-3.5 py-2 flex items-center justify-between">
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
                    <table className="w-full text-left border-collapse text-[10px] sm:text-[11px] h-auto">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[9.5px] tracking-wide">
                          <th className="py-1.5 px-2 text-center w-14 whitespace-nowrap"># ACARA</th>
                          <th className="py-1.5 px-2 text-center w-16 whitespace-nowrap">HEAT-LN</th>
                          <th className="py-1.5 px-2 text-center w-16 whitespace-nowrap">SEED TIME</th>
                          <th className="py-1.5 px-2 text-center w-22 whitespace-nowrap">HASIL LOMBA</th>
                          <th className="py-1.5 px-2.5">NAMA LENGKAP MURID</th>
                          <th className="py-1.5 px-1.5 text-center w-12 whitespace-nowrap">KU</th>
                          <th className="py-1.5 px-1.5 text-center w-10 whitespace-nowrap">JK</th>
                          <th className="py-1.5 px-2.5">KLUB ASAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {leftColumnItems.map((item, idx) => (
                          <tr
                            key={item.id || idx}
                            className="hover:bg-sky-50/60 transition-colors h-7"
                          >
                            <td className="py-1 px-2 text-center font-mono font-black text-blue-600 whitespace-nowrap">
                              {item.eventCode}
                            </td>
                            <td className="py-1 px-2 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                              H{item.heat}-L{item.lane}
                            </td>
                            <td className="py-1 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                              {item.seedTime}
                            </td>
                            <td className="py-1 px-2 text-center whitespace-nowrap">
                              {item.status === "SELESAI" && item.resultTime ? (
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                  {item.resultTime}
                                </span>
                              ) : (
                                <span className="text-[8.5px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded tracking-tight">
                                  BELUM TANDING
                                </span>
                              )}
                            </td>
                            <td className="py-1 px-2.5 font-black text-slate-900 uppercase truncate max-w-[170px]">
                              {item.name}
                            </td>
                            <td className="py-1 px-1.5 text-center font-bold text-slate-600 whitespace-nowrap">
                              <span className="border border-slate-200 px-1 py-0.2 rounded text-[9.5px]">
                                {item.ku}
                              </span>
                            </td>
                            <td className="py-1 px-1.5 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded-full font-black text-[9px] text-white ${
                                  item.gender === "L" ? "bg-blue-600" : "bg-pink-600"
                                }`}
                              >
                                {item.gender}
                              </span>
                            </td>
                            <td className="py-1 px-2.5 text-slate-700 font-medium truncate max-w-[140px]">
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
                  <div className="bg-[#0b1e38] text-white px-3.5 py-2 flex items-center justify-between">
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
                    <table className="w-full text-left border-collapse text-[10px] sm:text-[11px] h-auto">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[9.5px] tracking-wide">
                          <th className="py-1.5 px-2 text-center w-14 whitespace-nowrap"># ACARA</th>
                          <th className="py-1.5 px-2 text-center w-16 whitespace-nowrap">HEAT-LN</th>
                          <th className="py-1.5 px-2 text-center w-16 whitespace-nowrap">SEED TIME</th>
                          <th className="py-1.5 px-2 text-center w-22 whitespace-nowrap">HASIL LOMBA</th>
                          <th className="py-1.5 px-2.5">NAMA LENGKAP MURID</th>
                          <th className="py-1.5 px-1.5 text-center w-12 whitespace-nowrap">KU</th>
                          <th className="py-1.5 px-1.5 text-center w-10 whitespace-nowrap">JK</th>
                          <th className="py-1.5 px-2.5">KLUB ASAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {rightColumnItems.map((item, idx) => (
                          <tr
                            key={item.id || idx}
                            className="hover:bg-sky-50/60 transition-colors h-7"
                          >
                            <td className="py-1 px-2 text-center font-mono font-black text-blue-600 whitespace-nowrap">
                              {item.eventCode}
                            </td>
                            <td className="py-1 px-2 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                              H{item.heat}-L{item.lane}
                            </td>
                            <td className="py-1 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                              {item.seedTime}
                            </td>
                            <td className="py-1 px-2 text-center whitespace-nowrap">
                              {item.status === "SELESAI" && item.resultTime ? (
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                  {item.resultTime}
                                </span>
                              ) : (
                                <span className="text-[8.5px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded tracking-tight">
                                  BELUM TANDING
                                </span>
                              )}
                            </td>
                            <td className="py-1 px-2.5 font-black text-slate-900 uppercase truncate max-w-[170px]">
                              {item.name}
                            </td>
                            <td className="py-1 px-1.5 text-center font-bold text-slate-600 whitespace-nowrap">
                              <span className="border border-slate-200 px-1 py-0.2 rounded text-[9.5px]">
                                {item.ku}
                              </span>
                            </td>
                            <td className="py-1 px-1.5 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded-full font-black text-[9px] text-white ${
                                  item.gender === "L" ? "bg-blue-600" : "bg-pink-600"
                                }`}
                              >
                                {item.gender}
                              </span>
                            </td>
                            <td className="py-1 px-2.5 text-slate-700 font-medium truncate max-w-[140px]">
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
                    <div className="flex items-center gap-2">
                      {manualLiveMatches.length > 0 && (
                        <button
                          onClick={handleResetLiveMatches}
                          className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
                          title="Kembalikan urutan kolam ke jadwal berurutan normal"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-900" />
                          <span>Reset Urutan</span>
                        </button>
                      )}
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wide">
                  SLIDE 3: PODIUM PERAIH MEDALI &amp; JUARA 1, 2, 3 (HASIL RESMI)
                </h2>
              </div>

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
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
                {/* KOLOM KIRI PODIUM */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                  <div className="bg-[#0b1e38] text-white px-3.5 py-2 flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-wide text-sky-200">
                      {`${(slide3Page - 1) * PODIUM_PER_PAGE + 1}-${Math.min(
                        (slide3Page - 1) * PODIUM_PER_PAGE + podiumLeftItems.length,
                        podiumList.length
                      )}/${podiumList.length}`}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300">
                      {podiumLeftItems.length} Juara
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px] sm:text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[9.5px] tracking-wide">
                          <th className="py-1.5 px-2.5 text-center w-16 whitespace-nowrap">#ACARA</th>
                          <th className="py-1.5 px-2 text-center w-16 whitespace-nowrap">POSISI</th>
                          <th className="py-1.5 px-3">NAMA PERENANG</th>
                          <th className="py-1.5 px-2.5 text-center w-24 whitespace-nowrap">WAKTU RESMI</th>
                          <th className="py-1.5 px-2 text-center w-16 whitespace-nowrap">SELISIH</th>
                          <th className="py-1.5 px-2 text-center w-16 whitespace-nowrap">HEAT-LN</th>
                          <th className="py-1.5 px-3">KLUB ASAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {podiumLeftItems.map((row, rIdx) => {
                          const showEventHeader =
                            rIdx === 0 || row.eventCode !== podiumLeftItems[rIdx - 1].eventCode;
                          return (
                            <Fragment key={rIdx}>
                              {showEventHeader && (
                                <tr className="bg-[#0b1e38] text-white font-bold text-xs border-b border-slate-800">
                                  <td colSpan={7} className="py-1.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
                                        ACARA #{row.eventCode}
                                      </span>
                                      <span className="font-bold text-slate-200 text-xs truncate">
                                        {row.eventName} • {row.ku}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              <tr className="border-b border-slate-100 hover:bg-slate-50 transition font-medium h-7">
                                <td className="py-1 px-2.5 text-center font-mono font-black text-blue-600 whitespace-nowrap">
                                  #{row.eventCode}
                                </td>
                                <td className="py-1 px-2 text-center whitespace-nowrap">
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
                                <td className="py-1 px-3 font-black text-slate-900 uppercase truncate max-w-[180px]">
                                  {row.swimmerName}
                                </td>
                                <td className="py-1 px-2.5 text-center font-mono font-black text-emerald-700 whitespace-nowrap">
                                  {row.resultTime}
                                </td>
                                <td className="py-1 px-2 text-center font-mono text-slate-500 whitespace-nowrap">
                                  {row.timeDiff}
                                </td>
                                <td className="py-1 px-2 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                                  {row.heatLane}
                                </td>
                                <td className="py-1 px-3 text-slate-700 truncate max-w-[140px]">
                                  {row.club}
                                </td>
                              </tr>
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* KOLOM KANAN PODIUM */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                  <div className="bg-[#0b1e38] text-white px-3.5 py-2 flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-wide text-sky-200">
                      {podiumRightItems.length > 0
                        ? `${(slide3Page - 1) * PODIUM_PER_PAGE + PODIUM_HALF + 1}-${Math.min(
                            slide3Page * PODIUM_PER_PAGE,
                            podiumList.length
                          )}/${podiumList.length}`
                        : "- / -"}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300">
                      {podiumRightItems.length} Juara
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    {podiumRightItems.length === 0 ? (
                      <div className="p-12 text-center space-y-2">
                        <p className="text-xs font-bold text-slate-400">
                          Semua hasil selesai pada halaman ini tercantum di tabel kiri.
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-[10px] sm:text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[9.5px] tracking-wide">
                            <th className="py-1.5 px-2.5 text-center w-16 whitespace-nowrap">#ACARA</th>
                            <th className="py-1.5 px-2 text-center w-16 whitespace-nowrap">POSISI</th>
                            <th className="py-1.5 px-3">NAMA PERENANG</th>
                            <th className="py-1.5 px-2.5 text-center w-24 whitespace-nowrap">WAKTU RESMI</th>
                            <th className="py-1.5 px-2 text-center w-16 whitespace-nowrap">SELISIH</th>
                            <th className="py-1.5 px-2 text-center w-16 whitespace-nowrap">HEAT-LN</th>
                            <th className="py-1.5 px-3">KLUB ASAL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {podiumRightItems.map((row, rIdx) => {
                            const showEventHeader =
                              rIdx === 0 || row.eventCode !== podiumRightItems[rIdx - 1].eventCode;
                            return (
                              <Fragment key={rIdx}>
                                {showEventHeader && (
                                  <tr className="bg-[#0b1e38] text-white font-bold text-xs border-b border-slate-800">
                                    <td colSpan={7} className="py-1.5 px-3">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
                                          ACARA #{row.eventCode}
                                        </span>
                                        <span className="font-bold text-slate-200 text-xs truncate">
                                          {row.eventName} • {row.ku}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                <tr className="border-b border-slate-100 hover:bg-slate-50 transition font-medium h-7">
                                  <td className="py-1 px-2.5 text-center font-mono font-black text-blue-600 whitespace-nowrap">
                                    #{row.eventCode}
                                  </td>
                                  <td className="py-1 px-2 text-center whitespace-nowrap">
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
                                  <td className="py-1 px-3 font-black text-slate-900 uppercase truncate max-w-[180px]">
                                    {row.swimmerName}
                                  </td>
                                  <td className="py-1 px-2.5 text-center font-mono font-black text-emerald-700 whitespace-nowrap">
                                    {row.resultTime}
                                  </td>
                                  <td className="py-1 px-2 text-center font-mono text-slate-500 whitespace-nowrap">
                                    {row.timeDiff}
                                  </td>
                                  <td className="py-1 px-2 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                                    {row.heatLane}
                                  </td>
                                  <td className="py-1 px-3 text-slate-700 truncate max-w-[140px]">
                                    {row.club}
                                  </td>
                                </tr>
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
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
          <div className="space-y-2.5 sm:space-y-3 animate-in fade-in duration-200 relative">
            {/* SUBHEADER BAR SLIDE 4 */}
            <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide">
                  SLIDE 4: SOROTAN PODIUM JUARA (9 ACARA PER LAYAR)
                </h2>
              </div>

              {/* PAGINATION CONTROLS */}
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-100/70 border border-amber-300 font-mono text-xs font-black text-amber-900">
                  Hal {slide4Page}/{totalSlide4Pages}
                </span>
                <button
                  onClick={() => setSlide4Page((p) => Math.max(1, p - 1))}
                  disabled={slide4Page <= 1}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition"
                  title="Hal Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  onClick={() => setSlide4Page((p) => Math.min(totalSlide4Pages, p + 1))}
                  disabled={slide4Page >= totalSlide4Pages}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition"
                  title="Hal Berikutnya"
                >
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            </div>

            {/* FLOATING CIRCULAR NAVIGATION BUTTONS (SAFE INSIDE PADDING) */}
            {totalSlide4Pages > 1 && (
              <>
                {slide4Page > 1 && (
                  <button
                    onClick={() => setSlide4Page((p) => Math.max(1, p - 1))}
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-lg transition-all z-20 cursor-pointer backdrop-blur-xs"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {slide4Page < totalSlide4Pages && (
                  <button
                    onClick={() => setSlide4Page((p) => Math.min(totalSlide4Pages, p + 1))}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-lg transition-all z-20 cursor-pointer backdrop-blur-xs"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </>
            )}

            {/* EVENT CARDS GRID */}
            {filteredSlide4Events.length === 0 ? (
              <div className="p-12 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
                <Medal className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">
                  Tidak Ada Nomor Lomba Sesuai Filter
                </h3>
                <p className="text-xs text-slate-500">
                  Coba ubah filter kategori atau kata kunci pencarian di atas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5 items-stretch">
                {slide4PageItems.map((event) => {
                  const isPutri =
                    event.gender?.toUpperCase().includes("PI") ||
                    event.gender?.toUpperCase().includes("PUTRI") ||
                    event.gender?.toUpperCase() === "P" ||
                    event.gender?.toUpperCase() === "W";

                  const displayEventName = event.stroke
                    ? `${event.distance ? `${event.distance} ` : ""}${event.stroke}`
                    : event.eventName;

                  const [c1, c2, c3] = event.overallChampions || [];

                  return (
                    <div
                      key={event.eventCode}
                      className="bg-white rounded-2xl border border-blue-200/80 shadow-xs hover:shadow-md transition-shadow p-3 sm:p-3.5 flex flex-col justify-between gap-2.5"
                    >
                      {/* CARD TOP HEADER */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono font-black text-xs shrink-0 shadow-2xs">
                            #{event.eventCode}
                          </span>
                          <h3
                            className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate"
                            title={displayEventName}
                          >
                            {displayEventName}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="px-1.5 py-0.5 rounded border border-slate-300 text-slate-700 font-bold text-[10px] bg-slate-50">
                            {event.ageGroup}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded border font-bold text-[10px] ${
                              isPutri
                                ? "bg-rose-50 text-rose-600 border-rose-200"
                                : "bg-blue-50 text-blue-600 border-blue-200"
                            }`}
                          >
                            {isPutri ? "Putri" : "Putra"}
                          </span>
                        </div>
                      </div>

                      {/* CARD BODY: 3 ROWS (JUARA 1, JUARA 2, JUARA 3) */}
                      <div className="flex-1 flex flex-col justify-between gap-1.5">
                        {/* ROW 1: JUARA 1 (EMAS) HIGHLIGHT CARD */}
                        {c1 ? (
                          <div className="bg-[#FFFDF5] border border-amber-300/90 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-800 tracking-wider">
                                    JUARA 1 (EMAS)
                                  </span>
                                  {c1.heatLane && (
                                    <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-mono font-bold text-[9px] shrink-0">
                                      {c1.heatLane}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-tight truncate"
                                  title={c1.swimmerName}
                                >
                                  {c1.swimmerName}
                                </div>
                                <div
                                  className="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-500 truncate"
                                  title={c1.club}
                                >
                                  {c1.club}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-mono font-black text-sm sm:text-base text-emerald-800 tracking-tight">
                                {c1.resultTime}
                              </div>
                              <div className="font-mono text-[9px] text-slate-400">
                                {c1.timeDiff || "0.00"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-3 px-2 text-center flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="text-[11px] font-bold text-slate-500">
                              Menunggu Pencatatan Hasil Waktu
                            </div>
                          </div>
                        )}

                        {/* ROW 2: JUARA 2 (PERAK) */}
                        {c2 ? (
                          <div className="flex items-center justify-between gap-2 px-1 py-0.5 text-xs border-t border-slate-100">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="text-xs shrink-0">🥈</span>
                              <span className="font-black text-slate-800 text-[11px] shrink-0">2</span>
                              <span
                                className="font-black uppercase text-slate-900 text-[11px] sm:text-xs truncate"
                                title={c2.swimmerName}
                              >
                                {c2.swimmerName}
                              </span>
                              <span
                                className="text-[10px] font-semibold text-slate-400 uppercase truncate shrink-0 max-w-[120px]"
                                title={c2.club}
                              >
                                ({c2.club})
                              </span>
                              {c2.heatLane && (
                                <span className="text-[9px] font-mono font-bold text-sky-600 shrink-0">
                                  {c2.heatLane}
                                </span>
                              )}
                            </div>
                            <div className="font-mono font-black text-xs sm:text-sm text-slate-900 shrink-0">
                              {c2.resultTime}
                            </div>
                          </div>
                        ) : null}

                        {/* ROW 3: JUARA 3 (PERUNGGU) */}
                        {c3 ? (
                          <div className="flex items-center justify-between gap-2 px-1 py-0.5 text-xs border-t border-slate-100">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="text-xs shrink-0">🥉</span>
                              <span className="font-black text-slate-800 text-[11px] shrink-0">3</span>
                              <span
                                className="font-black uppercase text-slate-900 text-[11px] sm:text-xs truncate"
                                title={c3.swimmerName}
                              >
                                {c3.swimmerName}
                              </span>
                              <span
                                className="text-[10px] font-semibold text-slate-400 uppercase truncate shrink-0 max-w-[120px]"
                                title={c3.club}
                              >
                                ({c3.club})
                              </span>
                              {c3.heatLane && (
                                <span className="text-[9px] font-mono font-bold text-sky-600 shrink-0">
                                  {c3.heatLane}
                                </span>
                              )}
                            </div>
                            <div className="font-mono font-black text-xs sm:text-sm text-slate-900 shrink-0">
                              {c3.resultTime}
                            </div>
                          </div>
                        ) : null}
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
