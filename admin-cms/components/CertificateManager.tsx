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
  Download,
  Package,
  Layers,
  FileArchive,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { getBukuAcara, getRegistrations, uploadImage } from "../lib/api-admin";
import { toast } from "./Toast";
import { calculateEventChampions, EventGroupData, RankedSwimmer } from "../lib/champion-utils";
import QRCode from "qrcode";
import JSZip from "jszip";
import html2canvas from "html2canvas";

function formatEventTitle(name: string) {
  if (!name) return "";
  return name
    .replace(/INDIVIDUALMEDLEY/gi, "INDIVIDUAL MEDLEY")
    .replace(/FREESTYLE_FIN/gi, "FREESTYLE FIN")
    .replace(/BACKSTROKE_FIN/gi, "BACKSTROKE FINS")
    .replace(/BUTTERFLY_FIN/gi, "BUTTERFLY FINS")
    .replace(/KICKING_BOARD/gi, "KICKING BOARD")
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
    .replace(/FREESTYLE_FIN/gi, "Freestyle FIN")
    .replace(/FREESTYLE FIN/gi, "Freestyle FIN")
    .replace(/BACKSTROKE_FIN/gi, "Backstroke Fins")
    .replace(/BACKSTROKE FIN/gi, "Backstroke Fins")
    .replace(/BUTTERFLY_FIN/gi, "Butterfly Fins")
    .replace(/BUTTERFLY FIN/gi, "Butterfly Fins")
    .replace(/KICKING_BOARD/gi, "Kicking Board")
    .replace(/KICKING BOARD/gi, "Kicking Board")
    .replace(/PAPAN LUNCUR/gi, "Kicking Board")
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

function getScreenshotDocNumber(item: CertificateItem, themeKey?: string): string {
  let doc = item.docNumber;
  if (!doc || !doc.startsWith("NO.")) {
    const regNum = item.registrationId || item.rank || 25;
    const numPadded = String(regNum).padStart(2, "0");
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const typeCode = themeKey === "best_swimmer" ? "BEST" : item.isChampion ? "FSW" : "PART";
    doc = `NO. ${numPadded} / MASC / ${typeCode} / XII / ${yearShort}`;
  }
  if (themeKey === "best_swimmer") {
    doc = doc.replace(/\/CHAMP\//g, "/BEST/").replace(/\/PART\//g, "/BEST/");
  }
  return doc;
}

export function formatCertificateDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) {
    return "IN OCTOBER 1ST, 2026";
  }

  const raw = dateStr.trim();

  // If already starts with "IN "
  if (/^IN\s+/i.test(raw)) {
    return raw.toUpperCase();
  }

  const monthsEn = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];

  const getOrdinal = (n: number) => {
    const s = ["TH", "ST", "ND", "RD"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Try parsing ISO date (e.g., 2026-10-01 or 2026-10-01T...)
  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
      return `IN ${monthsEn[monthIdx]} ${getOrdinal(day)}, ${year}`;
    }
  }

  // Try parsing Indonesian/Common format (e.g. "01-10-2026" or "1 Oktober 2026")
  const idMonths: Record<string, number> = {
    januari: 0, feb: 1, februari: 1, mar: 2, maret: 2, apr: 3, april: 3,
    mei: 4, may: 4, jun: 5, juni: 5, jul: 6, juli: 6, agu: 7, agustus: 7, august: 7,
    sep: 8, september: 8, okt: 9, oktober: 9, october: 9, nov: 10, november: 10,
    des: 11, desember: 11, december: 11
  };

  const textMatch = raw.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monthKey = textMatch[2].toLowerCase();
    const year = parseInt(textMatch[3], 10);
    if (monthKey in idMonths) {
      return `IN ${monthsEn[idMonths[monthKey]]} ${getOrdinal(day)}, ${year}`;
    }
  }

  // Fallback to Date object parsing
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return `IN ${monthsEn[d.getMonth()]} ${getOrdinal(d.getDate())}, ${d.getFullYear()}`;
  }

  return `IN ${raw.toUpperCase()}`;
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
  isBestSwimmer?: boolean;
  certificateType?: "winner" | "best_swimmer" | "participant";
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
  timeLabel?: string;
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
  bodyDateText: "",
  bodyVenueText: "MODERN GOLF AND COUNTRY CLUB",
  bodyLocationText: "KOTA MODERN, KOTA TANGERANG",
  useCustomBodyText: false,
  timeLabel: "OFFICIAL TIME:",
};

