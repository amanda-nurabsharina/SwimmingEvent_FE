"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Phone,
  AlertCircle,
  Trophy,
  Calendar,
  Layers,
  FileText,
  CreditCard,
  Zap,
  X,
  ChevronRight,
  QrCode,
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  KeyRound,
  Play,
  CheckCheck,
  Loader2,
  ShieldCheck,
  HelpCircle,
  Square,
} from "lucide-react";
import {
  getWhatsAppStatus,
  requestWhatsAppPairingCode,
  sendWhatsAppMessage,
  logoutWhatsApp,
  fetchAdminSiteConfig,
} from "../lib/api-admin";

interface ParticipantItem {
  id: number;
  name: string;
  gender: string;
  club: string;
  pic?: string;
  contact?: string;
  age_group?: string;
  registration_code?: string;
  payment_status: string;
  tournament_id?: number;
  tournament_name?: string;
  events_count: number;
}

interface WhatsAppBroadcastViewProps {
  registrations?: any[];
  tournaments?: any[];
  onRefresh?: () => void;
}

// 5 Pre-defined Official Championship WhatsApp Templates
const BROADCAST_TEMPLATES = [
  {
    id: "heat_sheet",
    label: "Bagan & Heat Sheet Terbit",
    icon: "🏊",
    template: `*📢 PENGUMUMAN RESMI: BAGAN & HEAT SHEET TELAH TERBIT!*

Halo *{NAMA_PIC}* (PIC/Wali dari *{NAMA_ATLET}* - {KLUB}),

Bagan susunan seri lomba dan pembagian lintasan resmi untuk kejuaraan *{NAMA_TURNAMEN}* telah rampung disusun dan dipublikasikan.

Detail Lomba:
📍 Lokasi: {LOKASI_KOLAM}
📅 Status: Resmi & Terkunci

Silakan periksa nomor seri, lintasan, dan jadwal tanding atlet Anda melalui tautan Buku Acara online resmi berikut:
🔗 {LINK_BUKU_ACARA}

Mohon hadir di kolam tepat waktu sesuai sesi pemanasan. Terima kasih dan salam olahraga! 🏊‍♂️🏅`,
  },
  {
    id: "technical_meeting",
    label: "Pengingat Technical Meeting",
    icon: "📢",
    template: `*📢 PENGINGAT TECHNICAL MEETING (TM) RESMI*

Kepada Yth. *{NAMA_PIC}* / Pelatih / Orang Tua dari *{NAMA_ATLET}* ({KLUB}),

Mengingatkan kembali bahwa agenda Technical Meeting (TM) resmi untuk kejuaraan *{NAMA_TURNAMEN}* akan dilaksanakan pada:
🗓 Waktu: H-1 Pelaksanaan (Pukul 14:00 WIB)
📍 Lokasi: Ruang Rapat Kolam Renang / Online Meeting

Agenda Utama:
1. Konfirmasi akhir daftar atlet & verifikasi data
2. Pembahasan tata tertib & regulasi World Aquatics / Akuatik Indonesia
3. Tanya jawab & informasi jadwal pemanasan

Kehadiran perwakilan sangat diharapkan demi kelancaran lomba. Terima kasih! 🙏`,
  },
  {
    id: "invoice_reminder",
    label: "Pengingat Tagihan Invoice",
    icon: "💳",
    template: `*💳 PENGINGAT PEMBAYARAN REGISTRASI LOMBA*

Halo *{NAMA_PIC}*,

Terima kasih telah mendaftarkan ananda *{NAMA_ATLET}* ({KLUB}) pada kejuaraan renang *{NAMA_TURNAMEN}*.

Status Pendaftaran: *MENUNGGU PEMBAYARAN*
Kode Registrasi: *{KODE_REGISTRASI}*

Mohon segera menyelesaikan transfer biaya pendaftaran dan mengunggah struk bukti transfer melalui tautan website:
🔗 {LINK_WEBSITE}/cek-pendaftaran

Agar slot nomor lomba ananda dapat diverifikasi oleh panitia dan dimasukkan ke dalam Bagan Seri resmi. Terima kasih atas kerjasamanya! 🙏`,
  },
  {
    id: "results_certificate",
    label: "Hasil & E-Sertifikat Terbit",
    icon: "🏆",
    template: `*🏆 HASIL LOMBA & E-SERTIFIKAT TELAH TERBIT!*

Selamat kepada *{NAMA_ATLET}* ({KLUB}) atas perjuangan dan sportivitasnya dalam kejuaraan *{NAMA_TURNAMEN}*!

Rekap hasil lomba resmi dan perolehan podium juara kini telah dipublikasikan dan dapat diakses melalui portal publik:
🔗 {LINK_BUKU_ACARA}

E-Sertifikat resmi kejuaraan dapat diunduh melalui portal peserta dengan memasukkan kode registrasi Anda:
🔗 {LINK_WEBSITE}/sertifikat

Terima kasih atas partisipasi luar biasa Anda dan sampai jumpa di kejuaraan berikutnya! 🥇🥈🥉`,
  },
  {
    id: "warmup_schedule",
    label: "Jadwal Pemanasan & Mulai Lomba",
    icon: "⚡",
    template: `*⚡ INFORMASI HARI-H: JADWAL PEMANASAN & PERLOMBAAN*

Halo *{NAMA_PIC}* / Orang Tua dari *{NAMA_ATLET}*,

Pemberitahuan resmi jadwal hari perlombaan *{NAMA_TURNAMEN}*:
🏊 Sesi Pemanasan: 06:30 - 07:30 WIB
⏱ Perlombaan Dimulai: 08:00 WIB Tepat
📍 Lokasi: {LOKASI_KOLAM}

Harap atlet mempersiapkan perlengkapan renang standar dan melapor ke meja marshalling 3 seri sebelum nomor lomba dimulai.

Semoga meraih prestasi terbaik! 🌟`,
  },
];

