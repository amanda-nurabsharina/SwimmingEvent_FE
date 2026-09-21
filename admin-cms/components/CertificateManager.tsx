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
}

const DEFAULT_CONFIG: WatermarkConfig = {
  enabled: false,
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

  // Template Mode & QR Code
  const [selectedTemplateMode, setSelectedTemplateMode] = useState<
    "auto" | "best_swimmer" | "winner" | "participant"
  >("auto");
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

  // Compute active template image (Winner, Best Swimmer, or Participant)
  const currentTemplate = useMemo(() => {
    if (selectedTemplateMode === "best_swimmer") return "/templates/cert-best-swimmer.jpg";
    if (selectedTemplateMode === "winner") return "/templates/cert-winner.jpg";
    if (selectedTemplateMode === "participant") return "/templates/cert-participant.jpg";

    // Auto mode based on result & championship
    if (activeCertificate?.rank === 1 && activeCertificate?.isChampion) {
      return "/templates/cert-winner.jpg";
    }
    if (activeCertificate?.isChampion) {
      return "/templates/cert-winner.jpg";
    }
    return "/templates/cert-participant.jpg";
  }, [selectedTemplateMode, activeCertificate]);

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
            <div className="space-y-4">
              {/* TOOLBAR CONTROLS (TEMPLATE PICKER & OVERLAY TOGGLE) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs print:hidden">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Pilih Template:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateMode("auto")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      selectedTemplateMode === "auto"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Otomatis
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateMode("winner")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      selectedTemplateMode === "winner"
                        ? "bg-slate-900 text-amber-300 shadow-2xs border border-amber-400/50"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>🏆</span>
                    <span>Winner (Navy)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateMode("best_swimmer")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      selectedTemplateMode === "best_swimmer"
                        ? "bg-amber-400 text-amber-950 font-black shadow-2xs border border-amber-500"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>🌟</span>
                    <span>Best Swimmer (Gold)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateMode("participant")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      selectedTemplateMode === "participant"
                        ? "bg-red-600 text-white font-black shadow-2xs border border-red-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>🎖️</span>
                    <span>Participant (Red)</span>
                  </button>
                </div>

                {/* Optional Dynamic Tournament Info Overlay Toggle */}
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={overrideTournamentText}
                    onChange={(e) => setOverrideTournamentText(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Teks Turnamen Dinamis</span>
                </label>
              </div>

              {/* THE OFFICIAL CERTIFICATE SHEET (A4 PORTRAIT) */}
              <div className="bg-slate-200/60 p-3 sm:p-6 rounded-3xl border border-slate-200 shadow-inner flex justify-center print:bg-transparent print:p-0 print:border-none">
                <div
                  ref={printAreaRef}
                  id="certificate-print-area"
                  className="relative w-full max-w-[580px] aspect-[723/1024] bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-300 select-none print:border-none print:shadow-none print:rounded-none print:w-full print:h-full print:max-w-none print:m-0"
                  style={{
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  }}
                >
                  {/* 1. Base High-Res Certificate Template Background */}
                  <img
                    src={currentTemplate}
                    alt="Certificate Background Template"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                  />

                  {/* 2. Optional Config Watermark Layer */}
                  {config.enabled && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10 overflow-hidden"
                      style={{ opacity: config.opacity }}
                    >
                      {(config.type === "both" || config.type === "logo") && config.logoUrl && (
                        <img
                          src={config.logoUrl}
                          alt="Watermark Logo"
                          className="w-56 h-auto object-contain mb-2 filter grayscale contrast-125"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      )}
                      {(config.type === "both" || config.type === "text") && config.text && (
                        <p className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-widest text-center transform -rotate-12 select-none px-6 font-serif">
                          {config.text}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 3. RECIPIENT REGION (Positioned under 'AS A MARK OF RECOGNITION FOR') */}
                  <div className="absolute top-[28.5%] left-[8%] right-[24%] z-20 flex flex-col items-center text-center px-4">
                    {/* Swimmer Name */}
                    <h2 className="text-xl sm:text-2xl md:text-[27px] font-serif font-black uppercase tracking-[0.08em] text-[#0f172a] leading-tight drop-shadow-2xs">
                      {activeCertificate.swimmerName}
                    </h2>

                    {/* Subtle Gold Decorative Line */}
                    <div className="h-[1.5px] w-40 sm:w-56 bg-gradient-to-r from-transparent via-[#c59e38] to-transparent my-1.5" />

                    {/* Club / Kontingen */}
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.16em] text-[#9b7b2c] drop-shadow-2xs">
                      {activeCertificate.club}
                    </span>

                    {/* Event / Nomor Acara & Kategori */}
                    <p className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 leading-snug">
                      {formatEventTitle(activeCertificate.eventName)} ({activeCertificate.gender} • {activeCertificate.ageGroup})
                    </p>

                    {/* Rank / Badge & Official Time */}
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
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-50/95 border border-slate-300 shadow-2xs">
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

                  {/* 4. OPTIONAL DYNAMIC TOURNAMENT INFO OVERLAY */}
                  {overrideTournamentText && (
                    <div className="absolute top-[48%] left-[8%] right-[25%] z-20 flex flex-col items-center text-center px-4 py-2 rounded-xl bg-white/80 backdrop-blur-xs border border-white/80 shadow-2xs">
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        FOR PARTICIPATING IN THE
                      </p>
                      <p className="text-[11px] sm:text-xs font-black text-slate-900 uppercase tracking-wide leading-tight my-0.5">
                        {activeCertificate.tournamentName}
                      </p>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        ORGANIZED BY {config.orgName || "MODERN AQUATIC SWIMMING CLUB ( MASC )"}
                      </p>
                      <p className="text-[8px] sm:text-[9px] font-semibold text-slate-600 uppercase mt-0.5">
                        IN {activeCertificate.tournamentDate} • {activeCertificate.tournamentLocation || config.city}
                      </p>
                    </div>
                  )}

                  {/* 5. OFFICIAL BARCODE & QR CODE VERIFICATION BOX */}
                  <div className="absolute right-[25%] bottom-[15.5%] z-20 flex flex-col items-center p-2 rounded-xl bg-white/95 border border-amber-400/80 shadow-md backdrop-blur-xs">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="QR Code Verifikasi Resmi"
                        className="w-13 h-13 sm:w-15 sm:h-15 object-contain rounded-md"
                      />
                    ) : (
                      <div className="w-13 h-13 sm:w-15 sm:h-15 bg-slate-100 rounded flex items-center justify-center text-[8px] text-slate-400">
                        QR Code
                      </div>
                    )}

                    {/* 1D Barcode Graphic Lines */}
                    <div className="w-full flex items-center justify-between gap-[1.5px] h-2.5 my-1 px-0.5 opacity-90">
                      {[3, 1, 4, 1, 3, 2, 4, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 3].map((w, i) => (
                        <div key={i} className="bg-slate-900 h-full" style={{ width: `${w * 0.7}px` }} />
                      ))}
                    </div>

                    <span className="text-[7.5px] sm:text-[8px] font-black text-slate-900 tracking-wider font-mono uppercase text-center leading-none">
                      VERIFIKASI RESMI
                    </span>
                    <span className="text-[6.5px] sm:text-[7px] font-bold text-slate-500 font-mono leading-none mt-0.5">
                      {activeCertificate.docNumber}
                    </span>
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

      {/* PRINT CSS STYLING (A4 PORTRAIT) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #certificate-print-area,
          #certificate-print-area * {
            visibility: visible !important;
          }
          #certificate-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
