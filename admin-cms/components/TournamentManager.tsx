"use client";

import { useState, useEffect } from "react";
import {
  fetchAdminTournaments,
  saveAdminTournament,
  deleteAdminTournament,
  saveAdminEvent,
  deleteAdminEvent,
} from "../lib/api-admin";
import {
  Trophy,
  Plus,
  Trash2,
  Edit2,
  Save,
  Search,
  Calendar,
  MapPin,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  DollarSign,
} from "lucide-react";

export default function TournamentManager({ onRefresh }: { onRefresh?: () => void }) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Tournament Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTourney, setEditingTourney] = useState<any | null>(null);

  // Tournament Form fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formRegStart, setFormRegStart] = useState("");
  const [formRegEnd, setFormRegEnd] = useState("");
  const [formEventStart, setFormEventStart] = useState("");
  const [formEventEnd, setFormEventEnd] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sub-Event Accordion Expansion State
  const [expandedTournaments, setExpandedTournaments] = useState<Record<number, boolean>>({});

  // Sub-Event Modal State
  const [isSubEventModalOpen, setIsSubEventModalOpen] = useState(false);
  const [subTourneyId, setSubTourneyId] = useState<number>(0);
  const [editingSubEvent, setEditingSubEvent] = useState<any | null>(null);

  // Sub-Event Form Fields
  const [subEventCode, setSubEventCode] = useState<number>(101);
  const [subEventName, setSubEventName] = useState("");
  const [subDistance, setSubDistance] = useState("50 METER");
  const [subStroke, setSubStroke] = useState("FREESTYLE");
  const [subGender, setSubGender] = useState("PUTRA");
  const [subAgeGroup, setSubAgeGroup] = useState("KU 2");
  const [subFee, setSubFee] = useState<number>(150000);
  const [subScheduleTime, setSubScheduleTime] = useState("08:00 WIB");
  const [subSaving, setSubSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchAdminTournaments();
    if (res.success && res.data) {
      setTournaments(res.data);
      // Auto expand all tournaments by default
      const expandedMap: Record<number, boolean> = {};
      res.data.forEach((t: any) => {
        expandedMap[t.id] = true;
      });
      setExpandedTournaments(expandedMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedTournaments((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // -------------------------------------------------------------------
  // TOURNAMENT HANDLERS
  // -------------------------------------------------------------------
  const openCreateModal = () => {
    setEditingTourney(null);
    setFormName("TURNAMEN RENANG BARU 2027");
    setFormDescription("Kejuaraan renang resmi antar klub/sekolah.");
    setFormLocation("Kolam Renang Gelanggang Kota Tangerang");
    setFormRegStart("2026-10-01");
    setFormRegEnd("2026-10-25");
    setFormEventStart("2026-11-01");
    setFormEventEnd("2026-11-03");
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingTourney(t);
    setFormName(t.name || "");
    setFormDescription(t.description || "");
    setFormLocation(t.location || "");
    setFormRegStart(t.registration_start_date || "");
    setFormRegEnd(t.registration_end_date || "");
    setFormEventStart(t.event_start_date || "");
    setFormEventEnd(t.event_end_date || "");
    setFormIsActive(t.is_active ?? true);
    setIsModalOpen(true);
  };

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Nama turnamen/kejuaraan wajib diisi");
      return;
    }

    setSaving(true);
    const payload = {
      id: editingTourney ? editingTourney.id : 0,
      name: formName,
      description: formDescription,
      location: formLocation,
      registration_start_date: formRegStart,
      registration_end_date: formRegEnd,
      event_start_date: formEventStart,
      event_end_date: formEventEnd,
      is_active: formIsActive,
    };

    const res = await saveAdminTournament(payload);
    setSaving(false);
    if (res.success) {
      setIsModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menyimpan data turnamen: " + res.message);
    }
  };

  const handleDeleteTournament = async (id: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus turnamen "${name}"?`)) return;
    const res = await deleteAdminTournament(id);
    if (res.success) {
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menghapus turnamen: " + res.message);
    }
  };

  // -------------------------------------------------------------------
  // SUB-EVENT HANDLERS
  // -------------------------------------------------------------------
  const openCreateSubEventModal = (tourneyId: number) => {
    setSubTourneyId(tourneyId);
    setEditingSubEvent(null);
    setSubEventCode(Math.floor(100 + Math.random() * 899));
    setSubEventName("50m Gaya Bebas");
    setSubDistance("50 METER");
    setSubStroke("FREESTYLE");
    setSubGender("PUTRA");
    setSubAgeGroup("KU 2");
    setSubFee(150000);
    setSubScheduleTime("08:00 WIB");
    setIsSubEventModalOpen(true);
  };

  const openEditSubEventModal = (evt: any) => {
    setSubTourneyId(evt.tournament_id || 1);
    setEditingSubEvent(evt);
    setSubEventCode(evt.event_code || 101);
    setSubEventName(evt.event_name || "");
    setSubDistance(evt.distance || "50 METER");
    setSubStroke(evt.stroke || "FREESTYLE");
    setSubGender(evt.gender || "PUTRA");
    setSubAgeGroup(evt.age_group || "KU 2");
    setSubFee(evt.fee || 150000);
    setSubScheduleTime(evt.schedule_time || "08:00 WIB");
    setIsSubEventModalOpen(true);
  };

  const handleSaveSubEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEventName.trim()) {
      alert("Nama nomor/gaya lomba wajib diisi");
      return;
    }

    setSubSaving(true);
    const payload = {
      id: editingSubEvent ? editingSubEvent.id : 0,
      tournament_id: subTourneyId,
      event_code: Number(subEventCode),
      event_name: subEventName,
      distance: subDistance,
      stroke: subStroke,
      gender: subGender,
      age_group: subAgeGroup,
      fee: Number(subFee),
      schedule_time: subScheduleTime,
      is_active: true,
    };

    const res = await saveAdminEvent(payload);
    setSubSaving(false);
    if (res.success) {
      setIsSubEventModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menyimpan cabang nomor lomba: " + res.message);
    }
  };

  const handleDeleteSubEvent = async (id: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus nomor lomba "${name}"?`)) return;
    const res = await deleteAdminEvent(id);
    if (res.success) {
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert("Gagal menghapus nomor lomba: " + res.message);
    }
  };

  const filteredTournaments = tournaments.filter((t) =>
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        Memuat Master Data Turnamen Induk & Sub-Nomor Lomba...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Master Data Turnamen / Kejuaraan Induk
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Kelola turnamen utama dan cabang sub-nomor lomba (gaya, jarak, KU, & fee spesifik per sub).
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Turnamen Induk Baru
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama turnamen / lokasi..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* TOURNAMENTS CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTournaments.map((t) => {
          const isExpired = t.registration_end_date
            ? new Date().toISOString().slice(0, 10) > t.registration_end_date
            : false;

          const eventsList = t.events || [];
          const isExpanded = expandedTournaments[t.id] ?? true;

          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* TOURNAMENT CARD TOP INFO */}
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black uppercase">
                      ID #{t.id}
                    </span>
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full text-[10px] font-black flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {eventsList.length} Sub-Nomor Lomba
                    </span>
                  </div>

                  {isExpired ? (
                    <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full text-[10px] font-black">
                      Pendaftaran Ditutup
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                      Pendaftaran Dibuka
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {t.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{t.description}</p>
                </div>

                {/* DETAILS METADATA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold text-slate-700 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{t.location || "Lokasi Belum Diset"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>
                      Batas:{" "}
                      <span className={isExpired ? "text-red-600 font-black" : "text-emerald-700 font-black"}>
                        {t.registration_end_date || "-"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      Lomba: {t.event_start_date || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SUB-EVENTS SECTION */}
              <div className="border-t border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleExpand(t.id)}
                    className="flex items-center gap-2 text-xs font-black text-slate-900 hover:text-amber-600 transition-all"
                  >
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Daftar Cabang / Sub-Nomor Lomba ({eventsList.length})</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  <button
                    onClick={() => openCreateSubEventModal(t.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Sub-Nomor</span>
                  </button>
                </div>

                {/* EXPANDABLE SUB-EVENTS LIST */}
                {isExpanded && (
                  <div className="space-y-2 pt-1 max-h-60 overflow-y-auto pr-1">
                    {eventsList.length === 0 ? (
                      <div className="p-4 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs font-medium text-slate-400">
                        Belum ada sub-nomor lomba yang ditambahkan ke turnamen ini. Klik tombol di atas untuk menambah.
                      </div>
                    ) : (
                      eventsList.map((evt: any) => (
                        <div
                          key={evt.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-black rounded">
                                #{evt.event_code}
                              </span>
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {evt.event_name}
                              </h4>
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full shrink-0">
                                Rp {Number(evt.fee || 150000).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold truncate">
                              {evt.age_group || "OPEN"} • {evt.gender} • {evt.distance} ({evt.stroke}) • Jam: {evt.schedule_time || "08:00 WIB"}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditSubEventModal(evt)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Edit Sub Nomor"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubEvent(evt.id, evt.event_name)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Hapus Sub Nomor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* CARD FOOTER ACTIONS */}
              <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-white">
                <span className="text-[11px] font-bold text-slate-400">
                  Status: {t.is_active ? "Aktif" : "Non-Aktif"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(t)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Induk</span>
                  </button>
                  <button
                    onClick={() => handleDeleteTournament(t.id, t.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Induk</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TOURNAMENT FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                {editingTourney ? "Edit Turnamen Induk" : "Tambah Turnamen Induk Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTournament} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Turnamen / Kejuaraan Induk *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="Contoh: TURNAMEN RENANG HUT RI 17 2027"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="Penjelasan singkat turnamen..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Venue</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="Contoh: Kolam Renang Senayan Jakarta"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tgl Mulai Pendaftaran *
                  </label>
                  <input
                    type="date"
                    required
                    value={formRegStart}
                    onChange={(e) => setFormRegStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tgl Selesai Pendaftaran (Batas Akhir) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formRegEnd}
                    onChange={(e) => setFormRegEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tgl Mulai Turnamen *
                  </label>
                  <input
                    type="date"
                    required
                    value={formEventStart}
                    onChange={(e) => setFormEventStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tgl Selesai Turnamen *
                  </label>
                  <input
                    type="date"
                    required
                    value={formEventEnd}
                    onChange={(e) => setFormEventEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="tourney-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <label htmlFor="tourney-active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Aktifkan Turnamen Ini
                </label>
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Menyimpan..." : "Simpan Turnamen Induk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-EVENT FORM MODAL */}
      {isSubEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                {editingSubEvent ? "Edit Sub-Nomor Lomba" : "Tambah Sub-Nomor Lomba"}
              </h3>
              <button
                onClick={() => setIsSubEventModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubEvent} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Nomor Lomba (Event Code) *
                  </label>
                  <input
                    type="number"
                    required
                    value={subEventCode}
                    onChange={(e) => setSubEventCode(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Contoh: 101"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Biaya / Fee Pendaftaran (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    value={subFee}
                    onChange={(e) => setSubFee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Contoh: 150000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Nomor Lomba *
                </label>
                <input
                  type="text"
                  required
                  value={subEventName}
                  onChange={(e) => setSubEventName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Contoh: 50m Gaya Bebas"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jarak Lomba *
                  </label>
                  <select
                    value={subDistance}
                    onChange={(e) => setSubDistance(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="50 METER">50 METER</option>
                    <option value="100 METER">100 METER</option>
                    <option value="200 METER">200 METER</option>
                    <option value="400 METER">400 METER</option>
                    <option value="800 METER">800 METER</option>
                    <option value="1500 METER">1500 METER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gaya Renang (Stroke) *
                  </label>
                  <select
                    value={subStroke}
                    onChange={(e) => setSubStroke(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="FREESTYLE">Gaya Bebas (Freestyle)</option>
                    <option value="BREASTSTROKE">Gaya Dada (Breaststroke)</option>
                    <option value="BACKSTROKE">Gaya Punggung (Backstroke)</option>
                    <option value="BUTTERFLY">Gaya Kupu-kupu (Butterfly)</option>
                    <option value="INDIVIDUALMEDLEY">Gaya Ganti Perorangan (IM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Kelamin *
                  </label>
                  <select
                    value={subGender}
                    onChange={(e) => setSubGender(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="PUTRA">PUTRA</option>
                    <option value="PUTRI">PUTRI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelompok Umur (KU) *
                  </label>
                  <select
                    value={subAgeGroup}
                    onChange={(e) => setSubAgeGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="KU 4">KU 4 (≤ 10 Thn)</option>
                    <option value="KU 3">KU 3 (11 - 12 Thn)</option>
                    <option value="KU 2">KU 2 (13 - 14 Thn)</option>
                    <option value="KU 1">KU 1 (15 - 17 Thn)</option>
                    <option value="Senior">Senior (≥ 18 Thn)</option>
                    <option value="OPEN">OPEN (Semua Umur)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jadwal Waktu Pelaksanaan
                </label>
                <input
                  type="text"
                  value={subScheduleTime}
                  onChange={(e) => setSubScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Contoh: 08:30 WIB"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubEventModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={subSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {subSaving ? "Menyimpan..." : "Simpan Sub-Nomor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
