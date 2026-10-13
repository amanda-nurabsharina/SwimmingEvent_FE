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
  Sparkles,
  Sun,
  Moon,
  Clock,
  Radio,
  MapPin,
  CheckCircle2,
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

// ==========================================
// MOCK DATA GENERATOR (180 ATLET & REALISTIC EVENTS)
// ==========================================
function generateMockData() {
  const clubs = [
    "Barracuda SC",
    "Tirta Lestari AC",
    "Kraken Swimming Club",
    "Millennium Aquatic",
    "Petrokimia Gresik",
    "Tirta Taruna 66",
    "Dolphin Club Jakarta",
    "Jaq Aquatic SC",
    "MASC Kota Tangerang",
    "WDS Aquatic Banten",
    "Fortius Aquatik",
    "Lumba Swimming Club",
    "Tirta Benteng SC",
  ];

  const firstNames = [
    "OKA WIJAYA", "DANISH ALFARO", "MUHAMMAD RIZKY", "ALYA NURUL",
    "EKO PRASETYO", "SYAHRUL RAMADHAN", "BINTANG PRATAMA", "PANJI ASMARA",
    "ELVIRA ROSA", "NAUFAL HIDAYAT", "BAGAS KURNIAWAN", "FADHIL ARKAN",
    "TEGAR PRAKOSO", "CITRA AYU DEWI", "QORI ANGGRAINI", "FARHAN MAULANA",
    "CANTIKA PUTRI", "GILANG RAMADHAN", "UTARI ANANDA", "DIMAS SETIAWAN",
    "RAFI RADITYA", "GABRIEL NATHAN", "HAFIDZ AL-FATIH", "VINO BASTIAN",
    "HANNA NABILA", "INDRA KUSUMA", "WAHYU UTOMO", "IQBAL TAWAKAL",
    "JONATHAN SURYA", "XAVIER PUTRA", "FAHMI KUNCORO", "ANANG SUBARKAH",
    "AISYAH JANNATY", "FATIMAH ANAS", "KHILMA NUR SYAMSIL", "AFKAR NAUFAL",
  ];

  const participants: ParticipantEntry[] = [];
  let pId = 1;

  for (let i = 1; i <= 180; i++) {
    const fn = firstNames[(i - 1) % firstNames.length];
    const suffixNum = ((i % 5) + 1);
    const fullName = `${fn} ${suffixNum}`.trim();
    const club = clubs[(i - 1) % clubs.length];
    const isMale = (i % 2 !== 0);
    const ku = (i % 3 === 0) ? "KU 1" : (i % 3 === 1) ? "KU 2" : "KU 3";
    const eventNum = 110 + (i % 12);
    const heatNum = ((i % 6) + 1);
    const laneNum = ((i % 8) + 1);

    const sec = 30 + ((i * 7) % 45);
    const cs = (i * 13) % 99;
    const seedTime = `00.${sec.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;

    // A few completed results
    let resultTime = "";
    let status: "BELUM TANDING" | "BERLOMBA" | "SELESAI" = "BELUM TANDING";
    let rank: number | undefined = undefined;

    if (i <= 4) {
      status = "SELESAI";
      const rSec = sec - 2;
      resultTime = `02.${rSec.toString().padStart(2, "0")}.${(cs + 10) % 99}`;
      rank = (i % 2 === 1) ? 1 : 2;
    }

    participants.push({
      id: pId++,
      eventCode: `#${eventNum}`,
      heat: heatNum,
      lane: laneNum,
      seedTime,
      resultTime,
      status,
      name: fullName,
      ku,
      gender: isMale ? "L" : "P",
      club,
      rank,
    });
  }

  // Live pool events (Matching Screenshot 2)
  const liveEvents: LivePoolEvent[] = [
    {
      eventCode: 103,
      eventName: "100M GAYA KUPU-KUPU",
      gender: "PUTRA",
      ku: "KU 2",
      heatCurrent: 1,
      heatTotal: 1,
      blockRange: "Balok Kolam 1-3",
      lanes: [
        {
          laneNumber: 1,
          blockNumber: 1,
          swimmerName: "ANUGRAH DAFFA NADESTA",
          club: "MASC KOTA TANGERANG",
          seedTime: "01.02.32",
          isRacing: true,
        },
        {
          laneNumber: 2,
          blockNumber: 2,
          swimmerName: "NICHOLAS RAFAEL SINURAT",
          club: "WDS AQUATIC BANTEN",
          seedTime: "01.00.45",
          isRacing: true,
        },
        {
          laneNumber: 3,
          blockNumber: 3,
          swimmerName: "DAFFA ATTALA RISQIE",
          club: "WDS AQUATIC BANTEN",
          seedTime: "01.18.13",
          isRacing: true,
        },
      ],
    },
    {
      eventCode: 101,
      eventName: "200M GAYA GANTI PERORANGAN",
      gender: "PUTRA",
      ku: "KU 1",
      heatCurrent: 1,
      heatTotal: 1,
      blockRange: "Balok Kolam 4-6",
      lanes: [
        {
          laneNumber: 1,
          blockNumber: 4,
          swimmerName: "FAHMI KUNCORO",
          club: "WDS AQUATIC BANTEN",
          seedTime: "NT",
          resultTime: "02.48.20",
          rank: 2,
          isRacing: false,
        },
        {
          laneNumber: 2,
          blockNumber: 5,
          swimmerName: "ANANG SUBARKAH",
          club: "MASC KOTA TANGERANG",
          seedTime: "02.31.37",
          resultTime: "02.29.50",
          rank: 1,
          isRacing: false,
        },
        {
          laneNumber: 3,
          blockNumber: 6,
          swimmerName: "GILANG RAMADHAN 5",
          club: "BARRACUDA SC",
          seedTime: "00.43.00",
          isRacing: true,
        },
      ],
    },
    {
      eventCode: 102,
      eventName: "200M GAYA GANTI PERORANGAN",
      gender: "PUTRI",
      ku: "KU 1",
      heatCurrent: 1,
      heatTotal: 1,
      blockRange: "Balok Kolam 7-8",
      lanes: [
        {
          laneNumber: 1,
          blockNumber: 7,
          swimmerName: "AISYAH JANNATY MAULANA",
          club: "MASC KOTA TANGERANG",
          seedTime: "02.42.00",
          resultTime: "02.38.10",
          rank: 2,
          isRacing: false,
        },
        {
          laneNumber: 2,
          blockNumber: 8,
          swimmerName: "FATIMAH ANAS",
          club: "WDS AQUATIC BANTEN",
          seedTime: "02.34.76",
          resultTime: "02.33.90",
          rank: 1,
          isRacing: false,
        },
      ],
    },
  ];

  // Calling Room / COC events (Matching Screenshot 2)
  const callingEvents: CallingRoomEvent[] = [
    {
      eventCode: 104,
      eventName: "100m Gaya Kupu-kupu",
      gender: "Putri",
      ku: "KU 2",
      estimatedTime: "08:45 WIB",
      heatCurrent: 1,
      heatTotal: 1,
      lanes: [
        {
          laneNumber: 1,
          swimmerName: "KHILMA NUR SYAMSIL AISY",
          club: "FORTIUS AQUATIK",
          seedTime: "NT",
        },
        {
          laneNumber: 2,
          swimmerName: "VERONICA AMARISA BUDIANTO",
          club: "SEKOLAH KRISTEN ORA ET LAB...",
          seedTime: "NT",
        },
      ],
    },
    {
      eventCode: 105,
      eventName: "50m Gaya Punggung",
      gender: "Putra",
      ku: "KU 2",
      estimatedTime: "09:00 WIB",
      heatCurrent: 1,
      heatTotal: 2,
      lanes: [
        {
          laneNumber: 1,
          swimmerName: "AFKAR NAUFAL FADHIL",
          club: "TIRTA BENTENG SC",
          seedTime: "00.44.72",
        },
        {
          laneNumber: 2,
          swimmerName: "ERLAND FARREL FIRJATULLAH",
          club: "TIRTA BENTENG SC",
          seedTime: "00.35.92",
        },
      ],
    },
    {
      eventCode: 106,
      eventName: "50m Gaya Punggung",
      gender: "Putri",
      ku: "KU 2",
      estimatedTime: "09:20 WIB",
      heatCurrent: 1,
      heatTotal: 2,
      lanes: [
        {
          laneNumber: 1,
          swimmerName: "BIANCA NAN DAYU NIKIJULUW",
          club: "MASC KOTA TANGERANG",
          seedTime: "00.42.20",
        },
        {
          laneNumber: 2,
          swimmerName: "SITI VIRLY MAQFIRAH",
          club: "LUMBA SWIMMING CLUB",
          seedTime: "00.35.05",
        },
      ],
    },
  ];

  // Podium items (Matching Screenshot 3)
  const podiumList: PodiumItem[] = [
    {
      eventCode: 101,
      eventName: "200m Gaya Ganti Perorangan",
      ku: "KU1",
      rank: 1,
      swimmerName: "ANANG SUBARKAH",
      resultTime: "02.29.50",
      timeDiff: "0.00",
      heatLane: "H1-L2",
      club: "MASC KOTA TAN...",
    },
    {
      eventCode: 101,
      eventName: "200m Gaya Ganti Perorangan",
      ku: "KU1",
      rank: 2,
      swimmerName: "FAHMI KUNCORO",
      resultTime: "02.48.20",
      timeDiff: "+18.70",
      heatLane: "H1-L1",
      club: "WDS AQUATIC B...",
    },
    {
      eventCode: 102,
      eventName: "200m Gaya Ganti Perorangan",
      ku: "KU1",
      rank: 1,
      swimmerName: "FATIMAH ANAS",
      resultTime: "02.33.90",
      timeDiff: "0.00",
      heatLane: "H1-L2",
      club: "WDS AQUATIC B...",
    },
    {
      eventCode: 102,
      eventName: "200m Gaya Ganti Perorangan",
      ku: "KU1",
      rank: 2,
      swimmerName: "AISYAH JANNATY MAUL...",
      resultTime: "02.38.10",
      timeDiff: "+4.20",
      heatLane: "H1-L1",
      club: "MASC KOTA TAN...",
    },
  ];

  return { participants, liveEvents, callingEvents, podiumList };
}

