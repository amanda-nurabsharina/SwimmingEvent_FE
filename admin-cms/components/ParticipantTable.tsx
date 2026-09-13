"use client";

import { useState } from "react";
import { verifyPayment } from "../lib/api-admin";
import { Search, CheckCircle, XCircle, Eye, ExternalLink } from "lucide-react";

export default function ParticipantTable({
  registrations,
  onRefresh,
}: {
  registrations: any[];
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  const filtered = registrations.filter((r) => {
    const matchStatus = filterStatus === "ALL" || r.payment_status === filterStatus;
    const q = search.toLowerCase();
    const matchQuery =
      r.registration_code?.toLowerCase().includes(q) ||
      r.participant?.name?.toLowerCase().includes(q) ||
      r.participant?.club?.toLowerCase().includes(q) ||
      r.swimming_event?.event_name?.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const handleVerify = async (id: number, status: string) => {
    if (confirm(`Ubah status pembayaran pendaftaran ini menjadi ${status.toUpperCase()}?`)) {
      const res = await verifyPayment(id, status);
      if (res.success) {
        onRefresh();
      } else {
        alert(res.message || "Gagal mengubah status");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Perenang, Kode, Klub..."
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-sky-500 w-64 shadow-sm"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {["ALL", "pending", "verified", "rejected"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  filterStatus === st ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs font-bold text-slate-600">
          Menampilkan <span className="text-sky-700 font-black">{filtered.length}</span> dari {registrations.length} Pendaftaran
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-md">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
              <th className="p-3.5">KODE REGISTRASI</th>
              <th className="p-3.5">NAMA PERENANG</th>
              <th className="p-3.5">KLUB / KONTINGEN</th>
              <th className="p-3.5">NOMOR LOMBA</th>
              <th className="p-3.5 text-center">TIME SEED</th>
              <th className="p-3.5 text-center">HEAT & LINE</th>
              <th className="p-3.5 text-center">BUKTI BAYAR</th>
              <th className="p-3.5 text-center">STATUS</th>
              <th className="p-3.5 text-right">AKSI VERIFIKASI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-sky-50/50 transition-colors">
                <td className="p-3.5 font-mono font-bold text-sky-700">{r.registration_code}</td>
                <td className="p-3.5 font-black text-slate-900 uppercase">{r.participant?.name}</td>
                <td className="p-3.5 font-bold text-slate-700">{r.participant?.club}</td>
                <td className="p-3.5 font-bold text-cyan-700">{r.swimming_event?.event_name}</td>
                <td className="p-3.5 text-center font-mono font-bold text-amber-700">{r.time_seed}</td>
                <td className="p-3.5 text-center font-bold text-slate-800">
                  {r.heat_number > 0 ? (
                    <span className="text-sky-700">H{r.heat_number} / L{r.line_number}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic">-</span>
                  )}
                </td>
                <td className="p-3.5 text-center">
                  {r.payment_proof_url ? (
                    <button
                      onClick={() => setSelectedProof(r.payment_proof_url)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-sky-700 rounded-lg border border-slate-300 flex items-center gap-1 mx-auto font-bold shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat
                    </button>
                  ) : (
                    <span className="text-slate-400 italic">Tidak ada</span>
                  )}
                </td>
                <td className="p-3.5 text-center">
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
                <td className="p-3.5 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleVerify(r.id, "verified")}
                      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border border-emerald-200"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Setuju
                    </button>
                    <button
                      onClick={() => handleVerify(r.id, "rejected")}
                      className="px-2.5 py-1 bg-red-100 hover:bg-red-600 text-red-800 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border border-red-200"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Proof Preview Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-slate-900">Bukti Transfer Pembayaran</h3>
              <button onClick={() => setSelectedProof(null)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
                ✕
              </button>
            </div>
            <div className="bg-slate-100 p-2 rounded-2xl overflow-hidden mb-4 max-h-96 flex items-center justify-center border border-slate-200">
              <img src={selectedProof} alt="Bukti Transfer" className="max-h-80 object-contain rounded-xl" />
            </div>
            <div className="flex justify-between items-center">
              <a
                href={selectedProof}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
              </a>
              <button
                onClick={() => setSelectedProof(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
