"use client";

import { useState, useEffect } from "react";
import { Filter, Trophy, Calendar, MapPin, Clock, Layers, Sparkles, AlertCircle } from "lucide-react";

interface SwimmingEvent {
  id: number;
  tournament_id?: number;
  event_code: number;
  event_name: string;
  distance: string;
  stroke: string;
  gender: string;
  age_group?: string;
  fee: number;
  schedule_time?: string;
}

export default function EventInfoSection({
  events = [],
  tournaments = [],
}: {
  events?: SwimmingEvent[];
  tournaments?: any[];
}) {
  const [selectedTournamentID, setSelectedTournamentID] = useState<string>(
    tournaments?.[0]?.id ? String(tournaments[0].id) : ""
  );
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedStroke, setSelectedStroke] = useState<string>("ALL");
  const [selectedKU, setSelectedKU] = useState<string>("ALL");

  // Keep selectedTournamentID in sync when tournaments prop loads async
  useEffect(() => {
    if (tournaments && tournaments.length > 0) {
      if (!selectedTournamentID || !tournaments.some((t) => String(t.id) === String(selectedTournamentID))) {
        setSelectedTournamentID(String(tournaments[0].id));
      }
    }
  }, [tournaments]);

  const currentTourney =
    (tournaments || []).find((t) => String(t.id) === String(selectedTournamentID)) ||
    tournaments?.[0];

  const activeTourneyID = currentTourney?.id ? String(currentTourney.id) : selectedTournamentID;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isRegistrationClosed = currentTourney?.registration_end_date
    ? todayStr > currentTourney.registration_end_date
    : false;

  // Retrieve events belonging to selected tournament (either from preloaded array or top-level list)
  const tourneyEvents: SwimmingEvent[] =
    currentTourney?.events && currentTourney.events.length > 0
      ? currentTourney.events
      : (events || []).filter(
          (e) => !activeTourneyID || String(e.tournament_id) === String(activeTourneyID)
        );

  // Helper matchers for robust filtering
  const isGenderMatch = (eventGender?: string, targetGender?: string) => {
    if (!targetGender || targetGender === "ALL") return true;
    if (!eventGender) return false;
    return eventGender.toUpperCase() === targetGender.toUpperCase();
  };

  const isStrokeMatch = (eventStroke?: string, targetCode?: string) => {
    if (!targetCode || targetCode === "ALL") return true;
    if (!eventStroke) return false;
    const s = eventStroke.toUpperCase();
    const t = targetCode.toUpperCase();
    if (s === t) return true;
    if (t === "FREESTYLE" && (s.includes("BEBAS") || s.includes("FREE"))) return true;
    if (t === "BREASTSTROKE" && (s.includes("DADA") || s.includes("BREAST"))) return true;
    if (t === "BACKSTROKE" && (s.includes("PUNGGUNG") || s.includes("BACK"))) return true;
    if (t === "BUTTERFLY" && (s.includes("KUPU") || s.includes("FLY") || s.includes("BUTTERFLY"))) return true;
    if (t === "INDIVIDUALMEDLEY" || t === "MEDLEY") {
      if (s.includes("MEDLEY") || s.includes("GANTI") || s.includes("INDIVIDUAL")) return true;
    }
    return false;
  };

  const isKUMatch = (eventKU?: string, targetKU?: string) => {
    if (!targetKU || targetKU === "ALL") return true;
    if (targetKU === "OPEN") {
      if (!eventKU || eventKU.toUpperCase() === "OPEN") return true;
    }
    if (!eventKU) return false;
    const normEvent = eventKU.toUpperCase().replace(/\s+/g, "");
    const normTarget = targetKU.toUpperCase().replace(/\s+/g, "");
    return normEvent === normTarget || normEvent.includes(normTarget);
  };

  // Apply secondary filters (Gender, Stroke, KU)
  const filteredEvents = tourneyEvents.filter((e) => {
    return isGenderMatch(e.gender, selectedGender) &&
           isStrokeMatch(e.stroke, selectedStroke) &&
           isKUMatch(e.age_group, selectedKU);
  });

  return (
    <section id="events" className="py-20 bg-gradient-to-b from-slate-50 via-sky-50/20 to-slate-50 relative font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* HEADER SECTION */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sky-100 border border-sky-200 text-sky-700 rounded-full text-xs font-black tracking-wider uppercase shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>MASTER NOMOR PERLOMBAAN</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Daftar Nomor Lomba per Turnamen
          </h2>
          <p className="text-slate-600 text-sm font-medium">
            Pilih turnamen / kejuaraan dari dropdown di bawah untuk melihat rincian cabang nomor lomba, jadwal, dan batas waktu pendaftaran.
          </p>
        </div>

        {/* PROMINENT TOURNAMENT SELECTOR BANNER & METADATA CARD */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-sky-200 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-2 flex-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                PILIH TURNAMEN / KEJUARAAN INDUK:
              </label>
              <div className="relative">
                <select
                  value={selectedTournamentID}
                  onChange={(e) => setSelectedTournamentID(e.target.value)}
                  className="w-full lg:max-w-xl px-4 py-3.5 bg-sky-50/80 border-2 border-sky-400 rounded-2xl text-slate-900 font-black text-sm sm:text-base focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm cursor-pointer"
                >
                  {(tournaments || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      🏆 {t.name} {t.registration_end_date ? `(Batas: ${t.registration_end_date})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DYNAMIC STATUS BADGE */}
            <div className="self-start lg:self-center">
              {isRegistrationClosed ? (
                <div className="px-5 py-2.5 bg-red-100 text-red-900 rounded-2xl text-xs font-black border border-red-300 flex items-center gap-2 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span>PENDAFTARAN DITUTUP</span>
                  <span className="text-[10px] font-bold opacity-80">(Batas Waktu Terlampaui)</span>
                </div>
              ) : (
                <div className="px-5 py-2.5 bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-black border border-emerald-300 flex items-center gap-2 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>PENDAFTARAN DIBUKA</span>
                </div>
              )}
            </div>
          </div>

          {/* TOURNAMENT METADATA DETAILS BAR */}
          {currentTourney && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">LOKASI VENUE:</span>
                  <span className="font-black text-slate-900 truncate block">
                    {currentTourney.location || "Kolam Renang Gelanggang Tangerang"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-100 rounded-xl text-sky-600 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">BATAS PENDAFTARAN:</span>
                  <span className={isRegistrationClosed ? "font-black text-red-600" : "font-black text-emerald-700"}>
                    {currentTourney.registration_start_date || "-"} s/d {currentTourney.registration_end_date || "-"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">JADWAL TURNAMEN:</span>
                  <span className="font-black text-slate-900">
                    {currentTourney.event_start_date || "-"} s/d {currentTourney.event_end_date || "-"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">TOTAL NOMOR LOMBA:</span>
                  <span className="font-black text-indigo-700">
                    {tourneyEvents.length} Nomor Terdaftar
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECONDARY GENDER, STROKE & KU FILTERS PILLS BAR */}
        <div className="flex flex-wrap gap-4 justify-center items-center">
          {/* GENDER FILTER */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 px-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Gender:
            </span>
            {["ALL", "PUTRA", "PUTRI"].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGender(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedGender === g
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {g === "ALL" ? "Semua" : g}
              </button>
            ))}
          </div>

          {/* STROKE / GAYA FILTER */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 px-2">Gaya:</span>
            {[
              { code: "ALL", label: "Semua" },
              { code: "FREESTYLE", label: "FREESTYLE" },
              { code: "BREASTSTROKE", label: "BREASTSTROKE" },
              { code: "BACKSTROKE", label: "BACKSTROKE" },
              { code: "BUTTERFLY", label: "BUTTERFLY" },
              { code: "INDIVIDUALMEDLEY", label: "MEDLEY" },
            ].map((s) => (
              <button
                key={s.code}
                onClick={() => setSelectedStroke(s.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedStroke === s.code
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* KELOMPOK UMUR (KU) FILTER */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 px-2">KU:</span>
            {["ALL", "KU 4", "KU 3", "KU 2", "KU 1", "Senior", "OPEN"].map((ku) => (
              <button
                key={ku}
                onClick={() => setSelectedKU(ku)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedKU === ku
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {ku === "ALL" ? "Semua KU" : ku}
              </button>
            ))}
          </div>
        </div>

        {/* EVENT CARDS GRID (FILTERED PER TOURNAMENT) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-slate-700 font-black text-sm">
                Tidak ada nomor lomba terdaftar yang sesuai filter untuk turnamen ini.
              </p>
              <p className="text-slate-400 text-xs font-medium">
                Coba ubah filter Gender, Gaya, atau Kelompok Umur (KU) di atas.
              </p>
            </div>
          ) : (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-sky-400 transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 bg-sky-50 rounded-xl text-xs font-black text-sky-700 border border-sky-200">
                      #{ev.event_code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {ev.age_group && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-slate-100 text-slate-700">
                          {ev.age_group}
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-black ${
                          ev.gender === "PUTRA" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                        }`}
                      >
                        {ev.gender}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-slate-900 leading-snug">{ev.event_name}</h3>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                    <div>
                      Jarak: <span className="text-slate-900 font-black">{ev.distance}</span>
                    </div>
                    <div>
                      Gaya: <span className="text-slate-900 font-black">{ev.stroke}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-black text-emerald-600">
                      Rp {ev.fee ? Number(ev.fee).toLocaleString("id-ID") : "150.000"} / Nomor
                    </span>
                    {isRegistrationClosed ? (
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed">
                        Ditutup
                      </span>
                    ) : (
                      <a
                        href="#register"
                        className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white text-xs font-bold rounded-xl transition-all shadow-2xs"
                      >
                        Daftar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
