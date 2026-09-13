"use client";

import { useState, useEffect } from "react";
import {
  fetchAdminEvents,
  saveAdminEvent,
  deleteAdminEvent,
  fetchAdminTournaments,
} from "../lib/api-admin";
import {
  ListOrdered,
  Plus,
  Trash2,
  Edit2,
  Save,
  Search,
  Filter,
  Clock,
  Trophy,
  Users,
} from "lucide-react";

export default function EventManager({ onRefresh }: { onRefresh?: () => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTournamentID, setFilterTournamentID] = useState("ALL");
  const [filterKU, setFilterKU] = useState("ALL");
  const [filterGender, setFilterGender] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [formTournamentID, setFormTournamentID] = useState(1);
  const [formEventCode, setFormEventCode] = useState(101);
  const [formEventName, setFormEventName] = useState("");
  const [formDistance, setFormDistance] = useState("50 METER");
  const [formStroke, setFormStroke] = useState("FREESTYLE");
  const [formGender, setFormGender] = useState("PUTRA");
  const [formAgeGroup, setFormAgeGroup] = useState("KU 2");
  const [formFee, setFormFee] = useState(150000);
  const [formScheduleTime, setFormScheduleTime] = useState("08:00 WIB");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [eventRes, tourneyRes] = await Promise.all([
      fetchAdminEvents(),
      fetchAdminTournaments(),
    ]);
    if (eventRes.success && eventRes.data) {
      setEvents(eventRes.data);
    }
    if (tourneyRes.success && tourneyRes.data) {
      setTournaments(tourneyRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormTournamentID(tournaments[0]?.id || 1);
    const maxCode = events.length > 0 ? Math.max(...events.map((e) => e.event_code || 100)) + 1 : 101;
    setFormEventCode(maxCode);
    setFormEventName("50m Gaya Bebas");
    setFormDistance("50 METER");
    setFormStroke("FREESTYLE");
    setFormGender("PUTRA");
    setFormAgeGroup("KU 2");
    setFormFee(150000);
    setFormScheduleTime("08:00 WIB");
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (evt: any) => {
    setEditingEvent(evt);
    setFormTournamentID(evt.tournament_id || 1);
    setFormEventCode(evt.event_code || 101);
    setFormEventName(evt.event_name || "");
    setFormDistance(evt.distance || "50 METER");
    setFormStroke(evt.stroke || "FREESTYLE");
    setFormGender(evt.gender || "PUTRA");
    setFormAgeGroup(evt.age_group || "KU 2");
    setFormFee(evt.fee || 150000);
    setFormScheduleTime(evt.schedule_time || "08:00 WIB");
    setFormIsActive(evt.is_active ?? true);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEventName.trim()) {
      alert("Nama acara lomba wajib diisi");
      return;
    }

    setSaving(true);
    const payload = {
      id: editingEvent ? editingEvent.id : 0,
      tournament_id: Number(formTournamentID),
      event_code: Number(formEventCode),
      event_name: formEventName,
      distance: formDistance,
      stroke: formStroke,
      gender: formGender,
      age_group: formAgeGroup,
      fee: Number(formFee),
      schedule_time: formScheduleTime,
      is_active: formIsActive,
    };

    const res = await saveAdminEvent(payload);
    setSaving(false);
    if (res.success) {
      setIsModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menyimpan data nomor lomba: " + res.message);
    }
  };

  const handleDeleteEvent = async (id: number, code: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Acara #${code} "${name}"?`)) return;
    const res = await deleteAdminEvent(id);
    if (res.success) {
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menghapus: " + res.message);
    }
  };

  // Filtered Events
  const filteredEvents = events.filter((e) => {
    const matchSearch =
      e.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(e.event_code).includes(searchQuery) ||
      e.stroke?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchTourney =
      filterTournamentID === "ALL" || String(e.tournament_id) === String(filterTournamentID);
    const matchKU = filterKU === "ALL" || e.age_group === filterKU;
    const matchGender = filterGender === "ALL" || e.gender === filterGender;

    return matchSearch && matchTourney && matchKU && matchGender;
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        Memuat data Master Nomor Lomba Kejuaraan...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Master Data Nomor Lomba Kejuaraan
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Atur daftar acara lomba, kode nomor, Kelompok Umur (KU), gaya renang, biaya, dan jam pelaksanaan.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Nomor Lomba Baru
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* SEARCH INPUT */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode # / gaya / nama acara..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* TURNAMEN INDUK FILTER */}
          <div className="relative">
            <Trophy className="w-4 h-4 absolute left-3.5 top-3 text-amber-500 pointer-events-none" />
            <select
              value={filterTournamentID}
              onChange={(e) => setFilterTournamentID(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all truncate"
            >
              <option value="ALL">Semua Turnamen Induk</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* KELOMPOK UMUR (KU) FILTER */}
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3.5 top-3 text-sky-500 pointer-events-none" />
            <select
              value={filterKU}
              onChange={(e) => setFilterKU(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
            >
              <option value="ALL">Semua Kelompok Umur (KU)</option>
              <option value="KU 4">KU 4 (≤ 10 Thn)</option>
              <option value="KU 3">KU 3 (11-12 Thn)</option>
              <option value="KU 2">KU 2 (13-14 Thn)</option>
              <option value="KU 1">KU 1 (15-17 Thn)</option>
              <option value="Senior">Senior (≥ 18 Thn)</option>
              <option value="OPEN">OPEN / Umum</option>
            </select>
          </div>

          {/* GENDER FILTER */}
          <div className="relative">
            <Users className="w-4 h-4 absolute left-3.5 top-3 text-indigo-500 pointer-events-none" />
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
            >
              <option value="ALL">Semua Gender</option>
              <option value="PUTRA">Putra (Laki-laki)</option>
              <option value="PUTRI">Putri (Perempuan)</option>
            </select>
          </div>
        </div>
      </div>

      {/* EVENTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Kode #</th>
                <th className="py-3.5 px-4">Nama Nomor Lomba</th>
                <th className="py-3.5 px-4">Gaya & Jarak</th>
                <th className="py-3.5 px-4">Kategori & KU</th>
                <th className="py-3.5 px-4">Jadwal Jam</th>
                <th className="py-3.5 px-4">Biaya</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-black border border-blue-100">
                      #{evt.event_code}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-black text-slate-900">{evt.event_name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {evt.distance} - {evt.stroke}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-black">
                        {evt.age_group || "OPEN"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          evt.gender === "PUTRA"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-pink-100 text-pink-800"
                        }`}
                      >
                        {evt.gender}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{evt.schedule_time || "08:00 WIB"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-black text-emerald-600">
                    Rp {(evt.fee || 150000).toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(evt)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit Nomor Lomba"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(evt.id, evt.event_code, evt.event_name)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Hapus Nomor Lomba"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-blue-600" />
                {editingEvent ? "Edit Nomor Lomba" : "Tambah Nomor Lomba Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Turnamen / Kejuaraan Induk *
                </label>
                <select
                  value={formTournamentID}
                  onChange={(e) => setFormTournamentID(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.registration_end_date ? `Batas: ${t.registration_end_date}` : ""})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Nomor Acara (#) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formEventCode}
                    onChange={(e) => setFormEventCode(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="103"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Biaya per Nomor (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formFee}
                    onChange={(e) => setFormFee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="150000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Acara Lomba *
                </label>
                <input
                  type="text"
                  required
                  value={formEventName}
                  onChange={(e) => setFormEventName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Contoh: 100m Gaya Kupu-kupu"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jarak Lomba *
                  </label>
                  <select
                    value={formDistance}
                    onChange={(e) => setFormDistance(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="50 METER">50 METER</option>
                    <option value="100 METER">100 METER</option>
                    <option value="200 METER">200 METER</option>
                    <option value="400 METER">400 METER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gaya Renang *
                  </label>
                  <select
                    value={formStroke}
                    onChange={(e) => setFormStroke(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="FREESTYLE">Gaya Bebas (Freestyle)</option>
                    <option value="BREASTSTROKE">Gaya Dada (Breaststroke)</option>
                    <option value="BACKSTROKE">Gaya Punggung (Backstroke)</option>
                    <option value="BUTTERFLY">Gaya Kupu-kupu (Butterfly)</option>
                    <option value="INDIVIDUALMEDLEY">Gaya Ganti (Individual Medley)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelompok Umur (KU) *
                  </label>
                  <select
                    value={formAgeGroup}
                    onChange={(e) => setFormAgeGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="KU 4">KU 4 (≤ 10 Tahun)</option>
                    <option value="KU 3">KU 3 (11 - 12 Tahun)</option>
                    <option value="KU 2">KU 2 (13 - 14 Tahun)</option>
                    <option value="KU 1">KU 1 (15 - 17 Tahun)</option>
                    <option value="Senior">Senior (≥ 18 Tahun)</option>
                    <option value="OPEN">OPEN / Semua Umur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="PUTRA">PUTRA</option>
                    <option value="PUTRI">PUTRI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jadwal Waktu Pelaksanaan
                </label>
                <input
                  type="text"
                  value={formScheduleTime}
                  onChange={(e) => setFormScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="08:30 WIB"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Menyimpan..." : "Simpan Nomor Lomba"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
