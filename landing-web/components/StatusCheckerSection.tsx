"use client";

import { useState } from "react";
import { checkRegistrationCode } from "../lib/api-client";
import { Search, XCircle } from "lucide-react";

export default function StatusCheckerSection() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setSearched(true);
    const res = await checkRegistrationCode(code.trim().toUpperCase());
    setLoading(false);

    if (res.success && res.data) {
      setResults(res.data);
    } else {
      setResults([]);
    }
  };

  return (
    <section id="status-check" className="py-20 bg-slate-50 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-cyan-700 font-extrabold text-xs tracking-wider uppercase bg-cyan-100 px-3 py-1 rounded-full border border-cyan-200">
            TRANSPARANSI & VERIFIKASI
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900">Cek Status Pendaftaran</h2>
          <p className="mt-2 text-slate-600 text-sm font-medium">
            Masukkan Kode Pendaftaran Anda (contoh: <code className="text-sky-700 font-mono font-bold">SWIM-2025-0001</code>) untuk mengecek status verifikasi & penetapan Heat.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-3 mb-10">
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Masukkan Kode Registrasi..."
            className="flex-1 px-5 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-900 font-mono font-bold text-base focus:outline-none focus:border-sky-500 shadow-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold rounded-2xl shadow-md shadow-sky-500/20 flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            {loading ? "Mencari..." : "Cek Status"}
          </button>
        </form>

        {searched && (
          <div>
            {results && results.length > 0 ? (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-500">Kode Pendaftaran:</span>
                    <h3 className="text-xl font-black text-sky-700 font-mono">{results[0]?.registration_code}</h3>
                  </div>

                  <div className="mt-2 sm:mt-0">
                    <span className="text-xs font-bold text-slate-500 mr-2">Nama Perenang:</span>
                    <span className="text-base font-black text-slate-900">{results[0]?.participant?.name}</span>
                    <span className="ml-2 text-xs font-bold text-slate-500">({results[0]?.participant?.club})</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-200">
                        <th className="py-2.5 font-bold">Nomor Lomba</th>
                        <th className="py-2.5 font-bold">Time Seed</th>
                        <th className="py-2.5 font-bold">Status Pembayaran</th>
                        <th className="py-2.5 font-bold">Heat & Line</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((r: any, idx: number) => (
                        <tr key={idx} className="text-slate-800">
                          <td className="py-3 font-bold text-slate-900">{r.swimming_event?.event_name}</td>
                          <td className="py-3 font-mono font-bold text-cyan-700">{r.time_seed}</td>
                          <td className="py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                r.payment_status === "verified"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : r.payment_status === "rejected"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {r.payment_status}
                            </span>
                          </td>
                          <td className="py-3 font-bold text-sky-700">
                            {r.heat_number > 0 ? (
                              <span>HEAT {r.heat_number} - LINE {r.line_number}</span>
                            ) : (
                              <span className="text-slate-400 font-normal italic">Belum di-generate</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-3xl bg-white border border-slate-200 text-slate-600 shadow-sm">
                <XCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <p className="text-sm font-bold">Kode pendaftaran tidak ditemukan. Pastikan Anda memasukkan kode dengan benar.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
