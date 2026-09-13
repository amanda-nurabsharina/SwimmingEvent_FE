"use client";

import { useState } from "react";
import { recordRaceResult } from "../lib/api-admin";
import { Trophy, Check, Edit2 } from "lucide-react";

export default function RaceResultEditor({
  registrations,
  onRefresh,
}: {
  registrations: any[];
  onRefresh: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [timeStr, setTimeStr] = useState("");
  const [rank, setRank] = useState(1);

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setTimeStr(r.race_result_time || "");
    setRank(r.rank || 1);
  };

  const saveResult = async (id: number) => {
    const res = await recordRaceResult(id, timeStr, rank);
    if (res.success) {
      setEditingId(null);
      onRefresh();
    } else {
      alert("Gagal menyimpan hasil race");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Pencatatan Catatan Waktu Akhir & Juara (Race Results)
          </h2>
          <p className="text-xs font-medium text-slate-600">
            Masukkan waktu hasil pertandingan perenang untuk menentukan pemenang secara langsung.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-md">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
              <th className="p-3.5">NOMOR LOMBA</th>
              <th className="p-3.5 text-center">HEAT / LINE</th>
              <th className="p-3.5">NAMA PERENANG</th>
              <th className="p-3.5">KLUB</th>
              <th className="p-3.5 text-center">TIME SEED</th>
              <th className="p-3.5 text-center">WAKTU HASIL (RESULT)</th>
              <th className="p-3.5 text-center">PERINGKAT / JUARA</th>
              <th className="p-3.5 text-right">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {registrations.map((r) => {
              const isEditing = editingId === r.id;
              return (
                <tr key={r.id} className="hover:bg-cyan-50/50 transition-colors">
                  <td className="p-3.5 font-bold text-cyan-700">{r.swimming_event?.event_name}</td>
                  <td className="p-3.5 text-center font-black text-sky-700">
                    H{r.heat_number || 1} / L{r.line_number || 1}
                  </td>
                  <td className="p-3.5 font-black text-slate-900 uppercase">{r.participant?.name}</td>
                  <td className="p-3.5 font-bold text-slate-700">{r.participant?.club}</td>
                  <td className="p-3.5 text-center font-mono font-bold text-slate-600">{r.time_seed}</td>

                  <td className="p-3.5 text-center font-mono">
                    {isEditing ? (
                      <input
                        type="text"
                        value={timeStr}
                        onChange={(e) => setTimeStr(e.target.value)}
                        placeholder="00.28.14"
                        className="w-24 px-2 py-1 bg-white border border-sky-500 rounded text-center text-xs font-bold text-emerald-700 shadow-sm"
                      />
                    ) : (
                      <span className="font-black text-emerald-700">{r.race_result_time || "-"}</span>
                    )}
                  </td>

                  <td className="p-3.5 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={rank}
                        onChange={(e) => setRank(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-white border border-sky-500 rounded text-center text-xs font-bold text-amber-700 shadow-sm"
                      />
                    ) : (
                      <span className="font-black text-amber-700">{r.rank > 0 ? `Juara ${r.rank}` : "-"}</span>
                    )}
                  </td>

                  <td className="p-3.5 text-right">
                    {isEditing ? (
                      <button
                        onClick={() => saveResult(r.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 ml-auto shadow-md"
                      >
                        <Check className="w-3.5 h-3.5" /> Simpan
                      </button>
                    ) : (
                      <button
                        onClick={() => startEdit(r)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-sky-700 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto border border-slate-300 shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Hasil
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
