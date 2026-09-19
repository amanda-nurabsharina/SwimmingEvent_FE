"use client";

import React, { useState } from "react";
import {
  Trophy,
  Award,
  Medal,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  EventGroupData,
  calculateEventChampions,
  RankedSwimmer,
} from "../lib/champion-utils";

interface ChampionsViewProps {
  events: EventGroupData[];
  tournamentName?: string;
  isPublic?: boolean;
}

export default function ChampionsView({
  events,
  tournamentName,
  isPublic = false,
}: ChampionsViewProps) {
  const [expandedEventMap, setExpandedEventMap] = useState<{ [code: number]: boolean }>({});

  const toggleExpand = (eventCode: number) => {
    setExpandedEventMap((prev) => ({
      ...prev,
      [eventCode]: !prev[eventCode],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (events.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
        <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-black text-slate-800">
          Tidak Ada Data Hasil Juara Sesuai Filter
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          Silakan atur filter pencarian turnamen atau nomor lomba di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Title Banner */}
      <div className="no-print bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 p-6 rounded-3xl text-white shadow-lg shadow-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white shrink-0 border border-white/30 shadow-inner">
            <Trophy className="w-8 h-8 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-black/20 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                Official Results & Podium
              </span>
              <span className="text-xs text-amber-100 font-bold">
                {tournamentName || "Kejuaraan Renang Resmi"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white mt-1">
              Rekap Hasil Juara & Podium Lomba
            </h2>
            <p className="text-xs text-amber-100/90 font-medium mt-0.5">
              Heat Angka: Juara 1, 2, 3 berdasarkan catatan waktu tercepat • Group Abjad: Perenang tercepat di setiap group
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2.5 bg-white text-slate-900 hover:bg-amber-50 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 shrink-0"
        >
          <Printer className="w-4 h-4 text-amber-600" />
          <span>Cetak Rekap Juara</span>
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-8">
        {events.map((event) => {
          const champ = calculateEventChampions(event);
          const isExpanded = Boolean(expandedEventMap[event.event_code]);

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
                  {champ.isGroup ? (
                    <span className="bg-purple-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase shadow-xs">
                      GROUP ABJAD (SEMUA GROUP BERPELUANG JUARA)
                    </span>
                  ) : (
                    <span className="bg-sky-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase shadow-xs">
                      HEAT ANGKA (TIMED FINAL JUARA 1-3)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-black">
                  <span className="px-3 py-1 bg-white/10 rounded-full border border-white/20 uppercase">
                    {event.gender}
                  </span>
                  <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
                    {champ.totalSwimmers} Perenang Terdaftar
                  </span>
                </div>
              </div>

              {/* Event Content: Champions Section */}
              <div className="p-4 sm:p-6 bg-slate-50/60 space-y-6">
                {!champ.hasResults ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <div className="text-sm font-black text-slate-800">
                      Belum Ada Catatan Waktu Tercatat
                    </div>
                    <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                      Pencatatan waktu hasil lomba untuk nomor ini belum diisi oleh panitia juri atau belum ada perenang yang finis.
                    </p>
                  </div>
                ) : !champ.isGroup ? (
                  /* ========================================================= */
                  /* HEAT NUMBER CHAMPIONS (PODIUM 1, 2, 3)                    */
                  /* ========================================================= */
                  <div className="space-y-6">
                    {/* Top 3 Podium Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                      {/* 🥇 Juara 1 (Emas) */}
                      {champ.juara1 ? (
                        <div className="bg-gradient-to-b from-amber-50 to-white border-2 border-amber-400 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                          <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                            <Trophy className="w-32 h-32 text-amber-600" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="px-3 py-1 bg-amber-400 text-amber-950 rounded-xl text-xs font-black tracking-wider uppercase shadow-sm inline-flex items-center gap-1.5">
                                🥇 JUARA 1 (EMAS)
                              </span>
                              <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                                WAKTU TERCEPAT
                              </span>
                            </div>
                            <div className="font-black text-base sm:text-lg text-slate-900 uppercase leading-snug">
                              {champ.juara1.nama}
                            </div>
                            <div className="text-xs font-bold text-slate-600 mt-1 uppercase">
                              {champ.juara1.club || "Independen"}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-amber-200/80 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                Hasil Resmi
                              </span>
                              <span className="text-lg font-mono font-black text-amber-950">
                                {champ.juara1.result}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                Seri & Line
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                Seri {champ.juara1.heat} • Line {champ.juara1.line}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-5 text-center text-slate-400 flex items-center justify-center">
                          Belum ada perenang finis untuk Juara 1
                        </div>
                      )}

                      {/* 🥈 Juara 2 (Perak) */}
                      {champ.juara2 ? (
                        <div className="bg-gradient-to-b from-slate-100 to-white border-2 border-slate-300 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                          <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                            <Medal className="w-32 h-32 text-slate-600" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="px-3 py-1 bg-slate-200 text-slate-900 rounded-xl text-xs font-black tracking-wider uppercase shadow-sm inline-flex items-center gap-1.5 border border-slate-400">
                                🥈 JUARA 2 (PERAK)
                              </span>
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md">
                                {champ.juara2.timeDiff}
                              </span>
                            </div>
                            <div className="font-black text-base sm:text-lg text-slate-900 uppercase leading-snug">
                              {champ.juara2.nama}
                            </div>
                            <div className="text-xs font-bold text-slate-600 mt-1 uppercase">
                              {champ.juara2.club || "Independen"}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                Hasil Resmi
                              </span>
                              <span className="text-lg font-mono font-black text-slate-800">
                                {champ.juara2.result}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                Seri & Line
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                Seri {champ.juara2.heat} • Line {champ.juara2.line}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-5 text-center text-slate-400 flex items-center justify-center">
                          Belum ada perenang finis untuk Juara 2
                        </div>
                      )}

                      {/* 🥉 Juara 3 (Perunggu) */}
                      {champ.juara3 ? (
                        <div className="bg-gradient-to-b from-amber-100/40 to-white border-2 border-amber-600/40 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                          <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                            <Award className="w-32 h-32 text-amber-800" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="px-3 py-1 bg-amber-700/20 text-amber-950 rounded-xl text-xs font-black tracking-wider uppercase shadow-sm inline-flex items-center gap-1.5 border border-amber-700/30">
                                🥉 JUARA 3 (PERUNGGU)
                              </span>
                              <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                                {champ.juara3.timeDiff}
                              </span>
                            </div>
                            <div className="font-black text-base sm:text-lg text-slate-900 uppercase leading-snug">
                              {champ.juara3.nama}
                            </div>
                            <div className="text-xs font-bold text-slate-600 mt-1 uppercase">
                              {champ.juara3.club || "Independen"}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-amber-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                Hasil Resmi
                              </span>
                              <span className="text-lg font-mono font-black text-amber-900">
                                {champ.juara3.result}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                Seri & Line
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                Seri {champ.juara3.heat} • Line {champ.juara3.line}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-5 text-center text-slate-400 flex items-center justify-center">
                          Belum ada perenang finis untuk Juara 3
                        </div>
                      )}
                    </div>

                    {/* Collapsible Full Standings Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => toggleExpand(event.event_code)}
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-black text-slate-700 transition-colors border-b border-slate-200"
                      >
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-sky-600" />
                          <span>Lihat Peringkat Lengkap Semua Perenang (#{champ.allRanked.length} Atlet)</span>
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 font-black text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-200">
                                <th className="py-2.5 px-3 w-16 text-center">RANK</th>
                                <th className="py-2.5 px-4">NAMA PERENANG</th>
                                <th className="py-2.5 px-3 w-28 text-center">SERI & LINTASAN</th>
                                <th className="py-2.5 px-4">CLUB</th>
                                <th className="py-2.5 px-3 w-28 text-center">TIME SEED</th>
                                <th className="py-2.5 px-3 w-32 text-center">HASIL RESMI</th>
                                <th className="py-2.5 px-3 w-28 text-center">SELISIH WAKTU</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {champ.allRanked.map((s, idx) => (
                                <tr
                                  key={idx}
                                  className={`hover:bg-slate-50/80 transition-colors ${
                                    s.overallRank === 1
                                      ? "bg-amber-50/50 font-black"
                                      : s.overallRank === 2
                                      ? "bg-slate-50 font-bold"
                                      : s.overallRank === 3
                                      ? "bg-amber-100/20 font-bold"
                                      : ""
                                  }`}
                                >
                                  <td className="py-2.5 px-3 text-center">
                                    {s.overallRank === 1 ? (
                                      <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-amber-950 font-black text-xs shadow-xs">
                                        🥇 1
                                      </span>
                                    ) : s.overallRank === 2 ? (
                                      <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800 font-black text-xs">
                                        🥈 2
                                      </span>
                                    ) : s.overallRank === 3 ? (
                                      <span className="px-2 py-0.5 rounded-lg bg-amber-700/20 text-amber-950 font-black text-xs">
                                        🥉 3
                                      </span>
                                    ) : s.statusLabel ? (
                                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                                        {s.statusLabel}
                                      </span>
                                    ) : s.overallRank < 900 ? (
                                      <span className="font-mono font-bold text-slate-600">
                                        #{s.overallRank}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-bold">-</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 font-bold uppercase text-slate-900">
                                    {s.nama}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                                    Seri {s.heat} • Line {s.line}
                                  </td>
                                  <td className="py-2.5 px-4 uppercase text-slate-700 font-medium">
                                    {s.club || "-"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                                    {s.time_seed || "-"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700">
                                    {s.result || "-"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                                    {s.timeDiff || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ========================================================= */
                  /* GROUP ABJAD CHAMPIONS (FASTEST SWIMMER PER GROUP)         */
                  /* ========================================================= */
                  <div className="space-y-6">
                    <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="font-black text-purple-900">
                          Format Group Abjad: Semua group mandiri berpeluang juara!
                        </span>
                      </div>
                      <span className="text-purple-700 font-medium hidden sm:inline">
                        Total {champ.groupResults.length} Group (A, B, C...)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {champ.groupResults.map((group) => {
                        const winner = group.winner;

                        return (
                          <div
                            key={group.groupNum}
                            className="bg-white border-2 border-purple-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between"
                          >
                            <div>
                              {/* Header Card Group */}
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className="px-3 py-1 bg-purple-600 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-sm">
                                  GROUP {group.groupLabel}
                                </span>
                                <span className="text-[10px] font-black uppercase text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                                  ★ JUARA GROUP
                                </span>
                              </div>

                              {/* Winner Details */}
                              {winner ? (
                                <div className="space-y-1">
                                  <div className="font-black text-base text-slate-900 uppercase leading-snug">
                                    {winner.nama}
                                  </div>
                                  <div className="text-xs font-bold text-slate-600 uppercase">
                                    {winner.club || "Independen"}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-4 text-center text-slate-400 text-xs font-medium italic">
                                  Belum ada catatan waktu tercatat di group ini
                                </div>
                              )}
                            </div>

                            {/* Time & Lane Bar */}
                            {winner && (
                              <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                    Waktu Tercepat
                                  </span>
                                  <span className="text-lg font-mono font-black text-purple-900">
                                    {winner.result}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                    Lintasan
                                  </span>
                                  <span className="text-xs font-bold text-slate-700">
                                    Line {winner.line}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Mini-list of group participants */}
                            <div className="mt-3 pt-2 border-t border-slate-100">
                              <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">
                                Peserta Group {group.groupLabel} ({group.swimmers.length} Atlet):
                              </span>
                              <div className="space-y-1">
                                {group.swimmers.map((sw, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="flex items-center justify-between text-[11px] text-slate-600"
                                  >
                                    <span className="truncate pr-2 font-medium">
                                      {sw.nama}
                                    </span>
                                    <span className="font-mono font-bold text-slate-800 shrink-0">
                                      {sw.result || "-"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
