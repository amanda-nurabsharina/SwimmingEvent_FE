"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getBukuAcara, getTournaments } from "../../lib/api-client";
import {
  Trophy,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize2,
  Minimize2,
  RefreshCw,
  Clock,
  MapPin,
  ArrowLeft,
  Tv,
} from "lucide-react";
import Link from "next/link";

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

interface HeatSlide {
  eventId: number;
  eventCode: number;
  eventName: string;
  distance: string;
  stroke: string;
  gender: string;
  ageGroup: string;
  heatCategory: string;
  heatNumber: number;
  heatLabel: string;
  totalHeatsInEvent: number;
  lanes: HeatItem[];
  hasResults: boolean;
}

function LiveScoreboardContent() {
  const searchParams = useSearchParams();
  const urlTourneyId = searchParams.get("tournament_id");

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(0);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Slideshow & Playback state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [slideDuration, setSlideDuration] = useState<number>(8); // in seconds
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<any>(null);

  // 1. Digital Clock for venue screen
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

  // 2. Fetch tournaments
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

  // 3. Fetch Buku Acara Data
  const fetchData = async (tid?: number) => {
    const targetId = tid !== undefined ? tid : selectedTournamentId;
    if (targetId <= 0) return;
    const res = await getBukuAcara(targetId, "preliminary");
    if (res && res.success && Array.isArray(res.data)) {
      setEventGroups(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTournamentId > 0) {
      setLoading(true);
      fetchData(selectedTournamentId);
    }
  }, [selectedTournamentId]);

  // Background silent auto-poll for live results every 8 seconds
  useEffect(() => {
    if (selectedTournamentId <= 0) return;
    const pollInterval = setInterval(() => {
      fetchData(selectedTournamentId);
    }, 8000);
    return () => clearInterval(pollInterval);
  }, [selectedTournamentId]);

  // 4. Generate Slides: Flatten into Heat-by-Heat order according to start order
  const slides = useMemo(() => {
    const result: HeatSlide[] = [];

    // Sort events by event_code ascending (urutan mulai lomba)
    const sortedEvents = [...eventGroups].sort((a, b) => a.event_code - b.event_code);

    sortedEvents.forEach((ev) => {
      // Group heats
      const heatMap: { [heatNum: number]: HeatItem[] } = {};
      ev.heats.forEach((h) => {
        if (!heatMap[h.heat]) heatMap[h.heat] = [];
        heatMap[h.heat].push(h);
      });

      const heatNumbers = Object.keys(heatMap)
        .map(Number)
        .sort((a, b) => a - b);

      const totalHeats = heatNumbers.length;

      heatNumbers.forEach((hNum) => {
        const laneItems = heatMap[hNum].sort((a, b) => a.line - b.line);
        const hasResults = laneItems.some(
          (item) => !item.is_empty && item.result && item.result !== "-" && item.result.trim() !== ""
        );

        result.push({
          eventId: ev.event_id,
          eventCode: ev.event_code,
          eventName: ev.event_name,
          distance: ev.distance,
          stroke: ev.stroke,
          gender: ev.gender,
          ageGroup: ev.age_group,
          heatCategory: ev.heat_category || "HEAT",
          heatNumber: hNum,
          heatLabel: laneItems[0]?.heat_label || String(hNum),
          totalHeatsInEvent: totalHeats,
          lanes: laneItems,
          hasResults,
        });
      });
    });

    return result;
  }, [eventGroups]);

  // Keep current slide within bounds
  useEffect(() => {
    if (slides.length > 0 && currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(0);
    }
  }, [slides.length, currentSlideIndex]);

  // 5. Automatic Slide Progression & Progress Bar
  useEffect(() => {
    if (!isPlaying || slides.length <= 1) {
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
          // Trigger next slide
          setCurrentSlideIndex((oldIdx) => (oldIdx + 1) % slides.length);
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentSlideIndex, isPlaying, slideDuration, slides.length]);

  // Handlers for navigation
  const handlePrev = () => {
    if (slides.length === 0) return;
    setCurrentSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    setProgress(0);
  };

  const handleNext = () => {
    if (slides.length === 0) return;
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    setProgress(0);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
    setProgress(0);
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
        togglePlay();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length]);

  const currentTournament = useMemo(() => {
    return tournaments.find((t) => t.id === selectedTournamentId) || null;
  }, [tournaments, selectedTournamentId]);

  const currentSlide: HeatSlide | undefined = slides[currentSlideIndex];

  // Official swimming lane colors with high contrast in light mode
  const getLaneColorClass = (laneNumber: number) => {
    switch (laneNumber) {
      case 1:
        return "bg-amber-400 text-amber-950 border-amber-500";
      case 2:
        return "bg-blue-600 text-white border-blue-700";
      case 3:
        return "bg-rose-600 text-white border-rose-700";
      case 4:
        return "bg-white text-slate-900 border-slate-300 ring-2 ring-slate-100";
      case 5:
        return "bg-cyan-500 text-cyan-950 border-cyan-600";
      case 6:
        return "bg-emerald-600 text-white border-emerald-700";
      case 7:
        return "bg-orange-500 text-white border-orange-600";
      case 8:
        return "bg-purple-600 text-white border-purple-700";
      default:
        return "bg-sky-600 text-white border-sky-700";
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-500 selection:text-white overflow-hidden font-sans relative"
      style={{
        backgroundImage: "radial-gradient(ellipse at top, #e0f2fe 0%, #f8fafc 100%)",
      }}
    >
      {/* 1. TOP PROGRESS BAR (Auto-slide timer visualizer) */}
      <div className="w-full h-1.5 sm:h-2 bg-slate-200 relative overflow-hidden shrink-0 z-50">
        <div
          className={`h-full transition-all duration-75 ${
            isPlaying
              ? "bg-gradient-to-r from-blue-600 via-sky-500 to-amber-500 shadow-sm"
              : "bg-slate-300"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 2. TOP VENUE & TOURNAMENT HEADER */}
      <header className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md shrink-0 relative z-40 shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href={`/starting-list?tournament_id=${selectedTournamentId}`}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors shadow-2xs"
            title="Kembali ke Starting List"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-[11px] font-black tracking-wider uppercase shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
                LIVE VENUE SCOREBOARD
              </span>
              <span className="text-slate-600 text-xs font-semibold flex items-center gap-1 hidden sm:flex">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {currentTournament?.location || "Kolam Renang MGCC Modernland Kota Tangerang"}
              </span>
            </div>
            <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 uppercase mt-0.5">
              {currentTournament?.name || "TIME TRIAL 2026 MASC KOTA TANGERANG"}
            </h1>
          </div>
        </div>

        {/* Real-time Clock & Slide Status */}
        <div className="flex items-center gap-3">
          {slides.length > 0 && (
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                PROGRES PERTANDINGAN
              </span>
              <span className="text-sm font-mono font-black text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                Slide {currentSlideIndex + 1} / {slides.length}
              </span>
            </div>
          )}

          <div className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs sm:text-sm font-black shadow-2xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>{currentTimeStr || "--:--:-- WIB"}</span>
          </div>
        </div>
      </header>

      {/* 3. MAIN DISPLAY AREA (JUMBOTRON VENUE CARD) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-center max-w-7xl mx-auto w-full relative z-30">
        {loading ? (
          <div className="p-16 text-center space-y-4 my-auto bg-white/80 rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <h2 className="text-xl font-black text-slate-800">Memuat Data Pertandingan...</h2>
            <p className="text-sm text-slate-500">Menyinkronkan susunan seri dan catatan waktu lomba.</p>
          </div>
        ) : slides.length === 0 ? (
          <div className="p-16 text-center space-y-4 my-auto bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto">
            <Trophy className="w-16 h-16 text-amber-500 mx-auto" />
            <h2 className="text-2xl font-black text-slate-900">Belum Ada Susunan Seri / Heat</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Buku acara turnamen ini belum digenerate atau belum ada perenang yang terverifikasi untuk bertanding.
            </p>
          </div>
        ) : currentSlide ? (
          <div className="space-y-4 my-auto animate-in fade-in duration-300">
            {/* Active Event & Heat Banner */}
            <div className="bg-white p-5 sm:p-6 lg:p-7 rounded-3xl border border-sky-100 shadow-xl shadow-sky-900/5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden backdrop-blur-md">
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-400 to-amber-400" />

              <div className="space-y-2 relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-mono font-black text-xs uppercase tracking-wider shadow-sm shadow-blue-500/20">
                    NOMOR LOMBA #{currentSlide.eventCode}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-sky-100 border border-sky-200 text-sky-800 font-black text-xs uppercase tracking-wider">
                    {currentSlide.gender} • {currentSlide.ageGroup}
                  </span>
                  {currentSlide.hasResults && (
                    <span className="px-3 py-1 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-xs uppercase flex items-center gap-1.5 shadow-2xs">
                      <Trophy className="w-3.5 h-3.5 text-emerald-600" /> HASIL TERCATAT
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                  {currentSlide.eventName}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 font-semibold">
                  <span>Gaya:</span>
                  <span className="font-extrabold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                    {currentSlide.stroke}
                  </span>
                  <span>• Jarak:</span>
                  <span className="font-extrabold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                    {currentSlide.distance}
                  </span>
                </div>
              </div>

              {/* Heat Indicator Box */}
              <div className="px-6 py-4 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 border-2 border-amber-300 shadow-lg shadow-amber-500/20 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-950">
                  {currentSlide.heatCategory === "GROUP" ? "GROUP / KELOMPOK" : "BABAK SERI"}
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono leading-none mt-1">
                  {currentSlide.heatCategory === "GROUP" ? `GROUP ${currentSlide.heatLabel}` : `SERI ${currentSlide.heatNumber}`}
                </span>
                <span className="text-[11px] font-extrabold text-amber-950/80 mt-1">
                  Dari {currentSlide.totalHeatsInEvent} {currentSlide.heatCategory === "GROUP" ? "Group" : "Seri"}
                </span>
              </div>
            </div>

            {/* Lanes Table (Stadium Jumbotron Table) */}
            <div className="overflow-x-auto rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/60">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-black text-xs sm:text-sm border-b border-slate-200 uppercase tracking-wider">
                    <th className="p-3.5 sm:p-4 text-center w-24 sm:w-28">LINTASAN</th>
                    <th className="p-3.5 sm:p-4">NAMA PERENANG</th>
                    <th className="p-3.5 sm:p-4 hidden sm:table-cell">KLUB / ASAL</th>
                    <th className="p-3.5 sm:p-4 text-center w-36">TIME SEED</th>
                    <th className="p-3.5 sm:p-4 text-center w-48 sm:w-60">HASIL WAKTU (RESMI)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSlide.lanes.map((item, idx) => {
                    const isRank1 = item.rank === 1;
                    const isRank2 = item.rank === 2;
                    const isRank3 = item.rank === 3;

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          item.is_empty
                            ? "opacity-35 bg-slate-50/50"
                            : isRank1
                            ? "bg-amber-50/70 hover:bg-amber-100/60 border-l-4 border-l-amber-500"
                            : isRank2
                            ? "bg-slate-50/80 hover:bg-slate-100/60 border-l-4 border-l-slate-400"
                            : isRank3
                            ? "bg-orange-50/40 hover:bg-orange-100/50 border-l-4 border-l-amber-700"
                            : "hover:bg-sky-50/50"
                        }`}
                      >
                        {/* Lane Number Badge */}
                        <td className="p-3 sm:p-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl font-mono font-black text-lg sm:text-xl border-2 shadow-sm ${getLaneColorClass(
                              item.line
                            )}`}
                          >
                            {item.line}
                          </span>
                        </td>

                        {/* Swimmer Name */}
                        <td className="p-3 sm:p-4">
                          {item.is_empty ? (
                            <span className="text-slate-400 italic text-sm font-medium">(Lintasan Kosong)</span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="font-black text-base sm:text-xl text-slate-900 uppercase tracking-tight block leading-snug">
                                {item.nama}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 sm:hidden block">
                                {item.club}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Club */}
                        <td className="p-3 sm:p-4 hidden sm:table-cell">
                          {item.is_empty ? (
                            <span className="text-slate-400 font-semibold">-</span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold shadow-2xs">
                              {item.club}
                            </span>
                          )}
                        </td>

                        {/* Seed Time */}
                        <td className="p-3 sm:p-4 text-center">
                          {item.is_empty ? (
                            <span className="text-slate-400 font-semibold">-</span>
                          ) : (
                            <span className="font-mono text-sm sm:text-base font-bold text-slate-600">
                              {item.time_seed}
                            </span>
                          )}
                        </td>

                        {/* Final Recorded Race Result */}
                        <td className="p-3 sm:p-4 text-center">
                          {item.is_empty ? (
                            <span className="text-slate-400 font-semibold">-</span>
                          ) : item.result && item.result !== "-" && item.result.trim() !== "" ? (
                            <div className="inline-flex items-center justify-center gap-2">
                              <span className="font-mono text-lg sm:text-2xl font-black text-emerald-800 bg-emerald-50 border-2 border-emerald-400 px-3.5 py-1 rounded-xl shadow-xs">
                                {item.result}
                              </span>
                              {isRank1 && (
                                <span
                                  className="px-2.5 py-1 bg-amber-400 text-slate-950 rounded-xl shadow-xs font-black text-xs flex items-center gap-1 border border-amber-300"
                                  title="Juara 1 (Emas)"
                                >
                                  🥇 1
                                </span>
                              )}
                              {isRank2 && (
                                <span
                                  className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-xl shadow-xs font-black text-xs flex items-center gap-1 border border-slate-300"
                                  title="Juara 2 (Perak)"
                                >
                                  🥈 2
                                </span>
                              )}
                              {isRank3 && (
                                <span
                                  className="px-2.5 py-1 bg-amber-700 text-white rounded-xl shadow-xs font-black text-xs flex items-center gap-1 border border-amber-800"
                                  title="Juara 3 (Perunggu)"
                                >
                                  🥉 3
                                </span>
                              )}
                              {!isRank1 && !isRank2 && !isRank3 && item.rank && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs border border-slate-200">
                                  #{item.rank}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-mono font-bold tracking-wider">
                              SIAP TANDING
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>

      {/* 4. BOTTOM OPERATOR CONTROL BAR (TV / PROJECTION DOCK) */}
      <footer className="px-4 sm:px-6 py-3.5 bg-white/95 border-t border-slate-200 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0 relative z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        {/* Play / Pause & Step Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
              isPlaying
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
            title="Spasi untuk Play/Pause"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isPlaying ? "Jeda Slide" : "Putar Slide"}</span>
          </button>

          <button
            onClick={handlePrev}
            disabled={slides.length <= 1}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors disabled:opacity-40 active:scale-95 cursor-pointer"
            title="Panah Kiri untuk Seri Sebelumnya"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handleNext}
            disabled={slides.length <= 1}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors disabled:opacity-40 active:scale-95 cursor-pointer"
            title="Panah Kanan untuk Seri Berikutnya"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Slide duration selector */}
          <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200 text-xs font-bold text-slate-500">
            <span>Durasi:</span>
            {[5, 8, 12, 15].map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  setSlideDuration(sec);
                  setProgress(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-black transition-colors cursor-pointer ${
                  slideDuration === sec
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Quick Jump Dropdown */}
        {slides.length > 0 && (
          <div className="flex-1 max-w-xs sm:max-w-md hidden md:block">
            <select
              value={currentSlideIndex}
              onChange={(e) => {
                setCurrentSlideIndex(Number(e.target.value));
                setProgress(0);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              {slides.map((s, idx) => (
                <option key={idx} value={idx}>
                  #{s.eventCode} - {s.eventName} ({s.heatCategory === "GROUP" ? `Grp ${s.heatLabel}` : `Seri ${s.heatNumber}`})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tournament Switcher & Fullscreen Mode */}
        <div className="flex items-center gap-2">
          {tournaments.length > 1 && (
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_active ? "★" : ""}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={toggleFullscreen}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Tekan F untuk Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh TV (F)"}</span>
          </button>
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
          Menyiapkan Live Venue Scoreboard...
        </div>
      }
    >
      <LiveScoreboardContent />
    </Suspense>
  );
}