// ==========================================
// MAIN COMPONENT
// ==========================================
function LiveScoreboardContent() {
  const searchParams = useSearchParams();
  const urlTourneyId = searchParams.get("tournament_id");

  // Tournament & Data States
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(0);
  const [realEventGroups, setRealEventGroups] = useState<any[]>([]);
  const [realStartingList, setRealStartingList] = useState<any[]>([]);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(true); // default true for complete 180 atlet demo

  // Playback & Slide States
  const [activeSlide, setActiveSlide] = useState<1 | 2 | 3>(1); // 1 = All Swimmers, 2 = Live & COC, 3 = Podium
  const [slide1Page, setSlide1Page] = useState<number>(1);
  const [slide3Page, setSlide3Page] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [slideDuration, setSlideDuration] = useState<number>(6); // Default 6 seconds like screenshot
  const [progress, setProgress] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [isOutdoorMode, setIsOutdoorMode] = useState<boolean>(false);

  // Pool Mode Filter on Slide 2
  const [poolMode, setPoolMode] = useState<1 | 2 | 3>(3); // 1 Acara, 2 Acara, 3 Acara (Maks)

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

  // Mock data instance
  const mock = useMemo(() => generateMockData(), []);

  // Compute Processed Data (Real vs Simulation)
  const { allParticipants, liveEvents, callingEvents, podiumList } = useMemo(() => {
    if (isSimulationMode || (realStartingList.length === 0 && realEventGroups.length === 0)) {
      return {
        allParticipants: mock.participants,
        liveEvents: mock.liveEvents,
        callingEvents: mock.callingEvents,
        podiumList: mock.podiumList,
      };
    }

    // Convert real data
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
            gender: (h.gender || ev.gender || "PUTRA").toUpperCase().includes("PI") ||
                    (h.gender || ev.gender || "").toUpperCase().includes("PUTRI")
              ? "P"
              : "L",
            club: h.club || "-",
            rank: h.rank,
          });
        }
      });
    });

    // If Buku Acara hasn't been generated yet, fall back to Starting List
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
          gender: (r.jenis_kelamin || "").toUpperCase().includes("PUTRI") ? "P" : "L",
          club: r.club || "-",
          rank: r.rank,
        });
      });
    }

    // Live events from real data
    const liveEvs: LivePoolEvent[] = [];
    realEventGroups.slice(0, 3).forEach((ev: any, evIdx: number) => {
      const activeHeat = ev.heats?.[0]?.heat || 1;
      const heatLanes = (ev.heats || []).filter((h: any) => h.heat === activeHeat && !h.is_empty);
      liveEvs.push({
        eventCode: ev.event_code,
        eventName: ev.event_name,
        gender: ev.gender,
        ku: ev.age_group,
        heatCurrent: activeHeat,
        heatTotal: Math.max(...(ev.heats || []).map((h: any) => h.heat || 1), 1),
        blockRange: `Balok Kolam ${evIdx * 3 + 1}-${evIdx * 3 + (heatLanes.length || 3)}`,
        lanes: heatLanes.map((h: any, lIdx: number) => ({
          laneNumber: h.line,
          blockNumber: evIdx * 3 + lIdx + 1,
          swimmerName: h.nama,
          club: h.club,
          seedTime: h.time_seed || "NT",
          resultTime: h.result !== "-" ? h.result : undefined,
          rank: h.rank,
          isRacing: !h.result || h.result === "-",
        })),
      });
    });

    // Calling room from remaining events
    const callEvs: CallingRoomEvent[] = [];
    realEventGroups.slice(3, 6).forEach((ev: any, evIdx: number) => {
      const firstHeat = (ev.heats || []).filter((h: any) => h.heat === 1 && !h.is_empty);
      callEvs.push({
        eventCode: ev.event_code,
        eventName: ev.event_name,
        gender: ev.gender,
        ku: ev.age_group,
        estimatedTime: `0${8 + evIdx}:${(evIdx * 20).toString().padStart(2, "0")} WIB`,
        heatCurrent: 1,
        heatTotal: Math.max(...(ev.heats || []).map((h: any) => h.heat || 1), 1),
        lanes: firstHeat.map((h: any) => ({
          laneNumber: h.line,
          swimmerName: h.nama,
          club: h.club,
          seedTime: h.time_seed || "NT",
        })),
      });
    });

    // Podium items from real completed ranks
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

    return {
      allParticipants: participants.length > 0 ? participants : mock.participants,
      liveEvents: liveEvs.length > 0 ? liveEvs : mock.liveEvents,
      callingEvents: callEvs.length > 0 ? callEvs : mock.callingEvents,
      podiumList: podium.length > 0 ? podium : mock.podiumList,
    };
  }, [isSimulationMode, realEventGroups, realStartingList, mock]);

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

  // Pagination for Slide 1 (2 Columns x 22 Rows = 44 Per Page)
  const ROWS_PER_COLUMN = 22;
  const ITEMS_PER_PAGE = ROWS_PER_COLUMN * 2; // 44
  const totalSlide1Pages = Math.max(1, Math.ceil(filteredParticipants.length / ITEMS_PER_PAGE));

  // Current page data for Slide 1
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

  // Slide 3 Columns (Left & Right)
  const podiumLeftItems = useMemo(() => slide3PageItems.slice(0, 4), [slide3PageItems]);
  const podiumRightItems = useMemo(() => slide3PageItems.slice(4, 8), [slide3PageItems]);

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
          // Advance slide or page
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
  }, [isPlaying, slideDuration, activeSlide, slide1Page, totalSlide1Pages, slide3Page, totalSlide3Pages]);

  // Handlers for manual step
  const handlePrev = () => {
    setProgress(0);
    if (activeSlide === 1) {
      if (slide1Page > 1) {
        setSlide1Page((p) => p - 1);
      } else {
        setActiveSlide(3);
      }
    } else if (activeSlide === 2) {
      setActiveSlide(1);
    } else if (activeSlide === 3) {
      if (slide3Page > 1) {
        setSlide3Page((p) => p - 1);
      } else {
        setActiveSlide(2);
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
      } else if (e.key === "PageUp") {
        if (activeSlide === 1) setSlide1Page((p) => Math.max(1, p - 1));
        if (activeSlide === 3) setSlide3Page((p) => Math.max(1, p - 1));
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSlide, slide1Page, totalSlide1Pages, slide3Page, totalSlide3Pages]);

  // Active Live Pool Events filtered by poolMode
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

              <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">
                {currentTournament?.name || "TIME TRIAL 2026 AKUATIK INDONESIA KOTA TANGERANG"}
              </h1>

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold text-slate-500">
                <span>📅 {currentTournament?.event_start_date || "18 Oktober 2026"} •</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  {currentTournament?.location || "Kolam Renang MGCC Modernland Kota Tangerang"}
                </span>
                <span className="text-sky-600 font-extrabold">
                  • ≈ {currentTournament?.pool_lanes || 6} Lintasan ({currentTournament?.pool_length || "25m"})
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: SLIDE CONTROLLERS, SIMULASI, PLAYBACK */}
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

            {/* MODE KOLAM (1 Acara, 2 Acara, 3 Acara Maks) */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-black uppercase text-slate-500 mr-1">MODE KOLAM:</span>
              <button
                onClick={() => setPoolMode(1)}
                className={`px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  poolMode === 1 ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1 Acara
              </button>
              <button
                onClick={() => setPoolMode(2)}
                className={`px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
                  poolMode === 2 ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>⚡ 2 Acara Bersamaan</span>
              </button>
              <button
                onClick={() => setPoolMode(3)}
                className={`px-2.5 py-1 rounded-lg font-black text-xs transition cursor-pointer ${
                  poolMode === 3 ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                3 Acara (Maks)
              </button>
            </div>

            {/* TOGGLE SIMULASI DATA */}
            <button
              onClick={() => setIsSimulationMode(!isSimulationMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                isSimulationMode
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
              title="Toggle Simulasi Lengkap 180 Atlet vs Data Asli Turnamen"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isSimulationMode ? "Simulasi 180 Atlet" : "Data Turnamen Asli"}</span>
            </button>

            {/* STATUS PERTANDINGAN */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Semua Selesai</span>
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

            {/* 2-COLUMN SPLIT TABLE GRID (MATCHING SCREENSHOT 1) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* LEFT TABLE COLUMN */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                {/* TABLE HEADER NAVY BAR */}
                <div className="bg-[#0b1e38] text-white px-4 py-2.5 flex items-center justify-between">
                  <span className="font-mono text-xs font-black tracking-wide text-sky-200">
                    {filteredParticipants.length > 0
                      ? `${(slide1Page - 1) * ITEMS_PER_PAGE + 1}-${Math.min(
                          (slide1Page - 1) * ITEMS_PER_PAGE + ROWS_PER_COLUMN,
                          filteredParticipants.length
                        )}/${filteredParticipants.length}`
                      : "0/0"}
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
                {/* TABLE HEADER NAVY BAR */}
                <div className="bg-[#0b1e38] text-white px-4 py-2.5 flex items-center justify-between">
                  <span className="font-mono text-xs font-black tracking-wide text-sky-200">
                    {filteredParticipants.length > 0 && rightColumnItems.length > 0
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
                <span className="text-[11px] font-black uppercase text-slate-400">Simulasi Acara Kolam:</span>
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
                {visibleLiveEvents.map((ev, evIdx) => {
                  const headerColor =
                    evIdx === 0
                      ? "bg-blue-600"
                      : evIdx === 1
                      ? "bg-amber-500 text-slate-950"
                      : "bg-emerald-700";

                  return (
                    <div
                      key={ev.eventCode}
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
                          <span className="border border-slate-200 px-2 py-0.5 rounded-md font-mono font-bold text-slate-600">
                            HEAT {ev.heatCurrent} / {ev.heatTotal}
                          </span>
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
                        {ev.lanes.map((lane) => (
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
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* KOLOM KANAN (5/12): ACARA BERIKUTNYA / CALLING ROOM / COC */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    ACARA BERIKUTNYA (CALLING ROOM / COC)
                  </h3>
                  <button className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black rounded-lg transition cursor-pointer">
                    Siapkan Atlet Masuk COC
                  </button>
                </div>

                <div className="p-2 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] font-bold text-blue-800">
                  JADWAL SERENTAK SEDANG BERJALAN DI KOLAM:{" "}
                  <span className="font-mono font-black">
                    Acara {visibleLiveEvents.map((e) => `#${e.eventCode}`).join(", ")}
                  </span>
                </div>

                {/* CALLING ROOM CARDS */}
                <div className="space-y-3">
                  {callingEvents.map((ce) => (
                    <div
                      key={ce.eventCode}
                      className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 hover:border-blue-300 transition"
                    >
                      <div className="flex items-center justify-between">
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

                        <div className="text-right">
                          <span className="font-mono text-xs font-black text-slate-800 block">
                            {ce.estimatedTime}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            Heat {ce.heatCurrent} dari {ce.heatTotal}
                          </span>
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
                        {ce.lanes.map((l, lIdx) => (
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
                        ))}
                      </div>
                    </div>
                  ))}
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

            {/* 2 KOLOM PODIUM RESULT TABLE (MATCHING SCREENSHOT 3) */}
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
                      {/* GROUP BY EVENT CODE */}
                      {Array.from(new Set(podiumLeftItems.map((p) => p.eventCode))).map((code) => {
                        const items = podiumLeftItems.filter((p) => p.eventCode === code);
                        const first = items[0];

                        return (
                          <div key={code} className="contents">
                            {/* EVENT HEADER ROW */}
                            <tr className="bg-slate-900 text-white font-bold text-xs">
                              <td colSpan={7} className="py-2 px-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
                                      ACARA #{first.eventCode}
                                    </span>
                                    <span className="font-bold text-slate-200 text-xs">
                                      {first.eventName} • {first.ku}
                                    </span>
                                  </div>
                                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-300">
                                    PODIUM JUARA 1, 2, 3
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
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
                                        ACARA #{first.eventCode}
                                      </span>
                                      <span className="font-bold text-slate-200 text-xs">
                                        {first.eventName} • {first.ku}
                                      </span>
                                    </div>
                                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-300">
                                      PODIUM JUARA 1, 2, 3
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
