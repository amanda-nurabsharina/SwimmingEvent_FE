"use client";

import { useState } from "react";
import { Filter, Trophy, Calendar, MapPin, Clock } from "lucide-react";

interface SwimmingEvent {
  id: number;
  tournament_id?: number;
  event_code: number;
  event_name: string;
  distance: string;
  stroke: string;
  gender: string;
  fee: number;
}

export default function EventInfoSection({
  events = [],
  tournaments = [],
}: {
  events?: SwimmingEvent[];
  tournaments?: any[];
}) {
  const [selectedTournamentID, setSelectedTournamentID] = useState<string>(
    tournaments?.[0]?.id ? String(tournaments[0].id) : "1"
  );
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedStroke, setSelectedStroke] = useState<string>("ALL");

  const currentTourney =
    tournaments.find((t) => String(t.id) === String(selectedTournamentID)) || tournaments[0];

  const todayStr = new Date().toISOString().slice(0, 10);
  const isRegistrationClosed = currentTourney?.registration_end_date
    ? todayStr > currentTourney.registration_end_date
    : false;

  const filteredEvents = (events || []).filter((e) => {
    const matchTourney =
      !selectedTournamentID || String(e.tournament_id) === String(selectedTournamentID);
    const matchGender = selectedGender === "ALL" || e.gender === selectedGender;
    const matchStroke = selectedStroke === "ALL" || e.stroke === selectedStroke;
    return matchTourney && matchGender && matchStroke;
  });

  return (
    <section id="events" className="py-20 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-sky-600 font-extrabold text-xs tracking-wider uppercase bg-sky-100 px-3 py-1 rounded-full border border-sky-200">
            MASTER NOMOR PERLOMBAAN
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            Daftar Nomor Lomba per Turnamen
          </h2>
          <p className="text-slate-600 text-sm font-medium">
            Pilih turnamen / kejuaraan dari dropdown di bawah untuk melihat rincian cabang nomor lomba, jadwal, dan batas waktu pendaftaran.
          </p>
        </div>

        {/* PROMINENT TOURNAMENT SELECTOR BANNER */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-sky-200 shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                PILIH TURNAMEN / KEJUARAAN INDUK:
              </label>
              <div className="relative">
                <select
                  value={selectedTournamentID}
                  onChange={(e) => setSelectedTournamentID(e.target.value)}
                  className="w-full md:w-96 px-4 py-3.5 bg-sky-50 border-2 border-sky-400 rounded-2xl text-slate-900 font-black text-sm sm:text-base focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm cursor-pointer"
                >
                  {(tournaments || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      🏆 {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* STATUS BADGE */}
            <div>
              {isRegistrationClosed ? (
                <span className="px-4 py-2 bg-red-100 text-red-800 rounded-2xl text-xs font-black border border-red-300 flex items-center gap-2 shadow-xs">
                  <span>🚫 PENDAFTARAN DITUTUP</span>
                  <span className="text-[10px] font-bold opacity-80">(Batas Waktu Terlampaui)</span>
                </span>
              ) : (
                <span className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-2xl text-xs font-black border border-emerald-300 flex items-center gap-2 shadow-xs">
                  <span>🟢 PENDAFTARAN DIBUKA</span>
                </span>
              )}
            </div>
          </div>

          {/* SELECTED TOURNAMENT METADATA DETAILS */}
          {currentTourney && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">LOKASI VENUE:</span>
                  <span className="font-black text-slate-900">{currentTourney.location || "Gelanggang Tangerang"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">BATAS PENDAFTARAN:</span>
                  <span className={isRegistrationClosed ? "font-black text-red-600" : "font-black text-emerald-700"}>
                    {currentTourney.registration_start_date || "-"} s/d {currentTourney.registration_end_date || "-"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">JADWAL PELAKSANAAN:</span>
                  <span className="font-black text-slate-900">
                    {currentTourney.event_start_date || "-"} s/d {currentTourney.event_end_date || "-"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECONDARY GENDER & STROKE FILTERS */}
        <div className="flex flex-wrap gap-4 justify-center items-center">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 px-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Gender:
            </span>
            {["ALL", "PUTRA", "PUTRI"].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGender(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedGender === g
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {g === "ALL" ? "Semua" : g}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 px-2">Gaya:</span>
            {["ALL", "FREESTYLE", "BREASTSTROKE", "BACKSTROKE", "BUTTERFLY", "INDIVIDUALMEDLEY"].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStroke(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedStroke === s
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s === "ALL" ? "Semua" : s.replace("INDIVIDUALMEDLEY", "MEDLEY")}
              </button>
            ))}
          </div>
        </div>

        {/* EVENT CARDS GRID (FILTERED PER TOURNAMENT) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200">
              <p className="text-slate-500 font-bold text-sm">
                Tidak ada nomor lomba terdaftar untuk turnamen ini.
              </p>
            </div>
          ) : (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-sky-400 transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-sky-50 rounded-lg text-xs font-black text-sky-700 border border-sky-200">
                      EVENT #{ev.event_code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        ev.gender === "PUTRA" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                      }`}
                    >
                      {ev.gender}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 mb-2 leading-snug">{ev.event_name}</h3>
                </div>

                <div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-4 border-t border-slate-100 pt-3">
                    <div>Jarak: <span className="text-slate-800 font-bold">{ev.distance}</span></div>
                    <div>Gaya: <span className="text-slate-800 font-bold">{ev.stroke}</span></div>
                  </div>

                  <div className="mt-4 flex justify-between items-center pt-2">
                    <span className="text-sm font-black text-amber-600">
                      Rp {ev.fee ? ev.fee.toLocaleString("id-ID") : "150.000"} / Nomor
                    </span>
                    {isRegistrationClosed ? (
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-lg cursor-not-allowed">
                        Pendaftaran Ditutup
                      </span>
                    ) : (
                      <a
                        href="#register"
                        className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white text-xs font-bold rounded-lg transition-all"
                      >
                        Pilih Lomba
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
