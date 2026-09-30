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

function formatEventRaceLine(item: CertificateItem): string {
  let stroke = item.stroke || "";
  if (!stroke && item.eventName) {
    stroke = item.eventName;
  }
  stroke = stroke
    .replace(/GAYA DADA/gi, "Breaststroke")
    .replace(/GAYADADA/gi, "Breaststroke")
    .replace(/GAYA BEBAS/gi, "Freestyle")
    .replace(/GAYABEBAS/gi, "Freestyle")
    .replace(/GAYA PUNGGUNG/gi, "Backstroke")
    .replace(/GAYAPUNGGUNG/gi, "Backstroke")
    .replace(/GAYA KUPU-KUPU/gi, "Butterfly")
    .replace(/GAYAKUPU/gi, "Butterfly")
    .replace(/INDIVIDUAL MEDLEY/gi, "Individual Medley")
    .replace(/INDIVIDUALMEDLEY/gi, "Individual Medley");

  let dist = item.distance || "";
  if (dist.toLowerCase().endsWith("m") && !dist.includes(" ")) {
    dist = dist.slice(0, -1).trim() + " M";
  }

  const parts = [];
  if (dist) parts.push(dist);
  if (stroke) parts.push(stroke);
  if (item.gender) parts.push(item.gender.toUpperCase());

  let main = parts.join(" ");
  if (item.ageGroup) {
    main += ` – ${item.ageGroup.toUpperCase()}`;
  }
  return main || item.eventName || "50 M Breaststroke PUTRA – KU 2";
}

