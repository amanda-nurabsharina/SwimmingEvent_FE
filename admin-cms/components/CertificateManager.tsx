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
  Palette,
} from "lucide-react";
import { getBukuAcara, getRegistrations, uploadImage } from "../lib/api-admin";
import { calculateEventChampions, EventGroupData, RankedSwimmer } from "../lib/champion-utils";
import QRCode from "qrcode";

function formatEventTitle(name: string) {
  if (!name) return "";
  return name
    .replace(/INDIVIDUALMEDLEY/gi, "INDIVIDUAL MEDLEY")
    .replace(/GAYABEBAS/gi, "GAYA BEBAS")
    .replace(/GAYADADA/gi, "GAYA DADA")
    .replace(/GAYAPUNGGUNG/gi, "GAYA PUNGGUNG")
    .replace(/GAYAKUPU/gi, "GAYA KUPU-KUPU");
}

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
  bodyPreText: string;
  bodyCompetitionName: string;
  bodyOrganizerName: string;
  bodyDateText: string;
  bodyVenueText: string;
  bodyLocationText: string;
  useCustomBodyText: boolean;
}

const DEFAULT_CONFIG: WatermarkConfig = {
  enabled: false,
  type: "both",
  text: "MASC SWIM ACADEMY & TOURNAMENT",
  logoUrl: "/logo-swimming.png",
  opacity: 0.12,
  orgName: "MASC SWIM ACADEMY & TOURNAMENT",
  subOrgName: "AKUATIK INDONESIA KOTA TANGERANG",
  signatory1Name: "FAJAR YOGANTARA",
  signatory1Title: "EXECUTIVE DIRECTOR",
  signatory2Name: "Ammar Fadhil, S.Or",
  signatory2Title: "Ketua Pelaksana Turnamen",
  city: "Kota Tangerang",
  bodyPreText: "FOR PARTICIPATING IN THE",
  bodyCompetitionName: "FUN SWIMMING COMPETITION ORGANIZED BY",
  bodyOrganizerName: "MODERN AQUATIC SWIMMING CLUB ( MASC )",
  bodyDateText: "IN OCTOBER 17TH, 2026",
  bodyVenueText: "MODERN GOLF AND COUNTRY CLUB",
  bodyLocationText: "KOTA MODERN, KOTA TANGERANG",
  useCustomBodyText: false,
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

  // Template Color Mode & QR Code
  const [selectedTemplateMode, setSelectedTemplateMode] = useState<
    "winner" | "best_swimmer" | "participant" | null
  >(null);
  const [overrideTournamentText, setOverrideTournamentText] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

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
        const parsed = JSON.parse(saved);
        setConfig({ ...DEFAULT_CONFIG, ...parsed, enabled: false });
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

  // Compute active template type (winner, best_swimmer, or participant)
  const activeTemplateType = useMemo(() => {
    if (selectedTemplateMode) {
      return selectedTemplateMode;
    }
    return activeCertificate?.isChampion ? "winner" : "participant";
  }, [selectedTemplateMode, activeCertificate]);

  const certCategoryTitle = useMemo(() => {
    if (activeTemplateType === "best_swimmer") return "OF BEST SWIMMER";
    if (activeTemplateType === "winner") return "OF WINNER";
    return "OF PARTICIPANT";
  }, [activeTemplateType]);

  // Generate dynamic QR Code for landing page verification
  useEffect(() => {
    if (!activeCertificate) return;
    const baseUrl = process.env.NEXT_PUBLIC_LANDING_URL || "https://masc.fourplusone.my.id";
    const targetUrl = `${baseUrl}/#status-check?code=${encodeURIComponent(
      activeCertificate.docNumber || String(activeCertificate.id)
    )}`;

    QRCode.toDataURL(targetUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [activeCertificate]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm print:hidden">
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
            <span>Config Certificate</span>
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/90 print:hidden">
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
            <div className="space-y-4">
              {/* THEME / COLOR PICKER CONTROLS */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs print:hidden">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Pilihan Warna Sertifikat:
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateMode("winner")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTemplateType === "winner"
                        ? "bg-[#164e87] text-white shadow-sm ring-2 ring-[#164e87]/40 font-extrabold"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>🏆</span>
                    <span>Biru (Winner)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplateMode("best_swimmer")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTemplateType === "best_swimmer"
                        ? "bg-amber-400 text-amber-950 font-black shadow-sm ring-2 ring-amber-400/50"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>🌟</span>
                    <span>Emas (Best Swimmer)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplateMode("participant")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTemplateType === "participant"
                        ? "bg-red-600 text-white font-black shadow-sm ring-2 ring-red-600/40"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>🎖️</span>
                    <span>Merah (Participant)</span>
                  </button>
                </div>
              </div>

              {/* THE OFFICIAL CERTIFICATE SHEET (A4 PORTRAIT NATIVE CUSTOM DESIGN) */}
              <div className="bg-slate-200/60 p-3 sm:p-6 rounded-3xl border border-slate-200 shadow-inner flex justify-center print:bg-transparent print:p-0 print:border-none">
                <div
                  ref={printAreaRef}
                  id="certificate-print-area"
                  className="relative w-full max-w-[590px] aspect-[210/297] bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border-[12px] border-[#1e293b] select-none print:border-[12px] print:border-[#1e293b] print:shadow-none print:rounded-none print:w-full print:h-full print:max-w-none print:m-0"
                  style={{
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    background: "linear-gradient(145deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%)",
                  }}
                >
                  {/* 1. INNER METALLIC GOLD PINSTRIPE BORDER */}
                  <div className="absolute inset-2 sm:inset-2.5 border-[1.5px] border-[#d4af37] rounded-2xl pointer-events-none z-30" />

                  {/* 2. BACKGROUND SOFT DIAGONAL RAYS */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0">
                    <defs>
                      <linearGradient id="ray1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points="120,0 260,0 60,1024 0,1024" fill="url(#ray1)" />
                    <polygon points="300,0 520,0 220,1024 100,1024" fill="url(#ray1)" opacity="0.6" />
                  </svg>

                  {/* 3. LEFT EDGE GOLD GEOMETRIC FACETS */}
                  <svg className="absolute left-0 top-0 bottom-0 w-24 sm:w-32 h-full pointer-events-none z-0">
                    <defs>
                      <linearGradient id="goldFacet1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#d97706" stopOpacity="0.85" />
                        <stop offset="45%" stopColor="#fde047" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#78350f" stopOpacity="0.3" />
                      </linearGradient>
                      <linearGradient id="goldFacet2" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#451a03" stopOpacity="0.25" />
                      </linearGradient>
                    </defs>
                    <polygon points="0,0 42,0 0,390" fill="url(#goldFacet1)" />
                    <polygon points="0,190 70,370 0,660" fill="url(#goldFacet2)" />
                    <polygon points="0,490 38,640 0,820" fill="url(#goldFacet1)" opacity="0.6" />
                  </svg>

                  {/* 4. BOTTOM AQUATIC WAVES */}
                  <svg
                    viewBox="0 0 723 210"
                    preserveAspectRatio="none"
                    className="absolute bottom-0 left-0 right-0 w-full h-32 sm:h-44 pointer-events-none z-10"
                  >
                    <defs>
                      <linearGradient id="waveLight" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.95" />
                      </linearGradient>
                      <linearGradient id="waveMid" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#475569" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                      <linearGradient id="waveDeep" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1e3e6b" />
                        <stop offset="100%" stopColor="#14365d" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,60 C140,20 280,90 420,50 C540,15 630,70 723,40 L723,210 L0,210 Z"
                      fill="url(#waveLight)"
                    />
                    <path
                      d="M0,75 C150,35 290,105 430,65 C550,30 640,85 723,55"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeOpacity="0.6"
                    />
                    <path
                      d="M0,95 C130,55 270,125 410,85 C530,50 620,105 723,75"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeOpacity="0.4"
                    />
                    <path
                      d="M0,105 C160,70 300,135 450,95 C570,60 650,110 723,90 L723,210 L0,210 Z"
                      fill="url(#waveMid)"
                    />
                    <path
                      d="M0,140 C180,110 320,165 480,130 C600,100 660,135 723,125 L723,210 L0,210 Z"
                      fill="url(#waveDeep)"
                    />
                  </svg>

                  {/* 5. RIGHT VERTICAL RIBBON & 3D GOLD MEDALLION SEAL */}
                  <div
                    className={`absolute top-0 bottom-0 right-[6%] sm:right-[7%] w-14 sm:w-18 z-20 flex flex-col items-center shadow-lg pointer-events-none ${
                      activeTemplateType === "best_swimmer"
                        ? "bg-gradient-to-b from-[#d97706] via-[#fef08a] to-[#b45309] border-x-2 border-[#b45309]"
                        : activeTemplateType === "winner"
                        ? "bg-[#164e87] border-x-2 border-[#d4af37]"
                        : "bg-[#991b1b] border-x-2 border-[#d4af37]"
                    }`}
                  >
                    {/* Inner gold pinstripes */}
                    <div className="absolute inset-y-0 left-1 w-[1.5px] bg-[#fde047]/60" />
                    <div className="absolute inset-y-0 right-1 w-[1.5px] bg-[#fde047]/60" />

                    {/* 3D Gold Medallion Medal Badge */}
                    <div className="absolute top-[13%] w-20 h-20 sm:w-24 sm:h-24 -translate-x-[2px] pointer-events-none">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                        <defs>
                          {/* Rich Champagne Gold Radial Gradient (No Brown) */}
                          <radialGradient id="goldMedalGrad" cx="38%" cy="32%" r="68%">
                            <stop offset="0%" stopColor="#fffdf0" />
                            <stop offset="25%" stopColor="#fef08a" />
                            <stop offset="55%" stopColor="#f5c94c" />
                            <stop offset="85%" stopColor="#d8a11e" />
                            <stop offset="100%" stopColor="#be8513" />
                          </radialGradient>

                          {/* Metallic Satin Gold Rim Gradient */}
                          <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fffbeb" />
                            <stop offset="20%" stopColor="#fde047" />
                            <stop offset="50%" stopColor="#eab308" />
                            <stop offset="80%" stopColor="#ca8a04" />
                            <stop offset="100%" stopColor="#fff9c4" />
                          </linearGradient>
                        </defs>

                        {/* 16-Scallop Rosette Outer Medallion Border */}
                        <path
                          d="M 94.50 50.00 Q 98.25 59.60 91.11 67.03 Q 90.91 77.33 81.47 81.47 Q 77.33 90.91 67.03 91.11 Q 59.60 98.25 50.00 94.50 Q 40.40 98.25 32.97 91.11 Q 22.67 90.91 18.53 81.47 Q 9.09 77.33 8.89 67.03 Q 1.75 59.60 5.50 50.00 Q 1.75 40.40 8.89 32.97 Q 9.09 22.67 18.53 18.53 Q 22.67 9.09 32.97 8.89 Q 40.40 1.75 50.00 5.50 Q 59.60 1.75 67.03 8.89 Q 77.33 9.09 81.47 18.53 Q 90.91 22.67 91.11 32.97 Q 98.25 40.40 94.50 50.00 Z"
                          fill="url(#goldRimGrad)"
                          stroke="#ca8a04"
                          strokeWidth="0.75"
                        />

                        {/* Inner Scallop Shadow Ring */}
                        <circle cx="50" cy="50" r="42.5" fill="url(#goldRimGrad)" stroke="#c28e18" strokeWidth="0.6" />

                        {/* Polished Inner Ring Ridge */}
                        <circle cx="50" cy="50" r="39.5" fill="none" stroke="#fff9c4" strokeWidth="1.2" strokeOpacity="0.9" />
                        <circle cx="50" cy="50" r="38" fill="none" stroke="#b8860b" strokeWidth="0.6" strokeOpacity="0.7" />

                        {/* Center Gold Medallion Sunburst / Satin Face */}
                        <circle cx="50" cy="50" r="36.5" fill="url(#goldMedalGrad)" stroke="#eab308" strokeWidth="0.8" />
                        <circle cx="50" cy="50" r="35" fill="none" stroke="#fffdf0" strokeWidth="0.75" strokeOpacity="0.6" />

                        {/* MASC Geometric Emblem in Pure Golden Relief */}
                        <g transform="translate(50, 50) scale(0.62) translate(-50, -50)">
                          {/* Top roof chevron */}
                          <path
                            d="M 50 16 L 76 33 L 76 43 L 50 26 L 24 43 L 24 33 Z"
                            fill="url(#goldRimGrad)"
                            stroke="#ca8a04"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                          {/* Center geometric S waves */}
                          <path
                            d="M 50 31 L 70 44 L 70 54 L 50 41 L 30 54 L 30 44 Z"
                            fill="url(#goldRimGrad)"
                            stroke="#ca8a04"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M 50 46 L 70 59 L 70 69 L 50 56 L 30 69 L 30 59 Z"
                            fill="url(#goldRimGrad)"
                            stroke="#ca8a04"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                          {/* Bottom interlocking diamond point */}
                          <path
                            d="M 50 61 L 64 71 L 50 82 L 36 71 Z"
                            fill="url(#goldRimGrad)"
                            stroke="#ca8a04"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                        </g>
                      </svg>
                    </div>
                  </div>

                  {/* 6. BOTTOM-LEFT MASC CLUB PILL BADGE */}
                  <div className="absolute left-6 sm:left-9 bottom-3.5 sm:bottom-5 z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#143963] border border-amber-400/40 shadow-lg">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 p-1 flex items-center justify-center text-slate-950 font-black text-xs">
                      <span>M</span>
                    </div>
                    <div className="text-left leading-none">
                      <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-400">
                        MODERN AQUATIC
                      </div>
                      <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">
                        SWIMMING CLUB
                      </div>
                    </div>
                  </div>

                  {/* 7. CERTIFICATE FOREGROUND CONTENT (ALL 100% NATIVE TYPOGRAPHY) */}
                  <div className="relative z-20 pt-8 sm:pt-10 pl-7 sm:pl-10 pr-20 sm:pr-24 flex flex-col items-start text-left">
                    {/* TOP HEADER */}
                    <div className="space-y-0.5 sm:space-y-1">
                      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[0.12em] text-[#193d6e] uppercase font-sans leading-none">
                        CERTIFICATE
                      </h1>
                      <div className="text-xl sm:text-2xl md:text-[28px] font-black tracking-[0.16em] uppercase bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 bg-clip-text text-transparent leading-tight">
                        {certCategoryTitle}
                      </div>
                      <div className="h-[2px] w-48 sm:w-64 bg-gradient-to-r from-[#d4af37] via-[#facc15] to-transparent my-1 sm:my-1.5" />
                      <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase pt-0.5">
                        AS A MARK OF RECOGNITION FOR
                      </p>
                    </div>

                    {/* RECIPIENT REGION */}
                    <div className="mt-5 sm:mt-6 md:mt-7 flex flex-col items-start text-left">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black uppercase tracking-[0.08em] text-[#0f172a] leading-tight drop-shadow-xs">
                        {activeCertificate.swimmerName}
                      </h2>
                      <div className="h-[2px] w-44 sm:w-64 bg-gradient-to-r from-[#c59e38] to-transparent my-1 sm:my-1.5" />
                      <span className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-[#9b7b2c]">
                        {activeCertificate.club}
                      </span>
                      <p className="mt-1 text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wider text-slate-700 leading-snug">
                        {formatEventTitle(activeCertificate.eventName)} ({activeCertificate.gender} • {activeCertificate.ageGroup})
                      </p>

                      {/* Rank & Official Time Badge */}
                      <div className="mt-2">
                        {activeCertificate.isChampion ? (
                          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50/95 border border-amber-400/90 shadow-2xs">
                            <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-amber-950 uppercase">
                              {activeCertificate.rankBadge}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                            <span className="text-[10px] sm:text-[11px] font-bold font-mono tracking-wide text-slate-800">
                              WAKTU RESMI: {activeCertificate.timeResult || activeCertificate.timeSeed}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100/95 border border-slate-300 shadow-2xs">
                            <Medal className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-800 uppercase">
                              PESERTA RESMI
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                            <span className="text-[10px] sm:text-[11px] font-bold font-mono tracking-wide text-slate-600">
                              WAKTU: {activeCertificate.timeResult || activeCertificate.timeSeed}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DYNAMIC TOURNAMENT BODY DESCRIPTION TEXT (NATURAL MIDDLE POSITIONING) */}
                    <div className="mt-6 sm:mt-8 md:mt-10 space-y-2 text-left max-w-[420px]">
                      <div className="space-y-0.5 sm:space-y-1 text-[9.5px] sm:text-[11px] font-bold tracking-wider text-[#1e293b] uppercase leading-relaxed font-sans">
                        <p>{config.bodyPreText || "FOR PARTICIPATING IN THE"}</p>
                        <p className="font-extrabold text-[#0f172a]">
                          {config.bodyCompetitionName || `${activeCertificate.tournamentName} ORGANIZED BY`}
                        </p>
                        <p>{config.bodyOrganizerName || config.orgName || "MODERN AQUATIC SWIMMING CLUB ( MASC )"}</p>
                        <p>{config.bodyDateText || `IN ${activeCertificate.tournamentDate.toUpperCase()}`}</p>
                      </div>

                      <div className="pt-2 space-y-0.5 sm:space-y-1 text-[9.5px] sm:text-[11px] font-bold tracking-wider text-[#1e293b] uppercase leading-relaxed font-sans">
                        <p className="font-extrabold text-[#0f172a]">
                          {config.bodyVenueText || activeCertificate.tournamentLocation?.toUpperCase() || "MODERN GOLF AND COUNTRY CLUB"}
                        </p>
                        <p>{config.bodyLocationText || config.city?.toUpperCase() || "KOTA MODERN, KOTA TANGERANG"}</p>
                      </div>
                    </div>
                  </div>

                  {/* 8. BOTTOM SIGNATURES & OFFICIAL VERIFICATION (EDITABLE IN WATERMARK/CONFIG) */}
                  <div className="absolute bottom-[4.2rem] sm:bottom-[4.8rem] left-7 sm:left-10 right-[24%] z-20 flex items-end justify-between">
                    {/* Signatory 1 (Technical Delegate / Executive Director) */}
                    <div className="flex flex-col items-start text-left w-36 sm:w-44">
                      <div className="h-7 sm:h-9 flex items-center">
                        <span className="font-serif italic text-base sm:text-lg text-slate-800 opacity-90 select-none">
                          {config.signatory1Name.split(" ")[0]}
                        </span>
                      </div>
                      <div className="w-full border-b-2 border-slate-700/80 my-0.5" />
                      <span className="text-[11px] sm:text-xs font-black text-slate-900 uppercase tracking-wide leading-tight">
                        {config.signatory1Name}
                      </span>
                      <span className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                        {config.signatory1Title}
                      </span>
                    </div>

                    {/* Official Stamp / Seal Emblem Centerpiece */}
                    <div className="hidden sm:flex flex-col items-center justify-center opacity-85 shrink-0 px-2">
                      <div className="w-12 h-12 rounded-full border-2 border-amber-500/70 p-1 flex items-center justify-center">
                        <div className="w-full h-full rounded-full border border-dashed border-amber-400 flex flex-col items-center justify-center text-[6px] font-black uppercase text-amber-900 text-center leading-tight">
                          <span>OFFICIAL</span>
                          <span>SEAL</span>
                        </div>
                      </div>
                    </div>

                    {/* Official Barcode & QR Code Verification Box */}
                    <div className="flex flex-col items-center p-1.5 sm:p-2 rounded-xl bg-white/95 border border-amber-400/80 shadow-md backdrop-blur-xs shrink-0">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="QR Code Verifikasi Resmi"
                          className="w-11 h-11 sm:w-13 sm:h-13 object-contain rounded-md"
                        />
                      ) : (
                        <div className="w-11 h-11 sm:w-13 sm:h-13 bg-slate-100 rounded flex items-center justify-center text-[8px] text-slate-400">
                          QR Code
                        </div>
                      )}

                      {/* 1D Barcode Graphic Lines */}
                      <div className="w-full flex items-center justify-between gap-[1.5px] h-2 my-0.5 px-0.5 opacity-90">
                        {[3, 1, 4, 1, 3, 2, 4, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 3].map((w, i) => (
                          <div key={i} className="bg-slate-900 h-full" style={{ width: `${w * 0.7}px` }} />
                        ))}
                      </div>

                      <span className="text-[7px] sm:text-[7.5px] font-black text-slate-900 tracking-wider font-mono uppercase text-center leading-none">
                        VERIFIKASI RESMI
                      </span>
                      <span className="text-[6px] sm:text-[6.5px] font-bold text-slate-500 font-mono leading-none mt-0.5">
                        {activeCertificate.docNumber}
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
                    Config Certificate
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Kustomisasi watermark latar, teks kejuaraan, dan pejabat penandatangan resmi
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

              {/* TOURNAMENT BODY TEXT CUSTOMIZATION SECTION */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    SETUP TEKS ISI KEJUARAAN / TURNAMEN (TENGAH SERTIFIKAT)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.useCustomBodyText}
                      onChange={(e) => saveConfig({ ...config, useCustomBodyText: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-amber-900">Aktifkan Teks Kustom</span>
                  </label>
                </div>

                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  Gunakan bagian ini untuk mengubah kalimat isi di tengah sertifikat (nama turnamen, klub penyelenggara, tanggal, dan lokasi/venue kolam) agar sesuai kejuaraan aktif.
                </p>

                {config.useCustomBodyText && (
                  <div className="space-y-3 pt-2 border-t border-amber-200/80">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeCertificate) {
                            saveConfig({
                              ...config,
                              useCustomBodyText: true,
                              bodyPreText: "FOR PARTICIPATING IN THE",
                              bodyCompetitionName: `${activeCertificate.tournamentName} ORGANIZED BY`,
                              bodyOrganizerName: config.orgName || "MODERN AQUATIC SWIMMING CLUB ( MASC )",
                              bodyDateText: `IN ${activeCertificate.tournamentDate.toUpperCase()}`,
                              bodyVenueText: activeCertificate.tournamentLocation ? activeCertificate.tournamentLocation.toUpperCase() : "MODERN GOLF AND COUNTRY CLUB",
                              bodyLocationText: config.city.toUpperCase() || "KOTA MODERN, KOTA TANGERANG",
                            });
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        <span>Salin Otomatis Data Turnamen DB</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Baris 1: Teks Pembuka (Pre-text)
                        </label>
                        <input
                          type="text"
                          value={config.bodyPreText}
                          onChange={(e) => saveConfig({ ...config, bodyPreText: e.target.value })}
                          placeholder="FOR PARTICIPATING IN THE"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Baris 2: Nama Lomba / Kejuaraan
                        </label>
                        <input
                          type="text"
                          value={config.bodyCompetitionName}
                          onChange={(e) => saveConfig({ ...config, bodyCompetitionName: e.target.value })}
                          placeholder="FUN SWIMMING COMPETITION ORGANIZED BY"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Baris 3: Nama Klub Penyelenggara
                        </label>
                        <input
                          type="text"
                          value={config.bodyOrganizerName}
                          onChange={(e) => saveConfig({ ...config, bodyOrganizerName: e.target.value })}
                          placeholder="MODERN AQUATIC SWIMMING CLUB ( MASC )"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Baris 4: Tanggal / Waktu Pelaksanaan
                        </label>
                        <input
                          type="text"
                          value={config.bodyDateText}
                          onChange={(e) => saveConfig({ ...config, bodyDateText: e.target.value })}
                          placeholder="IN OCTOBER 17TH, 2026"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Baris 5: Venue / Lokasi Kolam
                        </label>
                        <input
                          type="text"
                          value={config.bodyVenueText}
                          onChange={(e) => saveConfig({ ...config, bodyVenueText: e.target.value })}
                          placeholder="MODERN GOLF AND COUNTRY CLUB"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Baris 6: Kota Pelaksanaan
                        </label>
                        <input
                          type="text"
                          value={config.bodyLocationText}
                          onChange={(e) => saveConfig({ ...config, bodyLocationText: e.target.value })}
                          placeholder="KOTA MODERN, KOTA TANGERANG"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
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

              {/* SIGNATURES SECTION (SINGLE SIGNATORY) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  PEJABAT PENANDATANGAN RESMI
                </label>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">
                    Penandatangan Sertifikat (Executive Director / Technical Delegate)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={config.signatory1Name}
                        onChange={(e) => saveConfig({ ...config, signatory1Name: e.target.value })}
                        placeholder="Contoh: FAJAR YOGANTARA"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Jabatan / Gelar</label>
                      <input
                        type="text"
                        value={config.signatory1Title}
                        onChange={(e) => saveConfig({ ...config, signatory1Title: e.target.value })}
                        placeholder="Contoh: EXECUTIVE DIRECTOR"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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

      {/* PRINT CSS STYLING (PERFECT SINGLE-PAGE A4 PORTRAIT) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          html,
          body {
            width: 210mm !important;
            height: 297mm !important;
            max-width: 210mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Completely hide all elements outside the certificate */
          nav,
          header,
          aside,
          footer,
          .print\:hidden {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          #certificate-print-area,
          #certificate-print-area * {
            visibility: visible;
          }
          #certificate-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 590px !important;
            height: 834.4px !important;
            max-width: 590px !important;
            max-height: 834.4px !important;
            min-width: 590px !important;
            min-height: 834.4px !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            border: 12px solid #1e293b !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            transform-origin: 0 0 !important;
            transform: scale(1.342) !important;
            -webkit-transform: scale(1.342) !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            break-before: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
