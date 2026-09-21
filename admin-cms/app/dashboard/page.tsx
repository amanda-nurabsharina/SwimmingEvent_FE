"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import ParticipantTable from "../../components/ParticipantTable";
import BukuAcaraGenerator from "../../components/BukuAcaraGenerator";
import BukuAcaraViewer from "../../components/BukuAcaraViewer";
import FormTimerPrinter from "../../components/FormTimerPrinter";
import RaceResultEditor from "../../components/RaceResultEditor";
import RaceResultLogViewer from "../../components/RaceResultLogViewer";
import EventManager from "../../components/EventManager";
import TournamentManager from "../../components/TournamentManager";
import BannerManager from "../../components/BannerManager";
import ProgramManager from "../../components/ProgramManager";
import CoachManager from "../../components/CoachManager";
import FacilityManager from "../../components/FacilityManager";
import AchievementManager from "../../components/AchievementManager";
import TestimonialManager from "../../components/TestimonialManager";
import SectionOrderManager from "../../components/SectionOrderManager";
import SettingsManager from "../../components/SettingsManager";
import WhatsAppBroadcastView from "../../components/WhatsAppBroadcastView";
import CertificateManager from "../../components/CertificateManager";
import RoleManager from "../../components/RoleManager";
import UserManager from "../../components/UserManager";
import { getRegistrations, getBanners, fetchAdminTournaments, PUBLIC_LANDING_URL } from "../../lib/api-admin";
import { Users, Trophy, CheckCircle, RefreshCw, Calendar, CheckSquare, Image as ImageIcon, ArrowRight, Zap, Award, Activity, GraduationCap, Settings, History, MessageSquare, Send, Sparkles, Clock, Wallet, Filter } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTourneyId, setSelectedTourneyId] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("swimming_admin_tab", tab);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const [regRes, bannerRes, tourneyRes] = await Promise.all([
      getRegistrations(),
      getBanners(),
      fetchAdminTournaments(),
    ]);
    if (regRes.success) {
      setRegistrations(regRes.data || []);
    } else if (regRes.message === "Invalid or expired JWT token") {
      router.push("/login");
    }

    if (bannerRes.success) {
      setBanners(bannerRes.data || []);
    }

    if (tourneyRes.success) {
      setTournaments(tourneyRes.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("swimming_admin_token");
    if (!token) {
      router.push("/login");
    } else {
      const savedTab = localStorage.getItem("swimming_admin_tab");
      if (savedTab) {
        setActiveTab(savedTab);
      }
      loadData();
    }
  }, []);

  // Sync selected tournament to active/first tournament when data arrives
  useEffect(() => {
    if (tournaments.length > 0 && selectedTourneyId === 0) {
      const active = tournaments.find((t) => t.is_active) || tournaments[0];
      if (active) setSelectedTourneyId(active.id);
    }
  }, [tournaments, selectedTourneyId]);

  // Dynamically determine the currently ongoing / active tournament
  const activeTournament = useMemo(() => {
    if (tournaments.length === 0) return null;
    if (selectedTourneyId > 0) {
      const found = tournaments.find((t) => t.id === selectedTourneyId);
      if (found) return found;
    }
    return tournaments.find((t) => t.is_active) || tournaments[0];
  }, [tournaments, selectedTourneyId]);

  // Dynamic tournament location and specs description
  const tournamentSpecs = useMemo(() => {
    const parts: string[] = [];
    if (activeTournament?.location) {
      parts.push(activeTournament.location);
    } else {
      parts.push("Kolam Renang MGCC Modernland Kota Tangerang");
    }

    if (activeTournament?.events && activeTournament.events.length > 0) {
      parts.push(`${activeTournament.events.length} Nomor Lomba (25m Pool)`);
    } else {
      parts.push("6 Lintasan (25m Olympic Pool)");
    }

    if (activeTournament?.event_start_date) {
      const start = activeTournament.event_start_date;
      const end = activeTournament.event_end_date;
      parts.push(end && end !== start ? `${start} s/d ${end}` : `Jadwal: ${start}`);
    } else {
      parts.push("Kategori Prestasi");
    }

    return parts.join(" • ");
  }, [activeTournament]);

  // Filter registrations based on selected tournament
  const filteredRegistrations = useMemo(() => {
    if (!selectedTourneyId || selectedTourneyId === 0) {
      return registrations;
    }
    return registrations.filter((r) => {
      const tourneyId = r.swimming_event?.tournament_id || r.tournament_id || r.swimming_event?.tournament?.id;
      return tourneyId === selectedTourneyId;
    });
  }, [registrations, selectedTourneyId]);

  const totalVerified = useMemo(() => {
    return filteredRegistrations.filter((r) => r.payment_status === "verified").length;
  }, [filteredRegistrations]);

  const totalPending = useMemo(() => {
    return filteredRegistrations.filter((r) => r.payment_status === "pending").length;
  }, [filteredRegistrations]);

  // Total biaya pendaftaran yang masuk (terverifikasi)
  const totalVerifiedFee = useMemo(() => {
    return filteredRegistrations
      .filter((r) => r.payment_status === "verified")
      .reduce((sum, r) => sum + (r.swimming_event?.fee ? Number(r.swimming_event.fee) : 150000), 0);
  }, [filteredRegistrations]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />

      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Dedicated Dashboard Tab View */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Top Live Active Tournament Hero Banner (Fleksibel Berdasarkan Turnamen yang Berlangsung) */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 sm:p-7 shadow-lg border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />

              {/* Left side: Pill badge, Switcher, Tournament Title & Details */}
              <div className="space-y-2 relative z-10 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[11px] sm:text-xs font-semibold tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-sky-200" />
                    <span>Turnamen Aktif &amp; Live Real-Time Data</span>
                  </div>

                  {tournaments.length > 0 && (
                    <div className="relative">
                      <select
                        value={selectedTourneyId}
                        onChange={(e) => setSelectedTourneyId(Number(e.target.value))}
                        style={{ color: "#ffffff" }}
                        className="bg-white/20 hover:bg-white/30 text-white font-extrabold text-[11px] sm:text-xs px-3.5 py-1.5 rounded-full border border-white/35 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-sm transition-all cursor-pointer"
                      >
                        <option value={0} className="bg-slate-900 text-white font-semibold">
                          Semua Turnamen
                        </option>
                        {tournaments.map((t) => (
                          <option key={t.id} value={t.id} className="bg-slate-900 text-white font-semibold">
                            {t.name} {t.is_active ? "★ (Aktif)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase leading-tight">
                  {selectedTourneyId === 0
                    ? "SEMUA TURNAMEN RENANG"
                    : (activeTournament?.name || "TIME TRIAL 2026 MASC KOTA TANGERANG")}
                </h2>

                <p className="text-xs sm:text-sm text-blue-100/90 font-medium">
                  {selectedTourneyId === 0
                    ? `Menampilkan statistik gabungan dari ${tournaments.length} turnamen renang`
                    : tournamentSpecs}
                </p>
              </div>

              {/* Right side: Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 relative z-10 w-full md:w-auto">
                <button
                  onClick={() => {
                    const tid = activeTournament?.id || selectedTourneyId;
                    window.open(`${PUBLIC_LANDING_URL}/live-scoreboard${tid ? `?tournament_id=${tid}` : ""}`, "_blank");
                  }}
                  className="px-5 py-2.5 bg-[#7a1c43] hover:bg-[#8e2250] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md border border-rose-400/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-rose-300" />
                  <span>Buka Live Scoreboard (Layar TV)</span>
                </button>

                <button
                  onClick={() => {
                    const tid = activeTournament?.id || selectedTourneyId;
                    if (tid) setSelectedTourneyId(tid);
                    handleTabChange("results");
                  }}
                  className="px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-slate-950" />
                  <span>Input Waktu Tablet (Hari-H)</span>
                </button>
              </div>
            </div>

            {/* Top Header & Filter Per Turnamen */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Dashboard Kejuaraan Renang</h1>
                <p className="text-xs font-bold text-sky-600">
                  {selectedTourneyId === 0
                    ? "Statistik Gabungan Semua Turnamen"
                    : (activeTournament?.name || "TIME TRIAL 2026 MASC KOTA TANGERANG")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filter Turnamen Dropdown */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-black text-slate-500 uppercase">Turnamen:</span>
                  <select
                    value={selectedTourneyId}
                    onChange={(e) => setSelectedTourneyId(Number(e.target.value))}
                    aria-label="Filter Turnamen"
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
                  >
                    <option value={0}>Semua Turnamen ({registrations.length})</option>
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.is_active ? "★" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={loadData}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-sky-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Data
                </button>
              </div>
            </div>

            {/* Analytics Grid - 4 Kotak (Disinkronkan dengan Filter Turnamen & Biaya Masuk) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-3.5 hover:shadow-md transition-shadow">
                <div className="p-3 bg-sky-100 text-sky-700 rounded-2xl shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-2xl xl:text-3xl font-black text-slate-900 leading-tight">
                    {filteredRegistrations.length}
                  </div>
                  <div className="text-xs text-slate-500 font-bold leading-tight mt-0.5">
                    Total Pendaftaran
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-3.5 hover:shadow-md transition-shadow">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-2xl xl:text-3xl font-black text-emerald-700 leading-tight">
                    {totalVerified}
                  </div>
                  <div className="text-xs text-slate-500 font-bold leading-tight mt-0.5">
                    Terverifikasi Siap Tanding
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-3.5 hover:shadow-md transition-shadow">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-2xl xl:text-3xl font-black text-amber-700 leading-tight">
                    {totalPending}
                  </div>
                  <div className="text-xs text-slate-500 font-bold leading-tight mt-0.5">
                    Pending Verifikasi Bayar
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-3.5 hover:shadow-md transition-shadow">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg xl:text-xl 2xl:text-2xl font-black text-indigo-700 leading-tight whitespace-nowrap">
                    Rp {totalVerifiedFee.toLocaleString("id-ID")}
                  </div>
                  <div className="text-xs text-slate-500 font-bold leading-tight mt-0.5">
                    Biaya Masuk Pendaftaran
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {totalVerified} peserta lunas
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Cards Grid (4 Menu Operasional Utama) */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-600" /> Aksi Cepat &amp; Navigasi Operasional
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => handleTabChange("registrations")}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-sky-400 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition-colors">Kelola Pendaftaran</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Verifikasi status bayar &amp; data perenang</p>
                </button>

                <button
                  onClick={() => handleTabChange("buku-acara")}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-cyan-400 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-cyan-600 transition-colors">Buku Acara &amp; Heat</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Generate otomatis susunan lintasan &amp; seri</p>
                </button>

                <button
                  onClick={() => handleTabChange("results")}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">Catat Hasil Lomba</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Meja juri, tukar lintasan, &amp; penentuan juara</p>
                </button>

                <button
                  onClick={() => handleTabChange("whatsapp-broadcast")}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Send className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">Broadcast WhatsApp PIC</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Kirim bagan, TM, &amp; info ke WA orang tua/PIC</p>
                </button>
              </div>
            </div>

            {/* Recent Registrations Table Overview */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-sky-600" /> Pendaftaran Terbaru Kejuaraan
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    {selectedTourneyId === 0
                      ? "Ringkasan 5 pendaftaran perenang paling akhir (Semua Turnamen)"
                      : `Ringkasan 5 pendaftaran paling akhir untuk ${activeTournament?.name || "Turnamen Terpilih"}`}
                  </p>
                </div>
                <button
                  onClick={() => handleTabChange("registrations")}
                  className="text-xs font-extrabold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  Lihat Semua Pendaftaran <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
                      <th className="p-3">NAMA PERENANG</th>
                      <th className="p-3">KLUB / KOTA</th>
                      <th className="p-3">NOMOR LOMBA</th>
                      <th className="p-3 text-center">TIME SEED</th>
                      <th className="p-3 text-center">STATUS BAYAR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRegistrations.slice(0, 5).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3 font-black text-slate-900 uppercase">{r.participant?.name}</td>
                        <td className="p-3 font-bold text-slate-700">{r.participant?.club}</td>
                        <td className="p-3 font-bold text-sky-700">{r.swimming_event?.event_name}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-600">{r.time_seed}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
                              r.payment_status === "verified"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {r.payment_status === "verified" ? "TERVERIFIKASI" : "PENDING"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Tab Views */}
        {activeTab === "registrations" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Kelola Pendaftaran Lomba</h1>
                <p className="text-xs font-bold text-sky-600">Verifikasi status pembayaran dan data peserta perenang</p>
              </div>
            </div>
            <ParticipantTable registrations={registrations} tournaments={tournaments} onRefresh={loadData} />
          </div>
        )}

        {activeTab === "buku-acara" && (
          <div className="space-y-6">
            <BukuAcaraViewer
              tournaments={tournaments}
              onRefresh={loadData}
              refreshTrigger={registrations.length}
            />
          </div>
        )}

        {activeTab === "form-timer" && (
          <FormTimerPrinter
            tournaments={tournaments}
            onRefresh={loadData}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === "results" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Catat Hasil Lomba & Meja Juri</h1>
                <p className="text-xs font-bold text-sky-600">Pencatatan waktu akhir resmi, status lomba, dan penukaran/pemindahan heat & lintasan atlet</p>
              </div>
            </div>
            <RaceResultEditor
              registrations={registrations}
              tournaments={tournaments}
              initialTournamentId={selectedTourneyId || activeTournament?.id}
              onSelectTournamentId={setSelectedTourneyId}
              onRefresh={loadData}
            />
          </div>
        )}

        {activeTab === "certificates" && (
          <CertificateManager
            tournaments={tournaments}
            initialTournamentId={selectedTourneyId || activeTournament?.id}
            onSelectTournamentId={setSelectedTourneyId}
          />
        )}

        {activeTab === "whatsapp-broadcast" && (
          <WhatsAppBroadcastView
            registrations={registrations}
            tournaments={tournaments}
            onRefresh={loadData}
          />
        )}

        {activeTab === "race-result-logs" && (
          <RaceResultLogViewer tournaments={tournaments} />
        )}

        {activeTab === "tournaments" && (
          <TournamentManager onRefresh={loadData} />
        )}

        {activeTab === "events" && (
          <EventManager onRefresh={loadData} />
        )}

        {activeTab === "banners" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Kelola Banner & Hero Landing Page</h1>
                <p className="text-xs font-bold text-sky-600">Pengaturan terpadu Teks Kotak 1, Slider Gambar Kotak 2, dan Statistik Kotak 3</p>
              </div>
            </div>
            <BannerManager banners={banners} onRefresh={loadData} />
          </div>
        )}

        {activeTab === "programs" && (
          <ProgramManager onRefresh={loadData} />
        )}

        {activeTab === "coaches" && (
          <CoachManager onRefresh={loadData} />
        )}

        {activeTab === "facility" && (
          <FacilityManager onRefresh={loadData} />
        )}

        {activeTab === "achievement" && (
          <AchievementManager onRefresh={loadData} />
        )}

        {activeTab === "testimonial" && (
          <TestimonialManager onRefresh={loadData} />
        )}

        {activeTab === "layout-order" && (
          <SectionOrderManager onRefresh={loadData} />
        )}

        {activeTab === "settings" && (
          <SettingsManager onRefresh={loadData} />
        )}

        {activeTab === "roles" && (
          <RoleManager onRefresh={loadData} />
        )}

        {activeTab === "users" && (
          <UserManager onRefresh={loadData} />
        )}
      </main>
    </div>
  );
}
