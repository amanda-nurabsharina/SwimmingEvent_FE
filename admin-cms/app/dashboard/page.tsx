"use client";

import { useEffect, useState } from "react";
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
import RoleManager from "../../components/RoleManager";
import UserManager from "../../components/UserManager";
import { getRegistrations, getBanners, fetchAdminTournaments } from "../../lib/api-admin";
import { Users, Trophy, CheckCircle, RefreshCw, Calendar, CheckSquare, Image as ImageIcon, ArrowRight, Zap, Award, Activity, GraduationCap, Settings, History, MessageSquare, Send } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
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

  const totalVerified = registrations.filter((r) => r.payment_status === "verified").length;
  const totalPending = registrations.filter((r) => r.payment_status === "pending").length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />

      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Dedicated Dashboard Tab View */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Top Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Dashboard Kejuaraan Renang</h1>
                <p className="text-xs font-bold text-sky-600">Akuatik Indonesia Kota Tangerang - Time Trial 2025</p>
              </div>

              <button
                onClick={loadData}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-sky-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Data
              </button>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-sky-100 text-sky-700 rounded-2xl">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-900">{registrations.length}</div>
                  <div className="text-xs text-slate-500 font-bold">Total Pendaftaran Lomba</div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-3xl font-black text-emerald-700">{totalVerified}</div>
                  <div className="text-xs text-slate-500 font-bold">Terverifikasi & Siap Tanding</div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-amber-100 text-amber-700 rounded-2xl">
                  <Trophy className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-3xl font-black text-amber-700">{totalPending}</div>
                  <div className="text-xs text-slate-500 font-bold">Pending Verifikasi Pembayaran</div>
                </div>
              </div>
            </div>

            {/* Quick Action Cards Grid */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-600" /> Aksi Cepat & Navigasi Operasional
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => handleTabChange("registrations")}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-sky-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition-colors">Kelola Pendaftaran</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Verifikasi status bayar & data perenang</p>
                </button>

                <button
                  onClick={() => handleTabChange("buku-acara")}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-cyan-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-cyan-600 transition-colors">Buku Acara & Heat</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Generate otomatis susunan lintasan & seri</p>
                </button>

                <button
                  onClick={() => handleTabChange("results")}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">Catat Hasil Lomba</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Meja juri, tukar lintasan, & penentuan juara</p>
                </button>

                <button
                  onClick={() => handleTabChange("whatsapp-broadcast")}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Send className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">Broadcast WhatsApp PIC</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Kirim bagan, TM, & info ke WA orang tua/PIC</p>
                </button>

                <button
                  onClick={() => handleTabChange("race-result-logs")}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-purple-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <History className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-purple-600 transition-colors">Log Audit Hasil Lomba</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Riwayat audit seluruh aksi & perubahan waktu</p>
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
                  <p className="text-xs font-medium text-slate-500">Ringkasan 5 pendaftaran perenang paling akhir</p>
                </div>
                <button
                  onClick={() => handleTabChange("registrations")}
                  className="text-xs font-extrabold text-sky-600 hover:text-sky-700 flex items-center gap-1"
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
                    {registrations.slice(0, 5).map((r) => (
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
            <RaceResultEditor registrations={registrations} tournaments={tournaments} onRefresh={loadData} />
          </div>
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
