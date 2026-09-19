"use client";

import { useEffect, useState, useMemo } from "react";
import {
  fetchRaceResultLogs,
  fetchRaceResultLogStats,
} from "../lib/api-admin";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Download,
  ShieldCheck,
  User,
  Clock,
  ArrowRight,
  ArrowLeftRight,
  PlusCircle,
  Edit3,
  Trash2,
  Trophy,
  Lock,
  Unlock,
  Globe,
  Layers,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";

interface RaceResultLog {
  id: number;
  tournament_id: number;
  registration_id: number;
  swimmer_name: string;
  club_name: string;
  event_code: number;
  event_name: string;
  round: string;
  heat_number: number;
  line_number: number;
  action: string;
  old_value: string;
  new_value: string;
  operator_name: string;
  notes: string;
  ip_address: string;
  created_at: string;
}

export default function RaceResultLogViewer({
  tournaments = [],
}: {
  tournaments?: any[];
}) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(0);
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedRound, setSelectedRound] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<RaceResultLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [stats, setStats] = useState<{
    total_logs: number;
    total_create: number;
    total_update: number;
    total_delete: number;
    total_swap: number;
  }>({
    total_logs: 0,
    total_create: 0,
    total_update: 0,
    total_delete: 0,
    total_swap: 0,
  });

  // Default tournament
  useEffect(() => {
    if (tournaments.length > 0 && selectedTournamentId === 0) {
      const active = tournaments.find((t) => t.is_active);
      setSelectedTournamentId(active ? active.id : tournaments[0].id);
    }
  }, [tournaments, selectedTournamentId]);

  const loadLogs = async (p = 1) => {
    setLoading(true);
    const offset = (p - 1) * pageSize;
    const [logRes, statRes] = await Promise.all([
      fetchRaceResultLogs({
        tournament_id: selectedTournamentId > 0 ? selectedTournamentId : undefined,
        action: selectedAction,
        round: selectedRound,
        search: search.trim() || undefined,
        limit: pageSize,
        offset: offset,
      }),
      fetchRaceResultLogStats(selectedTournamentId > 0 ? selectedTournamentId : undefined),
    ]);

    if (logRes?.success && logRes?.data) {
      setLogs(logRes.data.logs || []);
      setTotal(logRes.data.total || 0);
    } else {
      setLogs([]);
      setTotal(0);
    }

    if (statRes?.success && statRes?.data) {
      setStats(statRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    loadLogs(1);
  }, [selectedTournamentId, selectedAction, selectedRound]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadLogs(newPage);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Render badge helper for Actions
  const renderActionBadge = (action: string) => {
    const act = action.toUpperCase();
    switch (act) {
      case "CREATE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-black tracking-wide">
            <PlusCircle className="w-3 h-3 text-emerald-600" /> PENCATATAN BARU
          </span>
        );
      case "UPDATE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-[10px] font-black tracking-wide">
            <Edit3 className="w-3 h-3 text-sky-600" /> KOREKSI WAKTU
          </span>
        );
      case "DELETE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[10px] font-black tracking-wide">
            <Trash2 className="w-3 h-3 text-rose-600" /> PENGHAPUSAN
          </span>
        );
      case "SWAP":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[10px] font-black tracking-wide">
            <ArrowLeftRight className="w-3 h-3 text-purple-600" /> TUKAR LINTASAN
          </span>
        );
      case "MOVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[10px] font-black tracking-wide">
            <ArrowRight className="w-3 h-3 text-indigo-600" /> PINDAH LINTASAN
          </span>
        );
      case "GENERATE_FINAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-black tracking-wide">
            <Trophy className="w-3 h-3 text-amber-700" /> GENERATE FINAL
          </span>
        );
      case "LOCK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-black tracking-wide">
            <Lock className="w-3 h-3 text-amber-400" /> KUNCI BUKU ACARA
          </span>
        );
      case "UNLOCK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg text-[10px] font-black tracking-wide">
            <Unlock className="w-3 h-3 text-slate-600" /> BUKA KUNCI
          </span>
        );
      case "PUBLISH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-black tracking-wide">
            <Globe className="w-3 h-3 text-teal-600" /> PUBLIKASI LIVE
          </span>
        );
      case "UNPUBLISH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-[10px] font-black tracking-wide">
            <Globe className="w-3 h-3 text-orange-600" /> TARIK PUBLIKASI
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
            {action}
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) + " WIB";
    } catch {
      return isoString;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = [
      "ID",
      "Waktu",
      "Operator",
      "IP Address",
      "Aksi",
      "Perenang",
      "Klub",
      "Nomor Lomba",
      "Ronde",
      "Seri",
      "Lintasan",
      "Nilai Lama",
      "Nilai Baru",
      "Keterangan",
    ];

    const rows = logs.map((l) => [
      l.id,
      formatDate(l.created_at),
      l.operator_name || "Admin Panitia",
      l.ip_address || "-",
      l.action,
      l.swimmer_name || "-",
      l.club_name || "-",
      l.event_name ? `${l.event_code} - ${l.event_name}` : "-",
      l.round || "-",
      l.heat_number || "-",
      l.line_number || "-",
      `"${(l.old_value || "").replace(/"/g, '""')}"`,
      `"${(l.new_value || "").replace(/"/g, '""')}"`,
      `"${(l.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Audit_Log_Hasil_Lomba_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentTournament = tournaments.find((t) => t.id === selectedTournamentId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-sky-100 text-sky-800 rounded-full border border-sky-200">
              OPERASIONAL PANITIA & JURI
            </span>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> AUDIT TRAIL AKTIF
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Log Audit Catatan Hasil Lomba
          </h1>
          <p className="text-xs font-bold text-slate-500">
            Rekam jejak setiap aksi pencatatan waktu, penukaran lintasan, penguncian, dan babak final untuk transparansi kejuaraan
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadLogs(page)}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} /> Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-sky-400" /> Cetak Laporan Audit
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-slate-100 text-slate-800 rounded-2xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.total_logs}</div>
            <div className="text-xs font-bold text-slate-500">Total Log Aktivitas</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-100 text-emerald-700 rounded-2xl">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{stats.total_create}</div>
            <div className="text-xs font-bold text-slate-500">Pencatatan Baru (CREATE)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-sky-100 text-sky-700 rounded-2xl">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-sky-700">{stats.total_update}</div>
            <div className="text-xs font-bold text-slate-500">Koreksi Waktu (UPDATE)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-purple-100 text-purple-700 rounded-2xl">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700">{stats.total_swap}</div>
            <div className="text-xs font-bold text-slate-500">Tukar / Pindah Lintasan</div>
          </div>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Turnamen */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Pilih Turnamen
            </label>
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_active ? "(Aktif)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Aksi */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Filter Jenis Aksi (CRUD)
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Jenis Aksi</option>
              <option value="CREATE">Pencatatan Baru (CREATE)</option>
              <option value="UPDATE">Koreksi / Edit Waktu (UPDATE)</option>
              <option value="DELETE">Penghapusan Waktu (DELETE)</option>
              <option value="SWAP">Tukar Posisi (SWAP)</option>
              <option value="MOVE">Pindah Lintasan (MOVE)</option>
              <option value="GENERATE_FINAL">Generate Babak Final</option>
              <option value="LOCK">Kunci / Patenkan Buku Acara</option>
              <option value="PUBLISH">Publikasikan ke Publik</option>
            </select>
          </div>

          {/* Filter Ronde */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Filter Babak / Ronde
            </label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Babak</option>
              <option value="Putaran Awal">Putaran Awal (Penyisihan)</option>
              <option value="Babak Final">Babak Final (Kejuaraan)</option>
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Pencarian Kata Kunci
            </label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Perenang, klub, operator..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Daftar Riwayat Perubahan Hasil ({total} Catatan)
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            Halaman {page} dari {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto text-sky-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Memuat riwayat log audit...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <History className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="text-sm font-black text-slate-700">Belum ada catatan log audit</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Aktivitas pencatatan waktu, penukaran lintasan, dan operasi hasil lomba akan otomatis terekam di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 text-slate-700 font-black border-b border-slate-200 text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">ID</th>
                  <th className="py-3 px-3 w-40">WAKTU & TANGGAL</th>
                  <th className="py-3 px-3 w-36">OPERATOR</th>
                  <th className="py-3 px-3 w-36 text-center">JENIS AKSI</th>
                  <th className="py-3 px-3 w-44">NOMOR LOMBA</th>
                  <th className="py-3 px-3 w-44">PERENANG & LINTASAN</th>
                  <th className="py-3 px-3 w-64">PERUBAHAN (DIFF)</th>
                  <th className="py-3 px-3 min-w-[200px]">KETERANGAN DETAIL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-sky-50/20 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-[11px] font-bold text-slate-400">
                      #{log.id}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {log.operator_name || "Admin Panitia"}
                          </div>
                          {log.ip_address && (
                            <div className="font-mono text-[9px] text-slate-400">
                              {log.ip_address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {renderActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-3">
                      {log.event_name ? (
                        <div>
                          <span className="font-mono font-black text-slate-900 text-[11px]">
                            {log.event_code}
                          </span>{" "}
                          - <span className="font-bold text-slate-800 text-[11px]">{log.event_name}</span>
                          {log.round && (
                            <div className="mt-0.5">
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-extrabold uppercase">
                                {log.round}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {log.swimmer_name ? (
                        <div>
                          <div className="font-black text-slate-900 uppercase text-xs">
                            {log.swimmer_name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            {log.club_name || "-"}
                          </div>
                          {(log.heat_number > 0 || log.line_number > 0) && (
                            <div className="font-mono text-[10px] font-bold text-sky-700 mt-0.5">
                              Seri {log.heat_number} • Line {log.line_number}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {(log.old_value || log.new_value) && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1 font-mono text-[11px]">
                          <div className="text-slate-500 text-[10px]">
                            <span className="text-rose-600 font-bold">Lama:</span>{" "}
                            {log.old_value || "(Kosong)"}
                          </div>
                          <div className="text-slate-900 font-bold text-[10px] flex items-center gap-1">
                            <span className="text-emerald-600 font-bold">Baru:</span>{" "}
                            {log.new_value || "(Dihapus)"}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-600 font-medium leading-relaxed">
                      {log.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold text-slate-500">
              Menampilkan {logs.length} dari {total} catatan log
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
              </button>
              <span className="text-xs font-black text-slate-800 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 shadow-sm"
              >
                Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