export default function WhatsAppBroadcastView({
  registrations = [],
  tournaments = [],
  onRefresh,
}: WhatsAppBroadcastViewProps) {
  // 1. STATE: Active Template & Message Text
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("heat_sheet");
  const [messageText, setMessageText] = useState<string>(BROADCAST_TEMPLATES[0].template);
  const [copyToast, setCopyToast] = useState(false);

  // 2. STATE: Filter recipients
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState<string>("ALL");

  // 3. STATE: Selected Recipient IDs
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());

  // 4. STATE: Send Queue Modal
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [sentRecipientIds, setSentRecipientIds] = useState<Set<string>>(new Set());

  // 5. STATE: WhatsApp Gateway (Baileys) Integration
  const [waStatus, setWaStatus] = useState<{
    isConnected: boolean;
    phoneNumber: string | null;
    qrCodeUrl: string | null;
    status: string;
    pairingCode?: string;
  }>({
    isConnected: false,
    phoneNumber: null,
    qrCodeUrl: null,
    status: "checking",
  });
  const [adminConfigPhone, setAdminConfigPhone] = useState<string>("6281234567890");
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [isRefreshingWA, setIsRefreshingWA] = useState<boolean>(false);
  const [connectTab, setConnectTab] = useState<"qr" | "pair">("qr");
  const [pairingPhoneInput, setPairingPhoneInput] = useState<string>("");
  const [pairingCodeResult, setPairingCodeResult] = useState<string>("");
  const [isRequestingPairing, setIsRequestingPairing] = useState<boolean>(false);

  // 6. STATE: Automated Broadcast Runner
  const [isAutoBroadcasting, setIsAutoBroadcasting] = useState<boolean>(false);
  const [currentBroadcastId, setCurrentBroadcastId] = useState<string | null>(null);
  const stopBroadcastRef = useRef<boolean>(false);

  // Poll WhatsApp Gateway Status
  const checkWAStatus = async (showLoading = false) => {
    if (showLoading) setIsRefreshingWA(true);
    try {
      const res = await getWhatsAppStatus();
      if (res && res.success !== false) {
        setWaStatus({
          isConnected: !!res.isConnected,
          phoneNumber: res.phoneNumber || null,
          qrCodeUrl: res.qrCodeUrl || null,
          status: res.status || (res.isConnected ? "connected" : "scan_needed"),
          pairingCode: res.pairingCode,
        });
      } else {
        setWaStatus({
          isConnected: false,
          phoneNumber: null,
          qrCodeUrl: null,
          status: "offline",
        });
      }
    } catch {
      setWaStatus({
        isConnected: false,
        phoneNumber: null,
        qrCodeUrl: null,
        status: "offline",
      });
    } finally {
      if (showLoading) setIsRefreshingWA(false);
    }
  };

  useEffect(() => {
    // 1. Fetch official WhatsApp number from settings
    fetchAdminSiteConfig().then((res) => {
      if (res?.success && res.data?.wa_number) {
        setAdminConfigPhone(res.data.wa_number);
        setPairingPhoneInput(res.data.wa_number);
      }
    });

    // 2. Initial status check
    checkWAStatus();

    // 3. Periodic polling every 4 seconds
    const interval = setInterval(() => {
      checkWAStatus();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Request 8-digit Pairing Code
  const handleRequestPairingCode = async () => {
    const targetPhone = pairingPhoneInput.trim() || adminConfigPhone;
    if (!targetPhone) {
      alert("Masukkan nomor WhatsApp admin terlebih dahulu.");
      return;
    }
    setIsRequestingPairing(true);
    setPairingCodeResult("");
    try {
      const res = await requestWhatsAppPairingCode(targetPhone);
      if (res && res.success && res.code) {
        setPairingCodeResult(res.code);
      } else {
        alert(res?.message || "Gagal membuat kode pairing. Pastikan WhatsApp Gateway aktif.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setIsRequestingPairing(false);
    }
  };

  // Logout WhatsApp
  const handleLogoutWA = async () => {
    if (!confirm("Apakah Anda yakin ingin memutuskan tautan sesi WhatsApp ini?")) return;
    setIsRefreshingWA(true);
    try {
      await logoutWhatsApp();
      await checkWAStatus();
      setPairingCodeResult("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshingWA(false);
    }
  };

  // 7. EXTRACT UNIQUE PARTICIPANTS (Deduplicated by Participant / Contact Number)
  const uniqueParticipants: ParticipantItem[] = useMemo(() => {
    const map = new Map<string, ParticipantItem>();

    registrations.forEach((reg) => {
      const p = reg.participant;
      if (!p) return;

      const key = `${p.id || p.name}-${p.contact || ""}`;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.events_count += 1;
        if (reg.payment_status === "verified") {
          existing.payment_status = "verified";
        }
      } else {
        const tId = reg.swimming_event?.tournament_id || 0;
        const tObj = tournaments.find((t) => t.id === tId);

        map.set(key, {
          id: p.id || reg.id,
          name: p.name || "Peserta",
          gender: p.gender || "PUTRA",
          club: p.club || "-",
          pic: p.pic || "Orang Tua / Wali",
          contact: p.contact || "",
          age_group: p.age_group || reg.swimming_event?.age_group || "",
          registration_code: reg.registration_code || `REG-${reg.id}`,
          payment_status: reg.payment_status || "pending",
          tournament_id: tId,
          tournament_name: tObj?.name || "Kejuaraan Renang Time Trial 2025",
          events_count: 1,
        });
      }
    });

    return Array.from(map.values());
  }, [registrations, tournaments]);

  // 8. FILTERED RECIPIENTS
  const filteredParticipants = useMemo(() => {
    return uniqueParticipants.filter((p) => {
      if (selectedStatusFilter === "verified" && p.payment_status !== "verified") return false;
      if (selectedStatusFilter === "pending" && p.payment_status === "verified") return false;

      if (
        selectedTournamentFilter !== "ALL" &&
        p.tournament_id !== Number(selectedTournamentFilter)
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchPic = (p.pic || "").toLowerCase().includes(q);
        const matchClub = (p.club || "").toLowerCase().includes(q);
        const matchContact = (p.contact || "").toLowerCase().includes(q);
        const matchCode = (p.registration_code || "").toLowerCase().includes(q);
        if (!matchName && !matchPic && !matchClub && !matchContact && !matchCode) {
          return false;
        }
      }

      return true;
    });
  }, [uniqueParticipants, selectedStatusFilter, selectedTournamentFilter, searchQuery]);

  const handleSelectAll = () => {
    const newSet = new Set<string>();
    filteredParticipants.forEach((p) => newSet.add(String(p.id)));
    setSelectedRecipientIds(newSet);
  };

  const handleDeselectAll = () => {
    setSelectedRecipientIds(new Set());
  };

  const handleToggleRecipient = (id: string) => {
    const next = new Set(selectedRecipientIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRecipientIds(next);
  };

  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = BROADCAST_TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl) {
      setMessageText(tmpl.template);
    }
  };

  // Helper: Format Indonesian phone to international 62 format
  const formatPhoneForWA = (rawPhone?: string): string => {
    if (!rawPhone) return "";
    let clean = rawPhone.replace(/\D/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    } else if (clean.startsWith("8")) {
      clean = "62" + clean;
    }
    return clean;
  };

  // Build personalized message for an athlete
  const buildPersonalizedMessage = (p?: ParticipantItem): string => {
    const athleteName = p ? p.name.toUpperCase() : "{NAMA_ATLET}";
    const picName = p?.pic ? p.pic : "Bpk/Ibu Wali Atlet";
    const clubName = p?.club ? p.club : "{KLUB}";
    const tourneyName = p?.tournament_name
      ? p.tournament_name
      : tournaments.find((t) => t.is_active)?.name || "TIME TRIAL 2025 AI KOTA TANGERANG";
    const regCode = p?.registration_code ? p.registration_code : "{KODE_REGISTRASI}";

    const currentOrigin =
      typeof window !== "undefined"
        ? window.location.origin.replace(":3001", ":3000")
        : "http://localhost:3000";
    const bukuAcaraLink = `${currentOrigin}/buku-acara`;
    const websiteLink = currentOrigin;

    return messageText
      .replace(/{NAMA_ATLET}/g, athleteName)
      .replace(/{NAMA_PIC}/g, picName)
      .replace(/{KLUB}/g, clubName)
      .replace(/{NAMA_TURNAMEN}/g, tourneyName)
      .replace(/{LOKASI_KOLAM}/g, "Kolam Renang Tirta Kencana / Gelanggang Kota Tangerang")
      .replace(/{KODE_REGISTRASI}/g, regCode)
      .replace(/{LINK_BUKU_ACARA}/g, bukuAcaraLink)
      .replace(/{LINK_WEBSITE}/g, websiteLink);
  };

  const getWhatsAppLink = (p: ParticipantItem): string => {
    const phone = formatPhoneForWA(p.contact);
    if (!phone) return "#";
    const msg = buildPersonalizedMessage(p);
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const selectedParticipantsList = useMemo(() => {
    return filteredParticipants.filter((p) => selectedRecipientIds.has(String(p.id)));
  }, [filteredParticipants, selectedRecipientIds]);

  const handleCopyAllPhoneNumbers = () => {
    const phones = selectedParticipantsList
      .map((p) => formatPhoneForWA(p.contact))
      .filter(Boolean)
      .join(", ");
    navigator.clipboard.writeText(phones);
    alert(`Berhasil menyalin ${selectedParticipantsList.length} nomor WhatsApp ke clipboard!`);
  };

  // Open WhatsApp Web for specific recipient in queue (manual fallback)
  const handleSendQueueItem = (p: ParticipantItem) => {
    const link = getWhatsAppLink(p);
    if (link !== "#") {
      window.open(link, "_blank");
      setSentRecipientIds((prev) => new Set(prev).add(String(p.id)));
    } else {
      alert(`Nomor telepon untuk ${p.name} tidak valid atau kosong.`);
    }
  };

  // Send single message directly via Baileys API
  const handleDirectSendBaileys = async (p: ParticipantItem) => {
    const phone = formatPhoneForWA(p.contact);
    if (!phone) {
      alert(`Nomor kontak untuk ${p.name} kosong atau tidak valid.`);
      return;
    }
    const msg = buildPersonalizedMessage(p);
    const res = await sendWhatsAppMessage(phone, msg);
    if (res && res.success) {
      setSentRecipientIds((prev) => new Set(prev).add(String(p.id)));
      alert(`✓ Pesan berhasil dikirim ke ${p.name} (${phone}) melalui Baileys!`);
    } else {
      alert(`Gagal mengirim pesan: ${res?.message || "Kesalahan jaringan"}`);
    }
  };

  // 9. AUTOMATED BROADCAST RUNNER (Sequential with safe anti-ban delay)
  const handleStartAutoBroadcast = async () => {
    if (!waStatus.isConnected) {
      alert(
        "WhatsApp Gateway belum terhubung! Silakan hubungkan akun WhatsApp admin terlebih dahulu melalui tombol 'Hubungkan WhatsApp Admin'."
      );
      setShowConnectModal(true);
      return;
    }

    const queueToSend = selectedParticipantsList.filter(
      (p) => !sentRecipientIds.has(String(p.id))
    );

    if (queueToSend.length === 0) {
      alert("Semua peserta terpilih sudah terkirim!");
      return;
    }

    const confirmMsg = `Mulai broadcast otomatis ke ${queueToSend.length} peserta terpilih menggunakan nomor WhatsApp resmi admin (+${
      waStatus.phoneNumber || adminConfigPhone
    })?\n\nPesan akan dikirim secara berurutan langsung dari sistem dengan jeda aman 2 detik.`;
    if (!window.confirm(confirmMsg)) return;

    setIsAutoBroadcasting(true);
    stopBroadcastRef.current = false;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < queueToSend.length; i++) {
      if (stopBroadcastRef.current) {
        break;
      }

      const p = queueToSend[i];
      const idStr = String(p.id);
      setCurrentBroadcastId(idStr);

      const phone = formatPhoneForWA(p.contact);
      if (!phone) {
        failCount++;
        continue;
      }

      const msg = buildPersonalizedMessage(p);

      try {
        const res = await sendWhatsAppMessage(phone, msg);
        if (res && res.success) {
          setSentRecipientIds((prev) => new Set(prev).add(idStr));
          successCount++;
        } else {
          console.warn(`Gagal mengirim ke ${p.name}:`, res?.message);
          failCount++;
        }
      } catch (err) {
        console.error(`Error broadcast ke ${p.name}:`, err);
        failCount++;
      }

      // 2 seconds anti-ban delay between each send (if not stopped and not last item)
      if (i < queueToSend.length - 1 && !stopBroadcastRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    setCurrentBroadcastId(null);
    setIsAutoBroadcasting(false);

    if (stopBroadcastRef.current) {
      alert(`Broadcast dihentikan oleh pengguna.\n✓ Terkirim: ${successCount}\n✗ Gagal/Terlewati: ${failCount}`);
    } else {
      alert(`🎉 Broadcast Otomatis Selesai!\n✓ Berhasil terkirim: ${successCount} peserta\n✗ Gagal/Terlewati: ${failCount} peserta`);
    }
  };

  const handleStopAutoBroadcast = () => {
    stopBroadcastRef.current = true;
  };

  const isAllSelected =
    filteredParticipants.length > 0 &&
    filteredParticipants.every((p) => selectedRecipientIds.has(String(p.id)));

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 1. TOP HEADER BANNER                                         */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-full text-[11px] font-black tracking-wider uppercase mb-3 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          WHATSAPP BROADCAST & AUTOMATION (BAILEYS ENGINE)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Pusat Pengumuman & Broadcast WhatsApp Official Peserta
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-3xl">
          Kirim notifikasi serentak jadwal TM, publikasi bagan heat sheet, hasil lomba, dan pengingat tagihan
          langsung ke WhatsApp PIC / Wali peserta secara otomatis tanpa membuka tab browser manual.
        </p>
      </div>

      {/* ============================================================ */}
      {/* 2. WHATSAPP GATEWAY CONNECTION STATUS CARD                   */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              waStatus.isConnected
                ? "bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50"
                : waStatus.status === "offline"
                ? "bg-rose-100 text-rose-700 ring-4 ring-rose-50"
                : "bg-amber-100 text-amber-700 ring-4 ring-amber-50"
            }`}
          >
            {waStatus.isConnected ? (
              <Wifi className="w-6 h-6" />
            ) : waStatus.status === "offline" ? (
              <WifiOff className="w-6 h-6" />
            ) : (
              <QrCode className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                Status Pengirim Resmi WhatsApp (Baileys Engine)
              </h3>
              {waStatus.isConnected ? (
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  TERHUBUNG SEBAGAI PENGIRIM RESMI
                </span>
              ) : waStatus.status === "offline" ? (
                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  GATEWAY OFFLINE (:5001)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  SIAP DIHUBUNGKAN (SCAN QR / PAIRING)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {waStatus.isConnected ? (
                <>
                  Nomor Pengirim Aktif:{" "}
                  <strong className="text-emerald-700 font-mono text-xs">
                    +{waStatus.phoneNumber || adminConfigPhone}
                  </strong>{" "}
                  (Sesuai Pengaturan Sistem). Pesan broadcast akan terkirim otomatis di latar belakang tanpa membuka jendela chat manual.
                </>
              ) : (
                <>
                  Nomor Admin Terdaftar:{" "}
                  <strong className="text-slate-800 font-mono text-xs">+{adminConfigPhone}</strong>.{" "}
                  Hubungkan sesi WhatsApp sekali saja melalui scan QR atau Kode Pairing untuk mengaktifkan fitur broadcast otomatis 1-klik.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => checkWAStatus(true)}
            disabled={isRefreshingWA}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            title="Segarkan status gateway"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingWA ? "animate-spin" : ""}`} />
          </button>

          {waStatus.isConnected ? (
            <button
              type="button"
              onClick={handleLogoutWA}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Putuskan Sesi</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Hubungkan WhatsApp Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. TWO-COLUMN MAIN WORKSPACE                                 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ------------------------------------------------------------ */}
        {/* LEFT COLUMN: TEMPLATE PICKER & MESSAGE COMPOSER (7 COLS)     */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-7 space-y-5">
          {/* Template Selection Cards */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                Pilih Format Template Pesan Resmi
              </label>
              <button
                type="button"
                onClick={() => handleSelectTemplate(selectedTemplateId)}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                title="Kembalikan pesan ke template default"
              >
                <RotateCcw className="w-3 h-3" /> Reset Template
              </button>
            </div>

            {/* Template Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BROADCAST_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? "bg-sky-50/80 border-sky-400 text-sky-950 shadow-xs ring-2 ring-sky-100 font-black"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-bold hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xl shrink-0">{tmpl.icon}</span>
                    <span className="text-xs leading-snug">{tmpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Textarea & Placeholder Tags */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                Isi Pesan Broadcast (Mendukung Format WhatsApp *Bold* & Link)
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
              >
                {copyToast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Pesan</span>
                  </>
                )}
              </button>
            </div>

            {/* Helper Placeholder Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400">Tag Otomatis:</span>
              {[
                { tag: "{NAMA_ATLET}", desc: "Nama Atlet" },
                { tag: "{NAMA_PIC}", desc: "Nama PIC" },
                { tag: "{KLUB}", desc: "Klub" },
                { tag: "{NAMA_TURNAMEN}", desc: "Turnamen" },
                { tag: "{LINK_BUKU_ACARA}", desc: "Link Buku Acara" },
                { tag: "{KODE_REGISTRASI}", desc: "Kode Reg" },
              ].map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => setMessageText((prev) => prev + " " + item.tag)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-sky-100 border border-slate-200 text-slate-700 hover:text-sky-800 text-[10px] font-mono font-bold rounded-lg transition-colors"
                  title={`Klik untuk menambahkan tag ${item.desc}`}
                >
                  +{item.tag}
                </button>
              ))}
            </div>

            {/* The Textarea */}
            <div className="relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={12}
                placeholder="Tulis pesan pengumuman WhatsApp..."
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 focus:border-sky-500 rounded-2xl text-xs font-mono text-slate-900 leading-relaxed focus:outline-none focus:bg-white shadow-inner resize-y transition-all"
              />
            </div>

            {/* Big Send Action Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={selectedParticipantsList.length === 0}
                onClick={() => setIsQueueModalOpen(true)}
                className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-md ${
                  selectedParticipantsList.length > 0
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.99] cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  Kirim Broadcast ke {selectedParticipantsList.length} Peserta Terpilih
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT COLUMN: RECIPIENT LIST (5 COLS)                        */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-xs space-y-4">
            {/* Header: Title & Select All / Deselect All */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-800">
                  PENERIMA PESAN ({selectedParticipantsList.length} PESERTA)
                </h3>
              </div>
              <button
                type="button"
                onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
              >
                {isAllSelected ? "Batal Semua" : "Pilih Semua"}
              </button>
            </div>

            {/* Filter Controls */}
            <div className="space-y-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari atlet, PIC, klub, atau WA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                {[
                  { id: "ALL", label: "Semua" },
                  { id: "verified", label: "Terverifikasi" },
                  { id: "pending", label: "Pending" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStatusFilter(st.id)}
                    className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                      selectedStatusFilter === st.id
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Cards List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredParticipants.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">Tidak ada peserta yang cocok dengan filter</p>
                </div>
              ) : (
                filteredParticipants.map((p) => {
                  const idStr = String(p.id);
                  const isChecked = selectedRecipientIds.has(idStr);
                  const isSent = sentRecipientIds.has(idStr);
                  const waPhone = formatPhoneForWA(p.contact);
                  const waLink = getWhatsAppLink(p);

                  return (
                    <div
                      key={idStr}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isChecked
                          ? "bg-sky-50/50 border-sky-300 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Left: Checkbox & Athlete / PIC Info */}
                      <label className="flex items-start gap-3 flex-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRecipient(idStr)}
                          className="mt-1 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-xs text-slate-900 truncate uppercase">
                              {p.name}
                            </h4>
                            {p.payment_status === "verified" ? (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded">
                                LUNAS
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded">
                                PENDING
                              </span>
                            )}
                            {isSent && (
                              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[9px] font-black rounded flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Terkirim
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            PIC: <span className="font-bold text-slate-700">{p.pic || "Orang Tua"}</span>{" "}
                            {p.contact ? `(${p.contact})` : <span className="text-rose-500">(No WA kosong)</span>}
                          </p>

                          <p className="text-[10px] text-slate-400 font-bold truncate">
                            Klub: {p.club} • {p.events_count} Nomor Lomba
                          </p>
                        </div>
                      </label>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5">
                        {waStatus.isConnected && waPhone && (
                          <button
                            type="button"
                            onClick={() => handleDirectSendBaileys(p)}
                            className="p-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 transition-all"
                            title="Kirim instan via Baileys"
                          >
                            <Zap className="w-3.5 h-3.5 text-sky-600" />
                          </button>
                        )}

                        {waPhone ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setSentRecipientIds((prev) => new Set(prev).add(idStr))}
                            className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center transition-all shadow-2xs hover:scale-105"
                            title={`Buka WhatsApp untuk chat langsung dengan ${p.pic || p.name}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <div
                            className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center cursor-not-allowed"
                            title="Nomor telepon tidak valid"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Bulk Copy Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>{filteredParticipants.length} Peserta Terdaftar</span>
              <button
                type="button"
                onClick={handleCopyAllPhoneNumbers}
                className="text-sky-600 hover:text-sky-700 flex items-center gap-1 font-black"
                title="Salin semua nomor telepon terpilih untuk WhatsApp Broadcast List"
              >
                <Copy className="w-3.5 h-3.5" /> Salin Nomor WA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. SEND QUEUE & AUTOMATED BROADCAST MODAL                    */}
      {/* ============================================================ */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Kirim Broadcast WhatsApp ({selectedParticipantsList.length} Peserta)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Kirim pesan otomatis via Baileys atau buka web chat satu-satu
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isAutoBroadcasting}
                onClick={() => setIsQueueModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AUTOMATED BROADCAST RUNNER CARD */}
            <div className="p-4 bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                    Broadcast Otomatis Langsung (Baileys Engine)
                  </h4>
                  <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                    Kirim semua pesan secara berurutan langsung dari server tanpa membuka tab baru (Jeda aman 2 detik anti-ban).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {isAutoBroadcasting ? (
                  <button
                    type="button"
                    onClick={handleStopAutoBroadcast}
                    className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Hentikan Broadcast</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={selectedParticipantsList.length === 0}
                    onClick={handleStartAutoBroadcast}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>
                      🚀 Mulai Broadcast Otomatis (
                      {
                        selectedParticipantsList.filter(
                          (p) => !sentRecipientIds.has(String(p.id))
                        ).length
                      }{" "}
                      Tersisa)
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-700">
                <span>Status Pengiriman:</span>
                <span className="text-emerald-700 font-mono">
                  {sentRecipientIds.size} / {selectedParticipantsList.length} Selesai
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${
                      selectedParticipantsList.length > 0
                        ? (sentRecipientIds.size / selectedParticipantsList.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Queue List of Selected Participants */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedParticipantsList.map((p, idx) => {
                const idStr = String(p.id);
                const isSent = sentRecipientIds.has(idStr);
                const isSendingCurrent = isAutoBroadcasting && currentBroadcastId === idStr;

                return (
                  <div
                    key={idStr}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isSendingCurrent
                        ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200 animate-pulse"
                        : isSent
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-slate-400">
                          #{idx + 1}
                        </span>
                        <h5 className="text-xs font-black text-slate-900 truncate uppercase">
                          {p.name}
                        </h5>
                        {isSendingCurrent && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[9px] font-black rounded-full flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-700" />
                            Sedang Kirim...
                          </span>
                        )}
                        {isSent && !isSendingCurrent && (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded">
                            TERKIRIM ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        PIC: {p.pic} • {p.contact || "Tidak ada nomor"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Manual WA web button fallback */}
                      <button
                        type="button"
                        disabled={isAutoBroadcasting}
                        onClick={() => handleSendQueueItem(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs ${
                          isSent
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                        }`}
                      >
                        <span>{isSent ? "Kirim Ulang" : "Buka WA"}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={handleCopyAllPhoneNumbers}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" /> Salin Semua Nomor WA
              </button>

              <button
                type="button"
                disabled={isAutoBroadcasting}
                onClick={() => setIsQueueModalOpen(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. WHATSAPP CONNECTION MODAL (QR CODE & PAIRING CODE)        */}
      {/* ============================================================ */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Hubungkan WhatsApp Admin Resmi
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Tautkan akun WhatsApp panitia dengan Baileys Engine
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Connection Method Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setConnectTab("qr")}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
                  connectTab === "qr"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Pindai Kode QR</span>
              </button>

              <button
                type="button"
                onClick={() => setConnectTab("pair")}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
                  connectTab === "pair"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Kode Pairing 8-Digit</span>
              </button>
            </div>

            {/* TAB 1: QR CODE */}
            {connectTab === "qr" && (
              <div className="space-y-4">
                <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 text-center flex flex-col items-center justify-center min-h-[260px]">
                  {waStatus.isConnected ? (
                    <div className="space-y-3 text-center py-6">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <CheckCheck className="w-8 h-8" />
                      </div>
                      <h4 className="font-black text-slate-900 text-base">
                        WhatsApp Berhasil Terhubung!
                      </h4>
                      <p className="text-xs text-slate-600 max-w-xs mx-auto">
                        Nomor aktif: <strong>+{waStatus.phoneNumber || adminConfigPhone}</strong>. Anda sudah dapat melakukan broadcast otomatis.
                      </p>
                    </div>
                  ) : waStatus.qrCodeUrl ? (
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="p-3 bg-white rounded-2xl border-2 border-emerald-400 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={waStatus.qrCodeUrl}
                          alt="WhatsApp QR Code"
                          className="w-52 h-52 object-contain"
                        />
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 animate-pulse">
                        QR Code berganti otomatis jika belum dipindai
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 py-8 text-center text-slate-500">
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
                      <p className="text-xs font-bold">Sedang memuat QR Code WhatsApp...</p>
                      <button
                        type="button"
                        onClick={() => checkWAStatus(true)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
                      >
                        Muat Ulang QR
                      </button>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-2 text-xs text-sky-950 font-medium">
                  <div className="font-black flex items-center gap-1.5 text-sky-900">
                    <Smartphone className="w-4 h-4 text-sky-700" />
                    Cara Menautkan Perangkat via QR:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700">
                    <li>Buka WhatsApp di HP admin / panitia</li>
                    <li>Ketuk <strong>Titik Tiga (⋮)</strong> di Android atau <strong>Pengaturan</strong> di iPhone</li>
                    <li>Pilih <strong>Perangkat Tertaut (Linked Devices)</strong></li>
                    <li>Ketuk <strong>Tautkan Perangkat</strong> dan arahkan kamera ke QR Code di atas</li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB 2: PAIRING CODE */}
            {connectTab === "pair" && (
              <div className="space-y-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">
                      Nomor WhatsApp Admin (Format 62xxx)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: 6281234567890"
                        value={pairingPhoneInput}
                        onChange={(e) => setPairingPhoneInput(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        disabled={isRequestingPairing}
                        onClick={handleRequestPairingCode}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isRequestingPairing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <KeyRound className="w-4 h-4" />
                        )}
                        <span>Minta Kode</span>
                      </button>
                    </div>
                  </div>

                  {/* Display Pairing Code Result */}
                  {pairingCodeResult && (
                    <div className="p-4 bg-emerald-100/70 border-2 border-emerald-400 rounded-2xl text-center space-y-1.5 animate-in fade-in zoom-in-95">
                      <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                        Kode Pairing Anda (8 Digit):
                      </p>
                      <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-emerald-950 bg-white py-2.5 px-4 rounded-xl border border-emerald-300 inline-block shadow-xs">
                        {pairingCodeResult}
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        Masukkan kode di atas pada notifikasi WhatsApp di HP Anda.
                      </p>
                    </div>
                  )}
                </div>

                {/* Instructions for Pairing Code */}
                <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-2 text-xs text-sky-950 font-medium">
                  <div className="font-black flex items-center gap-1.5 text-sky-900">
                    <KeyRound className="w-4 h-4 text-sky-700" />
                    Cara Menggunakan Kode Pairing:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700">
                    <li>Masukkan nomor WhatsApp admin di atas lalu klik <strong>Minta Kode</strong></li>
                    <li>Buka WhatsApp di HP Anda &gt; <strong>Perangkat Tertaut</strong> &gt; <strong>Tautkan dengan nomor telepon saja</strong></li>
                    <li>Ketikkan 8 digit kode yang muncul di atas pada layar HP Anda</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Enkripsi End-to-End Aman
              </span>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
