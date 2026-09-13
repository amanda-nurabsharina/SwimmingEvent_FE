"use client";

import { useEffect, useState } from "react";
import { getStartingList } from "../../lib/api-client";
import { Download, RefreshCw } from "lucide-react";

export default function StartingListPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    const res = await getStartingList();
    if (res?.success) {
      setList(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div className="py-16 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-sky-700 font-extrabold text-xs tracking-wider uppercase bg-sky-100 px-3 py-1 rounded-full border border-sky-200">
            DOKUMEN RESMI PERLOMBAAN
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-slate-900">
            STARTING LIST - TIME TRIAL 2025
          </h1>
          <p className="mt-2 text-slate-600 font-bold text-sm">
            AKUATIK INDONESIA KOTA TANGERANG
          </p>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-md mb-6 gap-4">
          <div className="text-sm font-bold text-slate-700">
            Total Pendaftar / Perenang: <span className="text-sky-600 font-black">{list.length} Item</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchList}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-sky-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Cetak / Export PDF Starting List
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                <th className="p-3.5 text-center w-12">NO</th>
                <th className="p-3.5">NAMA</th>
                <th className="p-3.5">JENIS KELAMIN</th>
                <th className="p-3.5 text-center">TIME SEED</th>
                <th className="p-3.5">NOMOR LOMBA</th>
                <th className="p-3.5">CLUB</th>
                <th className="p-3.5">PIC</th>
                <th className="p-3.5">KONTAK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {list.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                  <td className="p-3.5 text-center font-bold text-slate-500">{item.no || idx + 1}</td>
                  <td className="p-3.5 font-black text-slate-900 uppercase">{item.nama}</td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${item.jenis_kelamin === "PUTRA" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"}`}>
                      {item.jenis_kelamin}
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold text-cyan-700">{item.time_seed}</td>
                  <td className="p-3.5 font-bold text-sky-700">{item.nomor_lomba}</td>
                  <td className="p-3.5 font-bold text-slate-700">{item.club}</td>
                  <td className="p-3.5 text-slate-600 font-medium">{item.pic || "-"}</td>
                  <td className="p-3.5 font-mono text-slate-600 font-medium">{item.kontak || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