function getScreenshotDocNumber(item: CertificateItem): string {
  if (item.docNumber && item.docNumber.startsWith("NO.")) {
    return item.docNumber;
  }
  const regNum = item.registrationId || item.rank || 25;
  const numPadded = String(regNum).padStart(2, "0");
  const yearShort = new Date().getFullYear().toString().slice(-2);
  return `NO. ${numPadded} / MASC / FSW / XII / ${yearShort}`;
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
  orgName: "MODERN AQUATIC SWIMMING CLUB",
  subOrgName: "AKUATIK INDONESIA KOTA TANGERANG",
  signatory1Name: "FAJAR YOGANTARA",
  signatory1Title: "EXECUTIVE DIRECTOR",
  signatory2Name: "Ammar Fadhil, S.Or",
  signatory2Title: "Ketua Pelaksana Turnamen",
  city: "Kota Tangerang",
  bodyPreText: "FOR PARTICIPATING IN THE",
  bodyCompetitionName: "FUN SWIMMING COMPETITION ORGANIZED BY",
  bodyOrganizerName: "MODERN AQUATIC SWIMMING CLUB ( MASC )",
  bodyDateText: "IN DECEMBER 13TH, 2025",
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState<number>(1);

  // Responsive scaling for 590x834 internal canvas
  useEffect(() => {
    const updateScale = () => {
      if (viewportRef.current) {
        const availableW = viewportRef.current.clientWidth;
        if (availableW > 0) {
          const scale = Math.min(1, Math.max(0.2, (availableW - 4) / 590));
          setCanvasScale(scale);
        }
      }
    };
    updateScale();

    const ro = new ResizeObserver(() => {
      updateScale();
    });
    if (viewportRef.current) {
      ro.observe(viewportRef.current);
    }

    window.addEventListener("resize", updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

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
        getBukuAcara(tid),
        getRegistrations(),
      ]);

      if (bukuRes && bukuRes.success && Array.isArray(bukuRes.data)) {
        setEventGroups(bukuRes.data);
      } else {
        setEventGroups([]);
      }

      if (regRes && regRes.success && Array.isArray(regRes.data)) {
        const matchingRegs = regRes.data.filter((r: any) => {
          const rTid = Number(
            r.swimming_event?.tournament_id ||
            r.swimming_event?.tournament?.id ||
            r.tournament_id ||
            0
          );
          return rTid === Number(tid);
        });
        setRawRegistrations(matchingRegs);
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
      rawRegistrations.forEach((r: any, idx: number) => {
        const certId = `reg-${r.id}`;
        const p = r.participant || {};
        const ev = r.swimming_event || {};
        const sName = p.nama || p.name || r.name || r.swimmer_name || "Perenang";
        const sClub = p.club || r.club || "MASC KOTA TANGERANG";
        const evName = ev.event_name || (ev.distance ? `${ev.distance} ${ev.stroke || "Gaya Bebas"}` : "Nomor Lomba");
        const sRank = Number(r.final_rank || r.rank || 0);
        const isChamp = sRank >= 1 && sRank <= 3;
        let rankBadge = "PESERTA";
        if (sRank === 1) rankBadge = "JUARA 1 (EMAS)";
        else if (sRank === 2) rankBadge = "JUARA 2 (PERAK)";
        else if (sRank === 3) rankBadge = "JUARA 3 (PERUNGGU)";

        const docNumber = `CERT/${tourneyCode}/${isChamp ? "CHAMP" : "PART"}/${ev.event_code || 101}-${String(
          idx + 1
        ).padStart(2, "0")}`;

        list.push({
          id: certId,
          registrationId: r.id,
          swimmerName: sName,
          club: sClub,
          tournamentId: Number(ev.tournament_id || currentTournament?.id || 0),
          tournamentName: tourneyName,
          tournamentLocation: tourneyLoc,
          tournamentDate: tourneyDate,
          eventCode: ev.event_code || 101,
          eventName: evName,
          stroke: ev.stroke || "FREESTYLE",
          distance: ev.distance || "50m",
          gender: ev.gender || p.gender || "PUTRA",
          ageGroup: ev.age_group || p.age_group || "KU",
          timeResult: r.final_result_time || r.race_result_time || "",
          timeSeed: r.time_seed || r.best_time || "-",
          rank: sRank > 0 ? sRank : 99,
          isChampion: isChamp,
          rankBadge,
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

  // Theme Color Presets for Blue (Winner), Gold (Best Swimmer), and Maroon (Participant)
  const THEME_CONFIG = {
    winner: {
      key: "winner",
      bgSvgUrl: "/certificate/certificate-bg.svg",
      outerBorder: "#172237",
      bannerBg: "#172238",
      bannerGradient: "linear-gradient(90deg, #131b2c 0%, #1d2940 55%, #172237 100%)",
      bannerText: "#e5b74b",
      bannerSubText: "#fae89f",
      bannerLogoGrad: ["#fffdf2", "#fae89f", "#caa048"],
      ribbonBg: "#172237",
      ribbonGradient: "linear-gradient(180deg, #131b2c 0%, #1d2940 45%, #172237 100%)",
      stripeColor: "#172237",
      stripeGoldStart: "#b8860b",
      stripeGoldMid: "#eed87e",
      stripeGoldEnd: "#caa048",
      titleColor: "#172237",
      categoryColor: "#1d2940",
      wavePrimary: "#172237",
      wavePrimaryMid: "#1d2940",
      waveGold: "#d4a72c",
      waveGoldLight: "#eed87e",
      waveGoldDeep: "#b8860b",
      goldAccentLine: "linear-gradient(90deg, #b8860b 0%, #eed87e 50%, #d4a72c 100%)",
      numeralGrad: ["#fffdf0", "#eed87e", "#f5c94c", "#d4a72c", "#996515"],
      numeralStroke: "#a16207",
      titleCategory: "OF CHAMPION",
    },
    best_swimmer: {
      key: "best_swimmer",
      bgSvgUrl: "/certificate/certificate-bg-gold.svg",
      outerBorder: "#ca8a04",
      bannerBg: "#b48306",
      bannerGradient: "linear-gradient(90deg, #946804 0%, #ca8a04 35%, #eab308 55%, #facc15 65%, #ca8a04 85%, #946804 100%)",
      bannerText: "#ffffff",
      bannerSubText: "#fef9c3",
      bannerLogoGrad: ["#ffffff", "#fef08a", "#fde047"],
      ribbonBg: "#b48306",
      ribbonGradient: "linear-gradient(180deg, #946804 0%, #ca8a04 50%, #eab308 100%)",
      stripeColor: "#ca8a04",
      stripeGoldStart: "#facc15",
      stripeGoldMid: "#ffffff",
      stripeGoldEnd: "#ca8a04",
      titleColor: "#6b4902",
      categoryColor: "#9e6d03",
      wavePrimary: "#ca8a04",
      wavePrimaryMid: "#eab308",
      waveGold: "#facc15",
      waveGoldLight: "#fef08a",
      waveGoldDeep: "#946804",
      goldAccentLine: "linear-gradient(90deg, #ca8a04 0%, #fef08a 50%, #eab308 100%)",
      numeralGrad: ["#ffffff", "#fef08a", "#fde047", "#facc15", "#ca8a04"],
      numeralStroke: "#946804",
      titleCategory: "OF BEST SWIMMER",
    },
    participant: {
      key: "participant",
      bgSvgUrl: "/certificate/certificate-bg-maroon.svg",
      outerBorder: "#580818",
      bannerBg: "#580818",
      bannerGradient: "linear-gradient(90deg, #420511 0%, #6e0e22 55%, #580818 100%)",
      bannerText: "#fffdf2",
      bannerSubText: "#fae89f",
      bannerLogoGrad: ["#fffdf2", "#fae89f", "#d4af37"],
      ribbonBg: "#580818",
      ribbonGradient: "linear-gradient(180deg, #420511 0%, #6e0e22 45%, #580818 100%)",
      stripeColor: "#580818",
      stripeGoldStart: "#c59b27",
      stripeGoldMid: "#fae89f",
      stripeGoldEnd: "#d4af37",
      titleColor: "#420511",
      categoryColor: "#580818",
      wavePrimary: "#580818",
      wavePrimaryMid: "#6e0e22",
      waveGold: "#c59b27",
      waveGoldLight: "#fae89f",
      waveGoldDeep: "#420511",
      goldAccentLine: "linear-gradient(90deg, #580818 0%, #d4af37 50%, #580818 100%)",
      numeralGrad: ["#fffdf0", "#fae89f", "#d4af37", "#a6192e", "#580818"],
      numeralStroke: "#580818",
      titleCategory: "OF PARTICIPANT",
    },
  };

  // Compute active template type (winner, best_swimmer, or participant)
  const activeTemplateType = useMemo(() => {
    if (selectedTemplateMode) {
      return selectedTemplateMode;
    }
    return activeCertificate?.isChampion ? "winner" : "participant";
  }, [selectedTemplateMode, activeCertificate]);

  const currentTheme = THEME_CONFIG[activeTemplateType] || THEME_CONFIG.winner;
  const certCategoryTitle = currentTheme.titleCategory;

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
                        ? "bg-[#142236] text-white shadow-sm ring-2 ring-[#142236]/40 font-extrabold"
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
                        ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 font-black shadow-md ring-2 ring-yellow-400/80"
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
                        ? "bg-[#580818] text-white font-black shadow-sm ring-2 ring-[#580818]/60"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>🎖️</span>
                    <span>Merah (Participant)</span>
                  </button>
                </div>
              </div>

              {/* THE OFFICIAL CERTIFICATE SHEET (590x834 FIXED INTERNAL CANVAS WITH RESPONSIVE SCALING) */}
              <div className="bg-slate-200/60 p-3 sm:p-6 rounded-3xl border border-slate-200 shadow-inner flex justify-center print:bg-transparent print:p-0 print:border-none">
                <div
                  ref={viewportRef}
                  className="certificateViewport w-full max-w-[590px] mx-auto flex justify-center overflow-visible print:w-full print:max-w-none print:overflow-visible"
                >
                  <div
                    className="certificateScaleWrapper"
                    style={{
                      width: `${590 * canvasScale}px`,
                      height: `${834 * canvasScale}px`,
                      position: "relative",
                      margin: "0 auto",
                    }}
                  >
                    <div
                      ref={printAreaRef}
                      id="certificate-print-area"
                      className="certificateCanvas select-none"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: "590px",
                        height: "834px",
                        overflow: "hidden",
                        background: "#f8f5ee",
                        transformOrigin: "top left",
                        transform: `scale(${canvasScale})`,
                        boxShadow: "0 20px 50px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.12)",
                      }}
                    >
                      {/* 1. MASTER BACKGROUND SVG (DYNAMICALLY ADAPTED BY SELECTED THEME: BLUE, GOLD, MAROON) */}
                      <img
                        src={currentTheme.bgSvgUrl || "/certificate/certificate-bg.svg"}
                        alt="Certificate Background"
                        className="absolute inset-0 w-full h-full pointer-events-none select-none"
                        style={{ zIndex: 0 }}
                      />

                      {/* 2. OPTIONAL WATERMARK LAYER (WHEN ENABLED, Z-INDEX: 5) */}
                      {config.enabled && (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: "590px",
                            height: "834px",
                            zIndex: 5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "none",
                            opacity: config.opacity || 0.12,
                          }}
                        >
                          {(config.type === "both" || config.type === "logo") && config.logoUrl && (
                            <img
                              src={config.logoUrl}
                              alt="Watermark"
                              style={{ width: "160px", height: "160px", objectFit: "contain" }}
                            />
                          )}
                          {(config.type === "both" || config.type === "text") && config.text && (
                            <div
                              style={{
                                position: "absolute",
                                fontSize: "20px",
                                fontWeight: 900,
                                textTransform: "uppercase",
                                color: "#94a3b8",
                                transform: "rotate(-45deg)",
                                letterSpacing: "4px",
                                userSelect: "none",
                              }}
                            >
                              {config.text}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. DOCUMENT NUMBER (DYNAMIC, TOP-CENTERED, Z-INDEX: 10) */}
                      <div
                        style={{
                          position: "absolute",
                          left: "140px",
                          top: "42px",
                          width: "240px",
                          textAlign: "center",
                          fontSize: "7px",
                          fontWeight: 600,
                          letterSpacing: "1.4px",
                          color: "#364153",
                          fontFamily: "monospace",
                          zIndex: 10,
                          pointerEvents: "none",
                        }}
                      >
                        {getScreenshotDocNumber(activeCertificate)}
                      </div>

                      {/* 4. ORGANIZATION HEADER (CLEAN DARK NAVY BAND, INTEGRATED, Z-INDEX: 10) */}
                      <div
                        style={{
                          position: "absolute",
                          left: "45px",
                          top: "72px",
                          width: "380px",
                          height: "42px",
                          background: currentTheme.bannerBg || "#172238",
                          borderRadius: 0,
                          boxShadow: "none",
                          zIndex: 10,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {/* Logo: left approx 18px */}
                        <div
                          style={{
                            position: "absolute",
                            left: "18px",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            <defs>
                              <linearGradient id="topBannerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={currentTheme.bannerLogoGrad[0]} />
                                <stop offset="50%" stopColor={currentTheme.bannerLogoGrad[1]} />
                                <stop offset="100%" stopColor={currentTheme.bannerLogoGrad[2]} />
                              </linearGradient>
                            </defs>
                            <path d="M 50 16 L 76 33 L 76 43 L 50 26 L 24 43 L 24 33 Z" fill="url(#topBannerLogoGrad)" />
                            <path d="M 50 31 L 70 44 L 70 54 L 50 41 L 30 54 L 30 44 Z" fill="url(#topBannerLogoGrad)" />
                            <path d="M 50 46 L 70 59 L 70 69 L 50 56 L 30 69 L 30 59 Z" fill="url(#topBannerLogoGrad)" />
                            <path d="M 50 61 L 64 71 L 50 82 L 36 71 Z" fill="url(#topBannerLogoGrad)" />
                          </svg>
                        </div>

                        {/* Org Text: left approx 48px */}
                        <div style={{ position: "absolute", left: "48px", textAlign: "left", lineHeight: 1.15 }}>
                          <div
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: "1.2px",
                              color: currentTheme.bannerText,
                            }}
                          >
                            MODERN AQUATIC
                          </div>
                          <div
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "1px",
                              color: currentTheme.bannerSubText,
                            }}
                          >
                            SWIMMING CLUB
                          </div>
                        </div>
                      </div>

                      {/* 5. MAIN TITLE (CERTIFICATE, CONDENSED, Z-INDEX: 10) */}
                      <div
                        style={{
                          position: "absolute",
                          left: "73px",
                          top: "150px",
                          fontFamily: "'Oswald', 'Roboto Condensed', 'Arial Narrow', sans-serif",
                          fontSize: "31.5px",
                          fontWeight: 700,
                          lineHeight: 0.95,
                          letterSpacing: "0.5px",
                          color: "#263047",
                          textTransform: "uppercase",
                          zIndex: 10,
                        }}
                      >
                        CERTIFICATE
                      </div>

                      {/* 6. CATEGORY (Z-INDEX: 10) */}
                      <div
                        style={{
                          position: "absolute",
                          left: "73px",
                          top: "188px",
                          fontSize: "9px",
                          fontWeight: 600,
                          letterSpacing: "2px",
                          color: "#263047",
                          textTransform: "uppercase",
                          zIndex: 10,
                        }}
                      >
                        {certCategoryTitle}
                      </div>

                      {/* 7. GOLD UNDERLINE (Z-INDEX: 10) */}
                      <div
                        style={{
                          position: "absolute",
                          left: "73px",
                          top: "206px",
                          width: "120px",
                          height: "2px",
                          background: "#d6a81f",
                          zIndex: 10,
                        }}
                      />

                      {/* 8. RANK NUMBER (MOVED 7PX RIGHT TO 347PX, DYNAMIC, Z-INDEX: 15) */}
                      {activeCertificate.isChampion && (
                        <div
                          style={{
                            position: "absolute",
                            left: "347px",
                            top: "148px",
                            width: "55px",
                            textAlign: "center",
                            zIndex: 15,
                            pointerEvents: "none",
                            filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.18))",
                          }}
                        >
                          <svg viewBox="0 0 55 64" className="w-[55px] h-[64px]">
                            <defs>
                              <linearGradient id="rankGoldNumGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                                <stop offset="0%" stopColor="#fffdf0" />
                                <stop offset="25%" stopColor="#fae89f" />
                                <stop offset="60%" stopColor="#d4a72c" />
                                <stop offset="100%" stopColor="#996515" />
                              </linearGradient>
                            </defs>
                            <text
                              x="50%"
                              y="54"
                              textAnchor="middle"
                              fill="url(#rankGoldNumGrad)"
                              stroke={currentTheme.numeralStroke || "#a16207"}
                              strokeWidth="0.8"
                              fontFamily="'Oswald', 'Arial Narrow', sans-serif"
                              fontWeight="700"
                              fontSize="56"
                            >
                              {activeCertificate.rank && activeCertificate.rank <= 3 ? activeCertificate.rank : 1}
                            </text>
                          </svg>
                        </div>
                      )}

                      {/* 9. MEDAL (ROSETTE, INTEGRATED SOFT SHADOW, Z-INDEX: 30) */}
                      <div
                        style={{
                          position: "absolute",
                          left: "445px",
                          top: "175px",
                          width: "74px",
                          height: "74px",
                          zIndex: 30,
                          pointerEvents: "none",
                          filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.22)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.12))",
                        }}
                      >
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          <defs>
                            <radialGradient id="medallionSunburst" cx="38%" cy="32%" r="68%">
                              <stop offset="0%" stopColor="#fffdf2" />
                              <stop offset="22%" stopColor="#fae896" />
                              <stop offset="52%" stopColor="#e5b73e" />
                              <stop offset="82%" stopColor="#b8860b" />
                              <stop offset="100%" stopColor="#8c5e07" />
                            </radialGradient>
                            <linearGradient id="medallionRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#fffdf0" />
                              <stop offset="20%" stopColor="#fae89f" />
                              <stop offset="50%" stopColor="#e5b74b" />
                              <stop offset="80%" stopColor="#ca8a04" />
                              <stop offset="100%" stopColor="#996515" />
                            </linearGradient>
                          </defs>

                          {/* 16-Scallop Rosette Fluted Outer Medallion Border */}
                          <path
                            d="M 94.50 50.00 Q 98.25 59.60 91.11 67.03 Q 90.91 77.33 81.47 81.47 Q 77.33 90.91 67.03 91.11 Q 59.60 98.25 50.00 94.50 Q 40.40 98.25 32.97 91.11 Q 22.67 90.91 18.53 81.47 Q 9.09 77.33 8.89 67.03 Q 1.75 59.60 5.50 50.00 Q 1.75 40.40 8.89 32.97 Q 9.09 22.67 18.53 18.53 Q 22.67 9.09 32.97 8.89 Q 40.40 1.75 50.00 5.50 Q 59.60 1.75 67.03 8.89 Q 77.33 9.09 81.47 18.53 Q 90.91 22.67 91.11 32.97 Q 98.25 40.40 94.50 50.00 Z"
                            fill="url(#medallionRimGrad)"
                            stroke="#b8860b"
                            strokeWidth="0.8"
                          />

                          {/* Inner Scallop Shadow Ring */}
                          <circle cx="50" cy="50" r="42.5" fill="url(#medallionRimGrad)" stroke="#a16207" strokeWidth="0.6" />

                          {/* Polished Inner Ring Ridge */}
                          <circle cx="50" cy="50" r="39.5" fill="none" stroke="#fffdf2" strokeWidth="1.2" strokeOpacity="0.95" />
                          <circle cx="50" cy="50" r="38" fill="none" stroke="#8c5e07" strokeWidth="0.65" strokeOpacity="0.75" />

                          {/* Center Gold Face */}
                          <circle cx="50" cy="50" r="36.5" fill="url(#medallionSunburst)" stroke="#e5b74b" strokeWidth="0.8" />
                          <circle cx="50" cy="50" r="35" fill="none" stroke="#fffdf2" strokeWidth="0.8" strokeOpacity="0.7" />

                          {/* MASC Geometric Emblem in Pure Golden Relief */}
                          <g transform="translate(50, 50) scale(0.62) translate(-50, -50)">
                            <path
                              d="M 50 16 L 76 33 L 76 43 L 50 26 L 24 43 L 24 33 Z"
                              fill="url(#medallionRimGrad)"
                              stroke="#b8860b"
                              strokeWidth="1.2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M 50 31 L 70 44 L 70 54 L 50 41 L 30 54 L 30 44 Z"
                              fill="url(#medallionRimGrad)"
                              stroke="#b8860b"
                              strokeWidth="1.2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M 50 46 L 70 59 L 70 69 L 50 56 L 30 69 L 30 59 Z"
                              fill="url(#medallionRimGrad)"
                              stroke="#b8860b"
                              strokeWidth="1.2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M 50 61 L 64 71 L 50 82 L 36 71 Z"
                              fill="url(#medallionRimGrad)"
                              stroke="#b8860b"
                              strokeWidth="1.2"
                              strokeLinejoin="round"
                            />
                          </g>
                        </svg>
                      </div>

                      {/* BODY CONTENT CONTAINER (FLEX COLUMN FOR DYNAMIC SPACING SAFETY, LEFT: 73PX, Z-INDEX: 10) */}
                      <div
                        style={{
                          position: "absolute",
                          left: "73px",
                          top: "236px",
                          width: "320px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          zIndex: 10,
                        }}
                      >
                        {/* 10. RECOGNITION TEXT (+8%, READABILITY) */}
                        <div
                          style={{
                            fontSize: "9.2px",
                            fontWeight: 600,
                            letterSpacing: "1.5px",
                            color: "#5b6b80",
                            textTransform: "uppercase",
                            lineHeight: "11px",
                          }}
                        >
                          AS A MARK OF RECOGNITION FOR
                        </div>

                        {/* 11. RECIPIENT NAME (BOLD, GAP 20PX, MAX 2 LINES) */}
                        <div
                          style={{
                            marginTop: "20px",
                            maxWidth: "310px",
                            fontSize: "16.5px",
                            fontWeight: 800,
                            lineHeight: "19px",
                            color: "#101827",
                            textTransform: "uppercase",
                          }}
                        >
                          {activeCertificate.swimmerName}
                        </div>

                        {/* 12. EVENT (+8%, GAP 13PX, MAX 2 LINES) */}
                        <div
                          style={{
                            marginTop: "13px",
                            maxWidth: "320px",
                            fontSize: "10.3px",
                            fontWeight: 600,
                            lineHeight: "14px",
                            color: "#1e293b",
                          }}
                        >
                          {formatEventRaceLine(activeCertificate)}
                        </div>

                        {/* 13. PARTICIPATION DETAILS (+10%, GAP 30PX, LINE-HEIGHT ~1.45) */}
                        <div
                          style={{
                            marginTop: "30px",
                            width: "320px",
                            fontSize: "8.8px",
                            lineHeight: "12.8px",
                            color: "#475569",
                            textTransform: "uppercase",
                          }}
                        >
                          <div style={{ marginBottom: "2px", fontWeight: 500 }}>
                            {config.bodyPreText || "FOR PARTICIPATING IN THE"}
                          </div>
                          <div style={{ fontWeight: 800, color: "#101827", marginBottom: "2px" }}>
                            {config.bodyCompetitionName || `${activeCertificate.tournamentName} ORGANIZED BY`}
                          </div>
                          <div style={{ marginBottom: "2px", fontWeight: 500 }}>
                            {config.bodyOrganizerName || config.orgName || "MODERN AQUATIC SWIMMING CLUB ( MASC )"}
                          </div>
                          <div style={{ fontWeight: 500 }}>
                            {config.bodyDateText || `IN ${activeCertificate.tournamentDate.toUpperCase()}`}
                          </div>
                        </div>

                        {/* 14. VENUE (+10%, GAP 26PX, CLEAR SEPARATION) */}
                        <div
                          style={{
                            marginTop: "26px",
                            width: "320px",
                            fontSize: "8.8px",
                            lineHeight: "12.8px",
                            textTransform: "uppercase",
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "#101827", marginBottom: "2px" }}>
                            {config.bodyVenueText || activeCertificate.tournamentLocation?.toUpperCase() || "MODERN GOLF AND COUNTRY CLUB"}
                          </div>
                          <div style={{ color: "#475569", fontWeight: 400 }}>
                            {config.bodyLocationText || config.city?.toUpperCase() || "KOTA MODERN, KOTA TANGERANG"}
                          </div>
                        </div>

                        {/* 15 & 16. QR + SIGNATORY GROUP (ONE VISUAL GROUP, GAP 42PX, STRICTLY ALIGNED LEFT 73PX) */}
                        <div
                          style={{
                            marginTop: "42px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                          }}
                        >
                          {/* QR CODE (+5% TO 50PX) */}
                          <div
                            style={{
                              width: "50px",
                              height: "50px",
                            }}
                          >
                            {qrCodeUrl ? (
                              <img
                                src={qrCodeUrl}
                                alt="QR Code"
                                style={{ width: "50px", height: "50px", objectFit: "contain", display: "block" }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "50px",
                                  height: "50px",
                                  background: "#f1f5f9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "7px",
                                  color: "#94a3b8",
                                }}
                              >
                                QR
                              </div>
                            )}
                          </div>

                          {/* SIGNATORY NAME & TITLE (QR ↓ 9PX, NAME ↓ 2.5PX TITLE) */}
                          <div style={{ marginTop: "9px" }}>
                            <div
                              style={{
                                fontSize: "8.5px",
                                fontWeight: 800,
                                lineHeight: "11px",
                                color: "#101827",
                                textTransform: "uppercase",
                              }}
                            >
                              {config.signatory1Name}
                            </div>
                            <div
                              style={{
                                fontSize: "6.7px",
                                fontWeight: 500,
                                color: "#68768a",
                                textTransform: "uppercase",
                                marginTop: "2.5px",
                                lineHeight: "9px",
                              }}
                            >
                              {config.signatory1Title}
                            </div>
                          </div>
                        </div>
                      </div>
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
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&display=swap');

        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important;
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
          .print\:hidden,
          .no-print {
            display: none !important;
          }
          /* Neutralize dashboard layout, cards, and wrappers so they have no offset or transform */
          main,
          main > div,
          .certificateViewport,
          .certificateScaleWrapper {
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
            filter: none !important;
            perspective: none !important;
            width: 100% !important;
            max-width: none !important;
          }
          body * {
            visibility: hidden;
          }
          #certificate-print-area,
          #certificate-print-area * {
            visibility: visible;
          }
          #certificate-print-area {
            position: fixed !important;
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
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            transform-origin: 0 0 !important;
            -webkit-transform-origin: 0 0 !important;
            transform: scale(1.342) !important;
            -webkit-transform: scale(1.342) !important;
            z-index: 999999 !important;
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
