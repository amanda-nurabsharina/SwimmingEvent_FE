"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Trophy,
  Award,
  Medal,
  Printer,
  Search,
  Settings,
  Filter,
  RefreshCw,
  Sliders,
  CheckCircle2,
  X,
  Upload,
  Image as ImageIcon,
  User,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { getBukuAcara, getRegistrations, uploadImage } from "../lib/api-admin";
import { calculateEventChampions, EventGroupData, RankedSwimmer } from "../lib/champion-utils";

export interface CertificateItem {
  id: string | number;
  registrationId?: number;
  swimmerName: string;
  club: string;
  tournamentId: number;
  tournamentName: string;
  tournamentLocation: string;
  tournamentDate: string;
  eventCode: number;
  eventName: string;
  stroke: string;
  distance: string;
  gender: string;
  ageGroup: string;
  timeResult: string;
  timeSeed: string;
  rank: number;
  isChampion: boolean;
  rankBadge: string;
  docNumber: string;
  issueDate: string;
}

export interface WatermarkConfig {
  enabled: boolean;
  type: "both" | "text" | "logo";
  text: string;
  logoUrl: string;
  opacity: number; // 0.05 to 0.40
  orgName: string;
  subOrgName: string;
  signatory1Name: string;
  signatory1Title: string;
  signatory2Name: string;
  signatory2Title: string;
  city: string;
}

const DEFAULT_CONFIG: WatermarkConfig = {
  enabled: true,
  type: "both",
  text: "MASC SWIM ACADEMY & TOURNAMENT",
  logoUrl: "/logo-swimming.png",
  opacity: 0.12,
  orgName: "MASC SWIM ACADEMY & TOURNAMENT",
  subOrgName: "AKUATIK INDONESIA KOTA TANGERANG",
  signatory1Name: "Ridwan Syahputra, M.Pd",
  signatory1Title: "Technical Delegate (TD)",
  signatory2Name: "Ammar Fadhil, S.Or",
  signatory2Title: "Ketua Pelaksana Turnamen",
  city: "Kota Tangerang",
};

interface CertificateManagerProps {
  tournaments: any[];
  initialTournamentId?: number;
  onSelectTournamentId?: (id: number) => void;
}