export const THEME_CONFIG = {
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

export function resolveCertificateType(
  cert?: CertificateItem | null,
  certTypeOverrides?: Record<string | number, "winner" | "best_swimmer" | "participant">,
  bestSwimmerSet?: Set<string | number>
): "winner" | "best_swimmer" | "participant" {
  if (!cert) return "winner";

  // 1. Explicit admin override for this certificate ID or registration ID
  if (certTypeOverrides && certTypeOverrides[cert.id]) {
    return certTypeOverrides[cert.id];
  }
  if (cert.registrationId && certTypeOverrides && certTypeOverrides[cert.registrationId]) {
    return certTypeOverrides[cert.registrationId];
  }

  // 2. Best Swimmer set (manually tagged or auto-detected by top medals)
  if (bestSwimmerSet) {
    if (bestSwimmerSet.has(cert.id) || (cert.registrationId && bestSwimmerSet.has(cert.registrationId))) {
      return "best_swimmer";
    }
    const cleanName = (cert.swimmerName || "").trim().toUpperCase();
    if (bestSwimmerSet.has(cleanName)) {
      return "best_swimmer";
    }
  }

  // 3. Explicit property on certificate
  if (cert.isBestSwimmer || cert.certificateType === "best_swimmer") {
    return "best_swimmer";
  }

  // 4. Text indicators in eventName, rankBadge, or docNumber
  const txt = `${cert.eventName || ""} ${cert.rankBadge || ""} ${cert.docNumber || ""}`.toLowerCase();
  if (txt.includes("best swimmer") || txt.includes("perenang terbaik") || txt.includes("best_swimmer")) {
    return "best_swimmer";
  }

  // 5. Winner / Champion (Juara 1, 2, 3 or Juara Group) -> Biru
  if (cert.isChampion) {
    return "winner";
  }

  // 6. Regular Participant -> Merah
  return "participant";
}

export function getCertificateTheme(
  cert?: CertificateItem | null,
  overrideMode?: "winner" | "best_swimmer" | "participant" | null,
  certTypeOverrides?: Record<string | number, "winner" | "best_swimmer" | "participant">,
  bestSwimmerSet?: Set<string | number>
) {
  if (overrideMode) {
    return THEME_CONFIG[overrideMode] || THEME_CONFIG.winner;
  }
  const type = resolveCertificateType(cert, certTypeOverrides, bestSwimmerSet);
  return THEME_CONFIG[type] || THEME_CONFIG.winner;
}

export async function generateQrDataUrl(docNumberOrId: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_LANDING_URL || "https://masc.fourplusone.my.id";
  const targetUrl = `${baseUrl}/#status-check?code=${encodeURIComponent(docNumberOrId)}`;
  try {
    return await QRCode.toDataURL(targetUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });
  } catch {
    return "";
  }
}

