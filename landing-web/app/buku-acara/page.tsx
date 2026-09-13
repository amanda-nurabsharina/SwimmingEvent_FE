"use client";

import { useEffect, useState } from "react";
import { getBukuAcara } from "../../lib/api-client";
import { Download, RefreshCw } from "lucide-react";

export default function BukuAcaraPage() {
  const [eventGroups, setEventGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBukuAcara = async () => {
    setLoading(true);
    const res = await getBukuAcara();
    if (res?.success) {
      setEventGroups(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBukuAcara();
  }, []);

  return (
    <div className="py-16 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-cyan-700 font-extrabold text-xs tracking-wider uppercase bg-cyan-100 px-3 py-1 rounded-full border border-cyan-200">
            DOKUMEN BAGAN TURNAMEN
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-slate-900">
            BUKU ACARA - TIME TRIAL 2025
          </h1>
          <p className="mt-2 text-slate-600 font-bold text-sm">
            AKUATIK INDONESIA KOTA TANGERANG
          </p>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-md mb-8 gap-4">
          <div className="text-sm font-bold text-slate-700">
            Total Event Terdaftar: <span className="text-cyan-700 font-black">{eventGroups.length} Event</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchBukuAcara}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-cyan-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Cetak / Export PDF Buku Acara
            </button>
          </div>
        </div>

        {/* Event Groups List */}
        <div className="space-y-10">
          {eventGroups.map((group: any, idx: number) => (
            <div key={idx} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xl">
              {/* Event Header Banner */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-3.5 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black font-mono bg-black/20 px-3 py-1 rounded-lg">
                    {group.event_code}
                  </span>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wide">
                    {group.event_name}
                  </h3>
                </div>
                <span className="text-xs font-black bg-white/20 px-3 py-1 rounded-full uppercase">
                  {group.gender}
                </span>
              </div>

              {/* Heat Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                      <th className="p-3.5 text-center w-16">HEAT</th>
                      <th className="p-3.5 text-center w-16">LINE</th>
                      <th className="p-3.5">NAMA</th>
                      <th className="p-3.5">JENIS KELAMIN</th>
                      <th className="p-3.5">CLUB</th>
                      <th className="p-3.5 text-center">TIME SEED</th>
                      <th className="p-3.5 text-center">RESULT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {group.heats?.map((item: any, hIdx: number) => (
                      <tr key={hIdx} className="hover:bg-cyan-50/50 transition-colors">
                        <td className="p-3.5 text-center font-black text-amber-700">{item.heat}</td>
                        <td className="p-3.5 text-center font-black text-sky-700">{item.line}</td>
                        <td className="p-3.5 font-black text-slate-900 uppercase">{item.nama}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${item.jenis_kelamin === "PUTRA" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"}`}>
                            {item.jenis_kelamin}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-700">{item.club}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-cyan-700">{item.time_seed}</td>
                        <td className="p-3.5 text-center font-mono font-black text-emerald-700">
                          {item.result || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