export default function CertificateManager({
  tournaments,
  initialTournamentId,
  onSelectTournamentId,
}: CertificateManagerProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(0);
  const [eventGroups, setEventGroups] = useState<EventGroupData[]>([]);
  const [rawRegistrations, setRawRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "champion" | "participant">("all");
  const [selectedCertId, setSelectedCertId] = useState<string | number>("");

  // Config modal state & persistent settings
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_CONFIG);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // 1. Load persistent config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("swimming_certificate_config");
      if (saved) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      }
    } catch (e) {}
  }, []);

  const saveConfig = (newCfg: WatermarkConfig) => {
    setConfig(newCfg);
    try {
      localStorage.setItem("swimming_certificate_config", JSON.stringify(newCfg));
    } catch (e) {}
  };

  // 2. Initialize selected tournament
  useEffect(() => {
    if (tournaments && tournaments.length > 0) {
      if (initialTournamentId && tournaments.some((t) => t.id === initialTournamentId)) {
        setSelectedTournamentId(initialTournamentId);
      } else if (selectedTournamentId === 0) {
        const active = tournaments.find((t) => t.is_active) || tournaments[0];
        setSelectedTournamentId(active.id);
      }
    }
  }, [tournaments, initialTournamentId]);

  const currentTournament = useMemo(() => {
    return tournaments.find((t) => t.id === selectedTournamentId) || tournaments[0] || null;
  }, [tournaments, selectedTournamentId]);

  // 3. Fetch Data for selected tournament
  const loadTournamentData = async (tid: number) => {
    if (tid <= 0) return;
    setLoading(true);
    try {
      const [bukuRes, regRes] = await Promise.all([
        getBukuAcara(tid, "preliminary"),
        getRegistrations(),
      ]);

      if (bukuRes && bukuRes.success && Array.isArray(bukuRes.data)) {
        setEventGroups(bukuRes.data);
      } else {
        setEventGroups([]);
      }

      if (regRes && regRes.success && Array.isArray(regRes.data)) {
        setRawRegistrations(regRes.data.filter((r: any) => r.tournament_id === tid));
      } else {
        setRawRegistrations([]);
      }
    } catch (e) {
      console.error("Error loading certificate data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTournamentId > 0) {
      loadTournamentData(selectedTournamentId);
    }
  }, [selectedTournamentId]);

  // 4. Generate Certificate List dynamically from Buku Acara & Registrations
  const certificates = useMemo(() => {
    const list: CertificateItem[] = [];
    const tourneyName = currentTournament?.name || "TIME TRIAL 2026 MASC KOTA TANGERANG";
    const tourneyLoc = currentTournament?.location || "Kolam Renang MGCC Modernland Kota Tangerang";
    const tourneyDate = currentTournament?.event_start_date || "23 Desember 2026";
    const year = new Date().getFullYear();
    const tourneyCode = `AI-TGR-${year}`;

    // Process from EventGroups (Buku Acara)
    if (eventGroups.length > 0) {
      eventGroups.forEach((ev) => {
        const champ = calculateEventChampions(ev);

        // Group Heats
        if (champ.isGroup) {
          champ.groupResults.forEach((grp) => {
            grp.swimmers.forEach((sw) => {
              if (sw.is_empty || !sw.nama) return;
              const isWinner = grp.winner && grp.winner.registration_id === sw.registration_id;
              const rankNum = isWinner ? 1 : sw.overallRank || 99;
              const isChamp = isWinner || rankNum <= 3;
              const rankBadge = isWinner
                ? `JUARA 1 GROUP ${grp.groupLabel}`
                : `PESERTA (GROUP ${grp.groupLabel})`;

              const certId = `ev-${ev.event_code}-reg-${sw.registration_id || sw.nama}`;
              const docNumber = `CERT/${tourneyCode}/${isChamp ? "CHAMP" : "PART"}/${ev.event_code}-${String(
                sw.registration_id || rankNum
              ).padStart(2, "0")}`;

              list.push({
                id: certId,
                registrationId: sw.registration_id,
                swimmerName: sw.nama,
                club: sw.club || "MASC KOTA TANGERANG",
                tournamentId: ev.tournament_id,
                tournamentName: tourneyName,
                tournamentLocation: tourneyLoc,
                tournamentDate: tourneyDate,
                eventCode: ev.event_code,
                eventName: `${ev.distance} ${ev.stroke || ev.event_name}`,
                stroke: ev.stroke,
                distance: ev.distance,
                gender: ev.gender,
                ageGroup: ev.age_group,
                timeResult: sw.result && sw.result !== "-" ? sw.result : "",
                timeSeed: sw.time_seed || "-",
                rank: rankNum,
                isChampion: isChamp,
                rankBadge: isWinner ? "JUARA 1 (EMAS)" : isChamp ? `JUARA ${rankNum}` : "PESERTA",
                docNumber,
                issueDate: tourneyDate,
              });
            });
          });
        } else {
          // Heat Angka (Standard Timed Final)
          champ.allRanked.forEach((sw) => {
            if (sw.is_empty || !sw.nama) return;
            const rankNum = sw.overallRank || sw.rank || 99;
            const isChamp = rankNum === 1 || rankNum === 2 || rankNum === 3;
            let rankBadge = "PESERTA";
            if (rankNum === 1) rankBadge = "JUARA 1 (EMAS)";
            else if (rankNum === 2) rankBadge = "JUARA 2 (PERAK)";
            else if (rankNum === 3) rankBadge = "JUARA 3 (PERUNGGU)";

            const certId = `ev-${ev.event_code}-reg-${sw.registration_id || sw.nama}`;
            const docNumber = `CERT/${tourneyCode}/${isChamp ? "CHAMP" : "PART"}/${ev.event_code}-${String(
              sw.registration_id || rankNum
            ).padStart(2, "0")}`;

            list.push({
              id: certId,
              registrationId: sw.registration_id,
              swimmerName: sw.nama,
              club: sw.club || "MASC KOTA TANGERANG",
              tournamentId: ev.tournament_id,
              tournamentName: tourneyName,
              tournamentLocation: tourneyLoc,
              tournamentDate: tourneyDate,
              eventCode: ev.event_code,
              eventName: `${ev.distance} ${ev.stroke || ev.event_name}`,
              stroke: ev.stroke,
              distance: ev.distance,
              gender: ev.gender,
              ageGroup: ev.age_group,
              timeResult: sw.result && sw.result !== "-" ? sw.result : "",
              timeSeed: sw.time_seed || "-",
              rank: rankNum,
              isChampion: isChamp,
              rankBadge,
              docNumber,
              issueDate: tourneyDate,
            });
          });
        }
      });
    } else if (rawRegistrations.length > 0) {
      // Fallback: If Buku Acara has not been generated yet, populate from verified registrations
      rawRegistrations.forEach((r, idx) => {
        const certId = `fallback-reg-${r.id}`;
        const docNumber = `CERT/${tourneyCode}/PART/101-${String(idx + 1).padStart(2, "0")}`;
        list.push({
          id: certId,
          registrationId: r.id,
          swimmerName: r.name || r.swimmer_name || "Perenang",
          club: r.club || "MASC KOTA TANGERANG",
          tournamentId: r.tournament_id,
          tournamentName: tourneyName,
          tournamentLocation: tourneyLoc,
          tournamentDate: tourneyDate,
          eventCode: r.event_code || 101,
          eventName: r.event_name || "50m Gaya Bebas",
          stroke: "FREESTYLE",
          distance: "50m",
          gender: r.gender || "PUTRA",
          ageGroup: r.age_group || "KU 2",
          timeResult: "",
          timeSeed: r.best_time || "-",
          rank: 99,
          isChampion: false,
          rankBadge: "PESERTA",
          docNumber,
          issueDate: tourneyDate,
        });
      });
    }

    return list;
  }, [eventGroups, rawRegistrations, currentTournament]);

  // Set default selected certificate
  useEffect(() => {
    if (certificates.length > 0) {
      if (!selectedCertId || !certificates.some((c) => c.id === selectedCertId)) {
        // Prefer first champion if available, otherwise first certificate
        const firstChamp = certificates.find((c) => c.isChampion) || certificates[0];
        setSelectedCertId(firstChamp.id);
      }
    }
  }, [certificates, selectedCertId]);

  // 5. Filtered list based on Search & Category
  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      // Category filter
      if (categoryFilter === "champion" && !c.isChampion) return false;
      if (categoryFilter === "participant" && c.isChampion) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.swimmerName.toLowerCase().includes(q);
        const matchClub = c.club.toLowerCase().includes(q);
        const matchDoc = c.docNumber.toLowerCase().includes(q);
        const matchEvent = c.eventName.toLowerCase().includes(q);
        if (!matchName && !matchClub && !matchDoc && !matchEvent) return false;
      }

      return true;
    });
  }, [certificates, categoryFilter, searchQuery]);

  const activeCertificate = useMemo(() => {
    return certificates.find((c) => c.id === selectedCertId) || certificates[0] || null;
  }, [certificates, selectedCertId]);

  // 6. Print / Download handler
  const handlePrint = () => {
    window.print();
  };

  // 7. Handle Watermark Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadImage(file);
      if (res && res.success && res.url) {
        saveConfig({ ...config, logoUrl: res.url });
      } else {
        alert("Gagal mengupload logo watermark: " + (res.message || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error upload logo: " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black tracking-wider uppercase shadow-2xs">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            E-SERTIFIKAT & PIAGAM (FITUR 4.10 SRS V3.0)
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            E-Sertifikat Digital Peserta & Piagam Juara
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Penerbitan otomatis sertifikat resmi kejuaraan untuk verifikasi keabsahan data catatan waktu dan juara.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
            title="Atur teks, logo watermark & tanda tangan"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Config Watermark & TTD</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!activeCertificate}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 shadow-md shadow-blue-600/25 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Unduh PDF Sertifikat</span>
          </button>
        </div>
      </div>

      {/* 2. TOURNAMENT SELECTOR FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/90">
        <div className="flex items-center gap-2.5">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-700">Filter Turnamen:</span>
          <select
            value={selectedTournamentId}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSelectedTournamentId(val);
              if (onSelectTournamentId) onSelectTournamentId(val);
            }}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_active ? "★ (Aktif)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
          <span>Total Sertifikat Terdeteksi:</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded-md">
            {certificates.length} Perenang
          </span>
        </div>
      </div>

      {/* 3. MAIN SPLIT VIEW (LEFT: SELECTOR LIST, RIGHT: CERTIFICATE CANVAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Search & Filterable Cards (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4 print:hidden">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari atlet, nomor sertifikat, nomor acara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === "all"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua ({certificates.length})
              </button>
              <button
                onClick={() => setCategoryFilter("champion")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  categoryFilter === "champion"
                    ? "bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>🏆</span>
                <span>Piagam Juara ({certificates.filter((c) => c.isChampion).length})</span>
              </button>
              <button
                onClick={() => setCategoryFilter("participant")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === "participant"
                    ? "bg-sky-600 text-white font-black shadow-sm shadow-sky-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Peserta ({certificates.filter((c) => !c.isChampion).length})
              </button>
            </div>
          </div>

          {/* List of Swimmer Cards */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-2 sm:p-3 max-h-[680px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <p className="text-xs font-bold">Memuat data peserta & hasil lomba...</p>
              </div>
            ) : filteredCertificates.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Award className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Tidak Ada Sertifikat Ditemukan</p>
                <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau kategori filter.</p>
              </div>
            ) : (
              filteredCertificates.map((item) => {
                const isSelected = item.id === selectedCertId;
                const isGold = item.rank === 1;
                const isSilver = item.rank === 2;
                const isBronze = item.rank === 3;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCertId(item.id)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-400/30 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Rank / Category Badge */}
                      {item.isChampion ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            isGold
                              ? "bg-amber-400 text-amber-950 border border-amber-500/30"
                              : isSilver
                              ? "bg-slate-200 text-slate-900 border border-slate-300"
                              : isBronze
                              ? "bg-amber-700 text-white border border-amber-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {item.rankBadge}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider">
                          PESERTA
                        </span>
                      )}

                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {item.issueDate}
                      </span>
                    </div>

                    <div className="mt-2 space-y-0.5">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight leading-snug">
                        {item.swimmerName}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold truncate">
                        {item.club} • {item.eventName}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="font-mono text-[11px] font-bold text-blue-700">
                        {item.timeResult ? (
                          <span>
                            Waktu Resmi: <strong className="text-emerald-700">{item.timeResult}</strong>
                          </span>
                        ) : (
                          <span className="text-slate-500">Seed: {item.timeSeed}</span>
                        )}
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? "text-blue-600 translate-x-0.5" : "text-slate-300"
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE CERTIFICATE PREVIEW CANVAS (lg:col-span-7) */}
        <div className="lg:col-span-7 print:col-span-12 w-full">
          {!activeCertificate ? (
            <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center space-y-3">
              <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-700">Pilih Sertifikat untuk Melihat Preview</p>
            </div>
          ) : (
            <div className="bg-slate-200/60 p-3 sm:p-6 rounded-3xl border border-slate-200 shadow-inner flex justify-center print:bg-transparent print:p-0 print:border-none">
              {/* THE OFFICIAL CERTIFICATE SHEET (A4 Landscape / Portrait friendly) */}
              <div
                ref={printAreaRef}
                id="certificate-print-area"
                className="w-full max-w-[760px] bg-white text-slate-900 rounded-3xl shadow-2xl relative overflow-hidden p-6 sm:p-10 border-4 border-amber-400 print:shadow-none print:rounded-none print:max-w-none print:w-full print:m-0 print:border-4"
                style={{
                  boxShadow: "0 20px 40px -15px rgba(0,0,0,0.15)",
                }}
              >
                {/* INNER DECORATIVE GOLD/AMBER DOUBLE BORDER */}
                <div className="absolute inset-3 sm:inset-4 border-2 border-amber-300/80 rounded-2xl pointer-events-none" />
                <div className="absolute inset-4 sm:inset-5 border border-amber-200/60 rounded-xl pointer-events-none" />

                {/* DYNAMIC WATERMARK LAYER (LOGO & TEXT) */}
                {config.enabled && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
                    style={{ opacity: config.opacity }}
                  >
                    {(config.type === "both" || config.type === "logo") && config.logoUrl && (
                      <img
                        src={config.logoUrl}
                        alt="Watermark Logo"
                        className="w-72 sm:w-96 h-auto object-contain mb-2 filter grayscale contrast-125"
                        onError={(e) => {
                          // Fallback if image fails
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    )}
                    {(config.type === "both" || config.type === "text") && config.text && (
                      <p className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 uppercase tracking-widest text-center transform -rotate-12 select-none px-6 font-serif">
                        {config.text}
                      </p>
                    )}
                  </div>
                )}

                {/* CERTIFICATE FOREGROUND CONTENT */}
                <div className="relative z-10 flex flex-col items-center text-center space-y-4 sm:space-y-5">
                  {/* Top Organization Header Pill */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600 text-white text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{config.orgName || "MASC SWIM ACADEMY & TOURNAMENT"}</span>
                  </div>

                  {/* Main Document Title */}
                  <div className="space-y-1">
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase text-amber-900 font-serif leading-tight">
                      {activeCertificate.isChampion
                        ? "PIAGAM PENGHARGAAN JUARA"
                        : "SERTIFIKAT APRESIASI PESERTA"}
                    </h2>
                    <p className="text-[11px] sm:text-xs font-mono font-bold text-slate-500 tracking-wider">
                      No. Dokumen: {activeCertificate.docNumber}
                    </p>
                  </div>

                  {/* Subtitle wording */}
                  <p className="text-xs sm:text-sm font-medium text-slate-600 italic">
                    Diberikan secara resmi dan sah kepada perenang:
                  </p>

                  {/* Swimmer Name & Club Display */}
                  <div className="space-y-1.5 w-full py-1">
                    <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 uppercase tracking-tight font-sans">
                      {activeCertificate.swimmerName}
                    </h3>
                    <div className="inline-block px-4 py-1 rounded-xl bg-blue-50 border border-blue-200">
                      <span className="text-xs sm:text-sm font-black text-blue-800 uppercase tracking-wide">
                        {activeCertificate.club}
                      </span>
                    </div>
                  </div>

                  {/* Thin Divider Line */}
                  <div className="w-3/4 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent my-1" />

                  {/* Achievement & Event Description */}
                  <div className="max-w-xl text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    Atas prestasi dan partisipasinya pada Kejuaraan Renang Resmi{" "}
                    <strong className="text-slate-900 font-extrabold uppercase">
                      {activeCertificate.tournamentName}
                    </strong>{" "}
                    untuk nomor acara:
                  </div>

                  {/* Event Name Box */}
                  <div className="w-full max-w-lg px-6 py-2.5 rounded-2xl bg-sky-50/80 border border-sky-200 shadow-2xs">
                    <span className="text-sm sm:text-base font-black text-slate-900 uppercase">
                      {activeCertificate.eventName} ({activeCertificate.gender} • {activeCertificate.ageGroup})
                    </span>
                  </div>

                  {/* Rank & Official Time Capsule Badge */}
                  <div className="pt-1">
                    {activeCertificate.isChampion ? (
                      <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 border-2 border-amber-400 font-black text-xs sm:text-sm shadow-sm tracking-wide">
                        <Trophy className="w-4 h-4 text-amber-900" />
                        <span>
                          {activeCertificate.rankBadge} • WAKTU RESMI:{" "}
                          {activeCertificate.timeResult || activeCertificate.timeSeed}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-sky-100 text-sky-900 border border-sky-300 font-black text-xs sm:text-sm shadow-2xs tracking-wide">
                        <Medal className="w-4 h-4 text-sky-600" />
                        <span>
                          PARTISIPASI RESMI • WAKTU:{" "}
                          {activeCertificate.timeResult || activeCertificate.timeSeed}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Date & City */}
                  <div className="pt-2 text-center text-xs font-semibold text-slate-500">
                    <span>
                      {config.city}, {activeCertificate.issueDate}
                    </span>
                  </div>

                  {/* BOTTOM SIGNATURES (BARCODE REMOVED AS REQUESTED) */}
                  <div className="w-full pt-6 sm:pt-8 flex items-end justify-between px-4 sm:px-12">
                    {/* Signatory 1 (Technical Delegate) */}
                    <div className="flex flex-col items-center text-center w-48 sm:w-56">
                      <div className="h-12 flex items-center justify-center">
                        <span className="font-serif italic text-lg sm:text-xl text-blue-900 opacity-90 select-none">
                          {config.signatory1Name.split(" ")[0]}
                        </span>
                      </div>
                      <div className="w-full border-b border-slate-400 my-1" />
                      <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                        {config.signatory1Name}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 leading-tight mt-0.5">
                        {config.signatory1Title}
                      </span>
                    </div>

                    {/* Official Stamp / Seal Emblem Centerpiece */}
                    <div className="flex flex-col items-center justify-center opacity-80 shrink-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-500/70 p-1 flex items-center justify-center">
                        <div className="w-full h-full rounded-full border border-dashed border-amber-400 flex flex-col items-center justify-center text-[7px] font-black uppercase text-amber-800 text-center leading-tight">
                          <span>OFFICIAL</span>
                          <span>SEAL</span>
                        </div>
                      </div>
                    </div>

                    {/* Signatory 2 (Ketua Panitia) */}
                    <div className="flex flex-col items-center text-center w-48 sm:w-56">
                      <div className="h-12 flex items-center justify-center">
                        <span className="font-serif italic text-lg sm:text-xl text-blue-900 opacity-90 select-none">
                          {config.signatory2Name.split(" ")[0]}
                        </span>
                      </div>
                      <div className="w-full border-b border-slate-400 my-1" />
                      <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                        {config.signatory2Name}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 leading-tight mt-0.5">
                        {config.signatory2Title}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. MODAL CONFIGURATION (WATERMARK LOGO, TEXT, OPACITY & TTD) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Konfigurasi Watermark & Pejabat Sertifikat
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Kustomisasi teks/logo watermark latar dan nama tanda tangan resmi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs font-semibold text-slate-700 max-h-[70vh] overflow-y-auto pr-2">
              {/* WATERMARK SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    PENGATURAN WATERMARK BACKGROUND
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => saveConfig({ ...config, enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-800">Aktifkan Watermark</span>
                  </label>
                </div>

                {config.enabled && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/80">
                    {/* Watermark Type Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Jenis Tampilan Watermark
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => saveConfig({ ...config, type: "both" })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            config.type === "both"
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          Logo & Teks
                        </button>
                        <button
                          type="button"
                          onClick={() => saveConfig({ ...config, type: "logo" })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            config.type === "logo"
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          Logo Saja
                        </button>
                        <button
                          type="button"
                          onClick={() => saveConfig({ ...config, type: "text" })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            config.type === "text"
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          Teks Saja
                        </button>
                      </div>
                    </div>

                    {/* Watermark Text */}
                    {(config.type === "both" || config.type === "text") && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Teks Watermark Latar
                        </label>
                        <input
                          type="text"
                          value={config.text}
                          onChange={(e) => saveConfig({ ...config, text: e.target.value })}
                          placeholder="Contoh: MASC SWIM ACADEMY & TOURNAMENT"
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Watermark Logo Upload / URL */}
                    {(config.type === "both" || config.type === "logo") && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Logo Watermark (URL Gambar atau Upload File)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={config.logoUrl}
                            onChange={(e) => saveConfig({ ...config, logoUrl: e.target.value })}
                            placeholder="/logo-swimming.png atau https://..."
                            className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0">
                            {uploadingLogo ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                            ) : (
                              <Upload className="w-4 h-4 text-slate-600" />
                            )}
                            <span>{uploadingLogo ? "Mengunggah..." : "Upload Logo"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Opacity Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-600">
                          Transparansi / Opacity Watermark
                        </label>
                        <span className="font-mono font-bold text-blue-600">
                          {Math.round(config.opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.04"
                        max="0.40"
                        step="0.02"
                        value={config.opacity}
                        onChange={(e) =>
                          saveConfig({ ...config, opacity: parseFloat(e.target.value) })
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>Sangat Samar (4%)</span>
                        <span>Standar (12%)</span>
                        <span>Tegas (40%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ORGANIZATION & HEADER SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  IDENTITAS PENYELENGGARA & KOTA
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nama Penyelenggara Utama
                    </label>
                    <input
                      type="text"
                      value={config.orgName}
                      onChange={(e) => saveConfig({ ...config, orgName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Kota Penerbitan Sertifikat
                    </label>
                    <input
                      type="text"
                      value={config.city}
                      onChange={(e) => saveConfig({ ...config, city: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SIGNATURES SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  PEJABAT PENANDATANGAN RESMI
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Signatory 1 */}
                  <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black text-blue-700 uppercase">
                      Penandatangan Kiri (Technical Delegate)
                    </span>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500">Nama Lengkap</label>
                      <input
                        type="text"
                        value={config.signatory1Name}
                        onChange={(e) => saveConfig({ ...config, signatory1Name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500">Jabatan / Gelar</label>
                      <input
                        type="text"
                        value={config.signatory1Title}
                        onChange={(e) => saveConfig({ ...config, signatory1Title: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Signatory 2 */}
                  <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black text-blue-700 uppercase">
                      Penandatangan Kanan (Ketua Panitia)
                    </span>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500">Nama Lengkap</label>
                      <input
                        type="text"
                        value={config.signatory2Name}
                        onChange={(e) => saveConfig({ ...config, signatory2Name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500">Jabatan / Gelar</label>
                      <input
                        type="text"
                        value={config.signatory2Title}
                        onChange={(e) => saveConfig({ ...config, signatory2Title: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => saveConfig(DEFAULT_CONFIG)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Reset ke Pengaturan Default
              </button>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-blue-600/20"
              >
                Simpan & Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT CSS STYLING */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #certificate-print-area,
          #certificate-print-area * {
            visibility: visible;
          }
          #certificate-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            border: 4px solid #f59e0b !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 24px !important;
            page-break-after: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