export interface CertificateCanvasProps {
  cert: CertificateItem;
  theme: (typeof THEME_CONFIG)["winner"];
  config: WatermarkConfig;
  qrCodeUrl?: string;
  scale?: number;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const CertificateCanvas = React.forwardRef<HTMLDivElement, CertificateCanvasProps>(
  function CertificateCanvas(
    { cert, theme, config, qrCodeUrl, scale = 1, id, className = "", style = {} },
    ref
  ) {
    const idPrefix = String(cert.id || "c").replace(/[^a-zA-Z0-9]/g, "_");
    const bannerLogoGradId = `topBannerLogoGrad_${idPrefix}`;
    const rankGoldNumGradId = `rankGoldNumGrad_${idPrefix}`;
    const medallionSunburstId = `medallionSunburst_${idPrefix}`;
    const medallionRimGradId = `medallionRimGrad_${idPrefix}`;

    const certCategoryTitle = theme.titleCategory;

    return (
      <div
        ref={ref}
        id={id}
        className={`certificateCanvas select-none ${className}`}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "590px",
          height: "834px",
          overflow: "hidden",
          background: "#f8f5ee",
          transformOrigin: "top left",
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          boxShadow: scale === 1 ? undefined : "0 20px 50px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.12)",
          ...style,
        }}
      >
        {/* 1. MASTER BACKGROUND SVG (DYNAMICALLY ADAPTED BY SELECTED THEME: BLUE, GOLD, MAROON) */}
        <img
          src={theme.bgSvgUrl || "/certificate/certificate-bg.svg"}
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
          {getScreenshotDocNumber(cert, theme.key)}
        </div>

        {/* 4. ORGANIZATION HEADER (CLEAN DARK NAVY BAND, INTEGRATED, Z-INDEX: 10) */}
        <div
          style={{
            position: "absolute",
            left: "45px",
            top: "72px",
            width: "380px",
            height: "42px",
            background: theme.bannerBg || "#172238",
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
                <linearGradient id={bannerLogoGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={theme.bannerLogoGrad[0]} />
                  <stop offset="50%" stopColor={theme.bannerLogoGrad[1]} />
                  <stop offset="100%" stopColor={theme.bannerLogoGrad[2]} />
                </linearGradient>
              </defs>
              <path d="M 50 16 L 76 33 L 76 43 L 50 26 L 24 43 L 24 33 Z" fill={`url(#${bannerLogoGradId})`} />
              <path d="M 50 31 L 70 44 L 70 54 L 50 41 L 30 54 L 30 44 Z" fill={`url(#${bannerLogoGradId})`} />
              <path d="M 50 46 L 70 59 L 70 69 L 50 56 L 30 69 L 30 59 Z" fill={`url(#${bannerLogoGradId})`} />
              <path d="M 50 61 L 64 71 L 50 82 L 36 71 Z" fill={`url(#${bannerLogoGradId})`} />
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
                color: theme.bannerText,
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
                color: theme.bannerSubText,
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
        {cert.isChampion && (
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
                <linearGradient id={rankGoldNumGradId} x1="20%" y1="0%" x2="80%" y2="100%">
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
                fill={`url(#${rankGoldNumGradId})`}
                stroke={theme.numeralStroke || "#a16207"}
                strokeWidth="0.8"
                fontFamily="'Oswald', 'Arial Narrow', sans-serif"
                fontWeight="700"
                fontSize="56"
              >
                {cert.rank && cert.rank <= 3 ? cert.rank : 1}
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
              <radialGradient id={medallionSunburstId} cx="38%" cy="32%" r="68%">
                <stop offset="0%" stopColor="#fffdf2" />
                <stop offset="22%" stopColor="#fae896" />
                <stop offset="52%" stopColor="#e5b73e" />
                <stop offset="82%" stopColor="#b8860b" />
                <stop offset="100%" stopColor="#8c5e07" />
              </radialGradient>
              <linearGradient id={medallionRimGradId} x1="0%" y1="0%" x2="100%" y2="100%">
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
              fill={`url(#${medallionRimGradId})`}
              stroke="#b8860b"
              strokeWidth="0.8"
            />

            {/* Inner Scallop Shadow Ring */}
            <circle cx="50" cy="50" r="42.5" fill={`url(#${medallionRimGradId})`} stroke="#a16207" strokeWidth="0.6" />

            {/* Polished Inner Ring Ridge */}
            <circle cx="50" cy="50" r="39.5" fill="none" stroke="#fffdf2" strokeWidth="1.2" strokeOpacity="0.95" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#8c5e07" strokeWidth="0.65" strokeOpacity="0.75" />

            {/* Center Gold Face */}
            <circle cx="50" cy="50" r="36.5" fill={`url(#${medallionSunburstId})`} stroke="#e5b74b" strokeWidth="0.8" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="#fffdf2" strokeWidth="0.8" strokeOpacity="0.7" />

            {/* MASC Geometric Emblem in Pure Golden Relief */}
            <g transform="translate(50, 50) scale(0.62) translate(-50, -50)">
              <path
                d="M 50 16 L 76 33 L 76 43 L 50 26 L 24 43 L 24 33 Z"
                fill={`url(#${medallionRimGradId})`}
                stroke="#b8860b"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M 50 31 L 70 44 L 70 54 L 50 41 L 30 54 L 30 44 Z"
                fill={`url(#${medallionRimGradId})`}
                stroke="#b8860b"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M 50 46 L 70 59 L 70 69 L 50 56 L 30 69 L 30 59 Z"
                fill={`url(#${medallionRimGradId})`}
                stroke="#b8860b"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M 50 61 L 64 71 L 50 82 L 36 71 Z"
                fill={`url(#${medallionRimGradId})`}
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
            {cert.swimmerName}
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
            {formatEventRaceLine(cert)}
          </div>

          {/* 12b. OFFICIAL TIME RESULT (WAKTU RESMI) */}
          {Boolean(
            cert.timeResult &&
              cert.timeResult.trim() !== "" &&
              cert.timeResult !== "-" &&
              !/^0+(\.0+)*$/.test(cert.timeResult)
          ) && (
            <div
              style={{
                marginTop: "7px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "9.5px",
                letterSpacing: "0.8px",
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: "#475569", fontWeight: 700 }}>
                {config.timeLabel || "OFFICIAL TIME:"}
              </span>
              <span
                style={{
                  fontFamily: "'Oswald', 'Roboto Condensed', 'Courier New', monospace",
                  fontWeight: 700,
                  fontSize: "11px",
                  color: "#0f766e",
                  letterSpacing: "0.5px",
                }}
              >
                {cert.timeResult}
              </span>
            </div>
          )}

          {/* 13. PARTICIPATION DETAILS (+10%, GAP 30PX, LINE-HEIGHT ~1.45) */}
          <div
            style={{
              marginTop: Boolean(
                cert.timeResult &&
                  cert.timeResult.trim() !== "" &&
                  cert.timeResult !== "-" &&
                  !/^0+(\.0+)*$/.test(cert.timeResult)
              )
                ? "20px"
                : "30px",
              width: "320px",
              fontSize: "8.8px",
              lineHeight: "12.8px",
              color: "#475569",
              textTransform: "uppercase",
            }}
          >
            <div style={{ marginBottom: "2px", fontWeight: 500 }}>
              {(config.useCustomBodyText && config.bodyPreText) || "FOR PARTICIPATING IN THE"}
            </div>
            <div style={{ fontWeight: 800, color: "#101827", marginBottom: "2px" }}>
              {(config.useCustomBodyText && config.bodyCompetitionName) || `${cert.tournamentName} ORGANIZED BY`}
            </div>
            <div style={{ marginBottom: "2px", fontWeight: 500 }}>
              {(config.useCustomBodyText && config.bodyOrganizerName) || config.orgName || "MODERN AQUATIC SWIMMING CLUB ( MASC )"}
            </div>
            <div style={{ fontWeight: 500 }}>
              {(config.useCustomBodyText && config.bodyDateText) || formatCertificateDate(cert.tournamentDate || cert.issueDate)}
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
              {(config.useCustomBodyText && config.bodyVenueText) || cert.tournamentLocation?.toUpperCase() || "MODERN GOLF AND COUNTRY CLUB"}
            </div>
            <div style={{ color: "#475569", fontWeight: 400 }}>
              {(config.useCustomBodyText && config.bodyLocationText) || config.city?.toUpperCase() || "KOTA MODERN, KOTA TANGERANG"}
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
    );
  }
);

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
  const [categoryFilter, setCategoryFilter] = useState<"all" | "champion" | "best_swimmer" | "participant">("all");
  const [selectedCertId, setSelectedCertId] = useState<string | number>("");

  // Per-certificate/swimmer manual type overrides (winner, best_swimmer, participant)
  const [certTypeOverrides, setCertTypeOverrides] = useState<
    Record<string | number, "winner" | "best_swimmer" | "participant">
  >({});

  // Best Swimmers set (automatically detected from top gold medals or marked by admin)
  const [bestSwimmerSet, setBestSwimmerSet] = useState<Set<string | number>>(new Set());

  // Template Color Mode Preview & QR Code
  const [selectedTemplateMode, setSelectedTemplateMode] = useState<
    "winner" | "best_swimmer" | "participant" | null
  >(null);
  const [overrideTournamentText, setOverrideTournamentText] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  // Config modal state & persistent settings
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_CONFIG);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Batch Download & Multi-page print state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [isPreparingBatchPrint, setIsPreparingBatchPrint] = useState(false);
  const [batchQrMap, setBatchQrMap] = useState<Record<string | number, string>>({});
  const [batchProgress, setBatchProgress] = useState<{
    active: boolean;
    current: number;
    total: number;
    swimmerName: string;
    status: "idle" | "preparing" | "rendering" | "zipping" | "done" | "error";
  }>({
    active: false,
    current: 0,
    total: 0,
    swimmerName: "",
    status: "idle",
  });
  const cancelBatchRef = useRef<boolean>(false);
  const hiddenRenderRef = useRef<HTMLDivElement>(null);
  const [hiddenCertData, setHiddenCertData] = useState<{
    cert: CertificateItem;
    qrUrl: string;
    theme: (typeof THEME_CONFIG)["winner"];
  } | null>(null);

  // Reset batch print mode on afterprint
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsBatchPrinting(false);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

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
        if (
          parsed.bodyDateText === "IN OCTOBER 17TH, 2026" ||
          parsed.bodyDateText === "IN DECEMBER 13TH, 2025"
        ) {
          parsed.bodyDateText = "";
        }
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
          if (r.is_active === false || (r.participant && r.participant.is_active === false)) {
            return false;
          }
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
    const tourneyDate = currentTournament?.event_start_date || "2026-10-01";
    const year = new Date().getFullYear();
    const tourneyCode = `AI-TGR-${year}`;

    // Process from EventGroups (Buku Acara)
    if (eventGroups.length > 0) {
      eventGroups.forEach((ev) => {
        const champ = calculateEventChampions(ev);
        const eventDate = ev.schedule_date || tourneyDate;

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
                tournamentDate: eventDate,
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
                issueDate: eventDate,
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
              tournamentDate: eventDate,
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
              issueDate: eventDate,
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
        const eventDate = ev.schedule_date || tourneyDate;
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
          tournamentDate: eventDate,
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
          issueDate: eventDate,
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

  // Auto-detect Best Swimmers across events in this tournament
  useEffect(() => {
    if (certificates.length > 0) {
      const detected = new Set<string | number>();

      // 1. Any cert with explicit "best swimmer" in eventName, rankBadge, or docNumber
      certificates.forEach((c) => {
        const text = `${c.eventName || ""} ${c.rankBadge || ""} ${c.docNumber || ""}`.toLowerCase();
        if (text.includes("best swimmer") || text.includes("perenang terbaik") || text.includes("best_swimmer")) {
          detected.add(c.id);
          detected.add((c.swimmerName || "").trim().toUpperCase());
        }
      });

      // 2. Identify top gold medalists per (Age Group + Gender)
      const groups: Record<string, Record<string, { count: number; ids: (string | number)[] }>> = {};
      certificates.forEach((c) => {
        if (!c.isChampion || c.rank !== 1) return;
        const groupKey = `${(c.ageGroup || "KU").toUpperCase()}__${(c.gender || "ALL").toUpperCase()}`;
        const sName = (c.swimmerName || "").trim().toUpperCase();
        if (!groups[groupKey]) groups[groupKey] = {};
        if (!groups[groupKey][sName]) groups[groupKey][sName] = { count: 0, ids: [] };
        groups[groupKey][sName].count += 1;
        groups[groupKey][sName].ids.push(c.id);
      });

      Object.values(groups).forEach((groupSwimmers) => {
        let bestName = "";
        let maxGolds = 0;
        Object.entries(groupSwimmers).forEach(([name, data]) => {
          if (data.count > maxGolds) {
            maxGolds = data.count;
            bestName = name;
          }
        });
        if (bestName && maxGolds >= 2) {
          detected.add(bestName);
          groupSwimmers[bestName].ids.forEach((id) => detected.add(id));
        }
      });

      setBestSwimmerSet(detected);
    }
  }, [certificates]);

  // 5. Filtered list based on Search & Category
  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      const type = resolveCertificateType(c, certTypeOverrides, bestSwimmerSet);

      // Category filter
      if (categoryFilter === "champion" && type !== "winner") return false;
      if (categoryFilter === "best_swimmer" && type !== "best_swimmer") return false;
      if (categoryFilter === "participant" && type !== "participant") return false;

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
  }, [certificates, categoryFilter, searchQuery, certTypeOverrides, bestSwimmerSet]);

  const activeCertificate = useMemo(() => {
    return certificates.find((c) => c.id === selectedCertId) || certificates[0] || null;
  }, [certificates, selectedCertId]);

  // Certificates to render in print portal (active certificate for single print, or full filtered list for batch print)
  const printCertificates = useMemo(() => {
    if (isBatchPrinting) {
      return filteredCertificates;
    }
    return activeCertificate ? [activeCertificate] : [];
  }, [isBatchPrinting, filteredCertificates, activeCertificate]);

  // Compute active template type (winner -> biru, best_swimmer -> emas, participant -> merah)
  const activeTemplateType = useMemo(() => {
    if (selectedTemplateMode) {
      return selectedTemplateMode;
    }
    return resolveCertificateType(activeCertificate, certTypeOverrides, bestSwimmerSet);
  }, [selectedTemplateMode, activeCertificate, certTypeOverrides, bestSwimmerSet]);

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

  // 6. Download single active certificate as high-resolution PNG
  const handleDownloadCurrentPng = async () => {
    if (!activeCertificate || !printAreaRef.current) return;
    try {
      toast.info("Sedang mengenerate file PNG sertifikat...");
      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f8f5ee",
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      const safeName = activeCertificate.swimmerName.replace(/[/\\?%*:|"<>]/g, "_").trim();
      a.download = `Sertifikat_${safeName}_${activeCertificate.eventCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Sertifikat PNG berhasil diunduh!");
    } catch (err: any) {
      toast.error("Gagal mengunduh PNG: " + err.message);
    }
  };

  // 7. Start Batch ZIP Download (Direct all certificates into 1 ZIP file)
  const startBatchZipDownload = async () => {
    if (filteredCertificates.length === 0) {
      toast.error("Tidak ada data peserta untuk diunduh!");
      return;
    }

    cancelBatchRef.current = false;
    const total = filteredCertificates.length;
    setBatchProgress({
      active: true,
      current: 0,
      total,
      swimmerName: "Menyiapkan antrean gambar...",
      status: "preparing",
    });

    try {
      const zip = new JSZip();

      for (let i = 0; i < total; i++) {
        if (cancelBatchRef.current) {
          toast.info("Download ZIP dibatalkan oleh pengguna.");
          setBatchProgress((prev) => ({ ...prev, active: false, status: "idle" }));
          setHiddenCertData(null);
          return;
        }

        const cert = filteredCertificates[i];
        const certType = resolveCertificateType(cert, certTypeOverrides, bestSwimmerSet);
        const theme = THEME_CONFIG[certType];

        setBatchProgress({
          active: true,
          current: i + 1,
          total,
          swimmerName: `${cert.swimmerName} (${theme.titleCategory})`,
          status: "rendering",
        });

        try {
          // 1. Get or generate QR code
          let qrUrl = batchQrMap[cert.id];
          if (!qrUrl) {
            qrUrl = await generateQrDataUrl(getScreenshotDocNumber(cert, certType));
            setBatchQrMap((prev) => ({ ...prev, [cert.id]: qrUrl }));
          }

          // 2. Render to offscreen canvas with specific theme for this participant
          setHiddenCertData({ cert, qrUrl, theme });
          
          // Allow DOM to mount and paint
          await new Promise((resolve) => setTimeout(resolve, 80));

          if (!hiddenRenderRef.current) {
            continue;
          }

          // Wait for all images in the canvas to be fully decoded
          const imgs = Array.from(hiddenRenderRef.current.querySelectorAll("img"));
          await Promise.all(
            imgs.map((img) => {
              if (img.complete && img.naturalWidth > 0) return Promise.resolve();
              return new Promise<void>((res) => {
                img.onload = () => res();
                img.onerror = () => res();
                setTimeout(res, 200);
              });
            })
          );

          // 3. Capture with html2canvas
          const canvas = await html2canvas(hiddenRenderRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#f8f5ee",
            logging: false,
            width: 590,
            height: 834,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 590,
            windowHeight: 834,
          });

          // 4. Convert canvas to Blob
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/png")
          );

          if (blob) {
            const safeName = cert.swimmerName.replace(/[/\\?%*:|"<>]/g, "_").trim();
            const safeEvent = (cert.eventName || "Lomba").replace(/[/\\?%*:|"<>]/g, "_").trim();
            let rankTag = "Peserta";
            if (certType === "best_swimmer") {
              rankTag = "Best_Swimmer";
            } else if (certType === "winner") {
              rankTag = cert.rank && cert.rank <= 3 ? `Juara_${cert.rank}` : "Juara";
            }
            const fileName = `${String(i + 1).padStart(3, "0")}_${rankTag}_${safeName}_${safeEvent}.png`;
            zip.file(fileName, blob);
          }
        } catch (itemErr: any) {
          console.error(`Error rendering cert for ${cert.swimmerName}:`, itemErr);
        }
      }

      if (cancelBatchRef.current) {
        toast.info("Download ZIP dibatalkan oleh pengguna.");
        setBatchProgress((prev) => ({ ...prev, active: false, status: "idle" }));
        setHiddenCertData(null);
        return;
      }

      const fileCount = Object.keys(zip.files).length;
      if (fileCount === 0) {
        throw new Error("Tidak ada file sertifikat yang berhasil digenerate.");
      }

      setBatchProgress((prev) => ({
        ...prev,
        status: "zipping",
        swimmerName: `Mengompresi ${fileCount} sertifikat ke file ZIP...`,
      }));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const tourneyName = (currentTournament?.name || "Turnamen").replace(/[/\\?%*:|"<>]/g, "_");
      a.download = `Sertifikat_${tourneyName}_Total_${fileCount}_Peserta.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setBatchProgress((prev) => ({
        ...prev,
        status: "done",
        swimmerName: `Selesai! ${fileCount} sertifikat berhasil diunduh.`,
      }));
      toast.success(`Berhasil mengunduh ${fileCount} sertifikat peserta dalam file ZIP!`);
      setTimeout(() => {
        setBatchProgress((prev) => ({ ...prev, active: false, status: "idle" }));
        setShowBatchModal(false);
      }, 1500);
    } catch (err: any) {
      console.error("Error generating batch ZIP:", err);
      toast.error("Gagal mengunduh ZIP: " + (err.message || String(err)));
      setBatchProgress((prev) => ({
        ...prev,
        status: "error",
        swimmerName: "Gagal: " + (err.message || "Terjadi kesalahan saat memproses gambar"),
      }));
    } finally {
      setHiddenCertData(null);
    }
  };

  // 8. Cancel running batch download
  const handleCancelBatchZip = () => {
    cancelBatchRef.current = true;
    toast.info("Membatalkan proses download...");
  };

  // 9. Trigger batch multi-page print (Browser Print -> Save as Multi-page PDF)
  const handleBatchPrint = async () => {
    if (filteredCertificates.length === 0) return;
    setIsPreparingBatchPrint(true);
    toast.info(`Menyiapkan ${filteredCertificates.length} halaman sertifikat untuk dicetak...`);
    try {
      const qrMap: Record<string | number, string> = {};
      for (const cert of filteredCertificates) {
        if (!batchQrMap[cert.id]) {
          const certType = resolveCertificateType(cert, certTypeOverrides, bestSwimmerSet);
          const docNum = getScreenshotDocNumber(cert, certType);
          qrMap[cert.id] = await generateQrDataUrl(docNum);
        } else {
          qrMap[cert.id] = batchQrMap[cert.id];
        }
      }
      setBatchQrMap((prev) => ({ ...prev, ...qrMap }));
      setIsBatchPrinting(true);
      setShowBatchModal(false);

      setTimeout(() => {
        setIsPreparingBatchPrint(false);
        window.print();
      }, 500);
    } catch (err: any) {
      setIsPreparingBatchPrint(false);
      toast.error("Gagal menyiapkan cetak masal: " + err.message);
    }
  };

  // 10. Single print handler
  const handleSinglePrint = () => {
    setIsBatchPrinting(false);
    setTimeout(() => {
      window.print();
    }, 50);
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
        toast.success("Logo watermark sertifikat berhasil diunggah!");
      } else {
        toast.error("Gagal mengupload logo watermark: " + (res.message || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Error upload logo: " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <>
      <div id="certificate-screen-root" className="space-y-6 font-sans print:hidden">
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

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            title="Atur teks, watermark, dan pejabat penandatangan"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Config</span>
          </button>

          <button
            onClick={handleDownloadCurrentPng}
            disabled={!activeCertificate}
            className="px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
            title="Unduh 1 sertifikat ini sebagai gambar PNG kualitas tinggi"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span className="hidden sm:inline">Unduh</span>
            <span>PNG</span>
          </button>

          <button
            onClick={handleSinglePrint}
            disabled={!activeCertificate}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            title="Cetak atau simpan 1 sertifikat ini sebagai PDF A4"
          >
            <Printer className="w-4 h-4 text-slate-200" />
            <span className="hidden sm:inline">Cetak</span>
            <span>PDF</span>
          </button>

          {/* DIRECT USER-REQUESTED BUTTON: DOWNLOAD ALL IN ZIP */}
          <button
            onClick={startBatchZipDownload}
            disabled={filteredCertificates.length === 0 || batchProgress.active}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-md shadow-emerald-600/30 active:scale-95 cursor-pointer disabled:opacity-50 ring-2 ring-emerald-500/30"
            title="Download langsung semua sertifikat peserta dalam 1 file ZIP"
          >
            {batchProgress.active && batchProgress.status !== "idle" ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-100" />
            ) : (
              <FileArchive className="w-4 h-4 text-emerald-100" />
            )}
            <span>Download Semua (.ZIP)</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-black">
              {filteredCertificates.length}
            </span>
          </button>

          <button
            onClick={() => setShowBatchModal(true)}
            disabled={filteredCertificates.length === 0}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
            title="Buka menu opsi export sertifikat (ZIP / PDF Multi Halaman)"
          >
            <Layers className="w-4 h-4 text-slate-600" />
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
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === "all"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua ({certificates.length})
              </button>
              <button
                onClick={() => setCategoryFilter("champion")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  categoryFilter === "champion"
                    ? "bg-blue-600 text-white font-black shadow-sm shadow-blue-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>🏆</span>
                <span>Juara ({certificates.filter((c) => resolveCertificateType(c, certTypeOverrides, bestSwimmerSet) === "winner").length})</span>
              </button>
              <button
                onClick={() => setCategoryFilter("best_swimmer")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  categoryFilter === "best_swimmer"
                    ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 font-black shadow-sm ring-1 ring-amber-400"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
                }`}
              >
                <span>🌟</span>
                <span>Best Swimmer ({certificates.filter((c) => resolveCertificateType(c, certTypeOverrides, bestSwimmerSet) === "best_swimmer").length})</span>
              </button>
              <button
                onClick={() => setCategoryFilter("participant")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === "participant"
                    ? "bg-[#580818] text-white font-black shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>🎖️</span>
                <span>Peserta ({certificates.filter((c) => resolveCertificateType(c, certTypeOverrides, bestSwimmerSet) === "participant").length})</span>
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
                const itemType = resolveCertificateType(item, certTypeOverrides, bestSwimmerSet);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCertId(item.id)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? itemType === "best_swimmer"
                          ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/40 shadow-sm"
                          : itemType === "winner"
                          ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-400/30 shadow-sm"
                          : "bg-rose-50/50 border-[#580818]/60 ring-2 ring-rose-400/30 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Rank / Category Badge with exact matching certificate color */}
                      {itemType === "best_swimmer" ? (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 border border-amber-500/40 shadow-2xs flex items-center gap-1">
                          <span>🌟</span>
                          <span>BEST SWIMMER (EMAS)</span>
                        </span>
                      ) : itemType === "winner" ? (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#172238] text-[#e5b74b] border border-[#1d2940] shadow-2xs flex items-center gap-1">
                          <span>🏆</span>
                          <span>{item.rankBadge} (BIRU)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#580818] text-[#fae89f] border border-[#420511] shadow-2xs flex items-center gap-1">
                          <span>🎖️</span>
                          <span>PESERTA (MERAH)</span>
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newOverrides = { ...certTypeOverrides };
                            if (itemType === "best_swimmer") {
                              newOverrides[item.id] = item.isChampion ? "winner" : "participant";
                              toast.info(`${item.swimmerName} dikembalikan ke tipe ${item.isChampion ? "Juara (Biru)" : "Peserta (Merah)"}`);
                            } else {
                              newOverrides[item.id] = "best_swimmer";
                              toast.success(`${item.swimmerName} ditandai sebagai Best Swimmer (Emas)!`);
                            }
                            setCertTypeOverrides(newOverrides);
                          }}
                          className={`p-1 rounded-lg border transition-all cursor-pointer ${
                            itemType === "best_swimmer"
                              ? "bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400"
                              : "bg-slate-50 text-slate-400 hover:text-amber-600 hover:bg-amber-50 border-slate-200"
                          }`}
                          title={itemType === "best_swimmer" ? "Hapus status Best Swimmer" : "Jadikan Best Swimmer (Emas)"}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          {item.issueDate}
                        </span>
                      </div>
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
                    onClick={() => {
                      if (activeCertificate) {
                        setCertTypeOverrides((prev) => ({ ...prev, [activeCertificate.id]: "winner" }));
                      }
                      setSelectedTemplateMode(null);
                      toast.success("Tema disetel ke Biru (Juara) untuk peserta ini!");
                    }}
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
                    onClick={() => {
                      if (activeCertificate) {
                        setCertTypeOverrides((prev) => ({ ...prev, [activeCertificate.id]: "best_swimmer" }));
                      }
                      setSelectedTemplateMode(null);
                      toast.success("Tema disetel ke Emas (Best Swimmer) untuk peserta ini!");
                    }}
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
                    onClick={() => {
                      if (activeCertificate) {
                        setCertTypeOverrides((prev) => ({ ...prev, [activeCertificate.id]: "participant" }));
                      }
                      setSelectedTemplateMode(null);
                      toast.success("Tema disetel ke Merah (Peserta) untuk peserta ini!");
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTemplateType === "participant"
                        ? "bg-[#580818] text-white font-black shadow-sm ring-2 ring-[#580818]/60"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>🎖️</span>
                    <span>Merah (Participant)</span>
                  </button>

                  {activeCertificate && certTypeOverrides[activeCertificate.id] && (
                    <button
                      type="button"
                      onClick={() => {
                        setCertTypeOverrides((prev) => {
                          const next = { ...prev };
                          delete next[activeCertificate.id];
                          return next;
                        });
                        setSelectedTemplateMode(null);
                        toast.info("Warna dikembalikan ke otomatis.");
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Kembalikan ke warna otomatis"
                    >
                      ↺ Auto
                    </button>
                  )}
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
                    <CertificateCanvas
                      ref={printAreaRef}
                      id="certificate-print-area"
                      cert={activeCertificate}
                      theme={currentTheme}
                      config={config}
                      qrCodeUrl={qrCodeUrl}
                      scale={canvasScale}
                    />
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
                              bodyDateText: formatCertificateDate(activeCertificate.tournamentDate || activeCertificate.issueDate),
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
                          placeholder={formatCertificateDate(activeCertificate?.tournamentDate || activeCertificate?.issueDate)}
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

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Label Catatan Waktu Resmi di Sertifikat (Default: OFFICIAL TIME:)
                        </label>
                        <input
                          type="text"
                          value={config.timeLabel !== undefined ? config.timeLabel : "OFFICIAL TIME:"}
                          onChange={(e) => saveConfig({ ...config, timeLabel: e.target.value })}
                          placeholder="OFFICIAL TIME:"
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
      </div>

      {/* 5. OFFSCREEN RENDER TARGET FOR ZIP PNG CAPTURE (PLACED UNDER PROGRESS MODAL Z-INDEX 40) */}
      {hiddenCertData && (
        <div
          id="batch-zip-render-target"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "590px",
            height: "834px",
            zIndex: 40,
            pointerEvents: "none",
            background: "#f8f5ee",
            overflow: "hidden",
          }}
        >
          <div ref={hiddenRenderRef} style={{ width: "590px", height: "834px", position: "relative" }}>
            <CertificateCanvas
              cert={hiddenCertData.cert}
              theme={hiddenCertData.theme}
              config={config}
              qrCodeUrl={hiddenCertData.qrUrl}
              scale={1}
            />
          </div>
        </div>
      )}

      {/* 6. UNIVERSAL DEDICATED PRINT PORTAL (FOR SINGLE & BATCH MULTI-PAGE PRINTING) */}
      <div id="certificate-print-portal" className="hidden print:block">
        {printCertificates.map((cert, idx) => {
          const certType = resolveCertificateType(cert, certTypeOverrides, bestSwimmerSet);
          const theme = THEME_CONFIG[certType];
          const qrUrl = batchQrMap[cert.id] || (cert.id === activeCertificate?.id ? qrCodeUrl : undefined);
          return (
            <div
              key={`print-sheet-${cert.id}-${idx}`}
              className="cert-print-sheet"
            >
              <div className="cert-print-sheet-inner">
                <CertificateCanvas
                  cert={cert}
                  theme={theme}
                  config={config}
                  qrCodeUrl={qrUrl}
                  scale={1}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 7. BATCH ZIP GENERATION PROGRESS OVERLAY MODAL */}
      {batchProgress.active && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                {batchProgress.status === "done" ? (
                  <Check className="w-6 h-6 text-emerald-600" />
                ) : batchProgress.status === "error" ? (
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                ) : (
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 truncate">
                  {batchProgress.status === "done"
                    ? "Berhasil Diunduh!"
                    : batchProgress.status === "zipping"
                    ? "Membuat File ZIP..."
                    : "Memproses Sertifikat Peserta"}
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {batchProgress.swimmerName}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">
                  {batchProgress.status === "zipping"
                    ? "Kompresi arsip..."
                    : `Sertifikat ${batchProgress.current} dari ${batchProgress.total}`}
                </span>
                <span className="text-emerald-600">
                  {batchProgress.total > 0
                    ? `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-200 ease-out"
                  style={{
                    width: `${
                      batchProgress.total > 0
                        ? Math.max(5, (batchProgress.current / batchProgress.total) * 100)
                        : 5
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Format:</span>
                <span className="font-bold text-slate-800">PNG Resolusi Tinggi (2x)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Output:</span>
                <span className="font-bold text-slate-800">1 File ZIP Terarsip</span>
              </div>
            </div>

            {batchProgress.status !== "done" && (
              <div className="flex justify-end">
                <button
                  onClick={handleCancelBatchZip}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Batalkan Proses
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. BATCH DOWNLOAD & EXPORT OPTIONS MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Download Semua Sertifikat
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Total {filteredCertificates.length} peserta terpilih siap diekspor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: ZIP PNG */}
              <div className="p-5 rounded-2xl border-2 border-emerald-500/60 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                    Rekomendasi
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    Paket ZIP (.zip)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Setiap peserta dibuatkan file gambar PNG beresolusi tinggi (2x) terpisah dan digabung dalam 1 file ZIP rapi.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBatchModal(false);
                    startBatchZipDownload();
                  }}
                  disabled={filteredCertificates.length === 0 || batchProgress.active}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <FileArchive className="w-4 h-4" />
                  <span>Download ZIP ({filteredCertificates.length} PNG)</span>
                </button>
              </div>

              {/* Option 2: Multi-page PDF */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                    1 Dokumen
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    Cetak / 1 File PDF
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Semua sertifikat peserta digabungkan ke dalam 1 dokumen multi-halaman A4 (1 lembar per peserta).
                  </p>
                </div>
                <button
                  onClick={handleBatchPrint}
                  disabled={filteredCertificates.length === 0 || isPreparingBatchPrint}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isPreparingBatchPrint ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  <span>Cetak PDF ({filteredCertificates.length} Hal)</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1 font-medium">
              <span className="font-bold text-slate-800">Catatan Filter:</span>
              <p>
                Jumlah sertifikat yang diekspor mengikuti filter dan pencarian aktif saat ini ({filteredCertificates.length} peserta).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PRINT CSS STYLING (PERFECT SINGLE-PAGE OR MULTI-PAGE A4 PORTRAIT WITHOUT BLANK PAGES) */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&display=swap');

        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html,
          body {
            width: 210mm !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Completely hide all screen elements, dashboard sidebar, topbars and modals */
          aside,
          nav,
          header,
          footer,
          .print\:hidden,
          .no-print,
          #certificate-screen-root {
            display: none !important;
          }
          /* Neutralize dashboard layout wrapper */
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 210mm !important;
            max-width: none !important;
            overflow: visible !important;
            background: transparent !important;
          }
          /* Universal print portal */
          #certificate-print-portal {
            display: block !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .cert-print-sheet {
            display: block !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            position: relative !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          .cert-print-sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .cert-print-sheet-inner {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 590px !important;
            height: 834.4px !important;
            transform: scale(1.345) !important;
            -webkit-transform: scale(1.345) !important;
            transform-origin: 0 0 !important;
            -webkit-transform-origin: 0 0 !important;
          }
        }
      `}</style>
    </>
  );
}
