"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  ShieldCheck,
  Calendar,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Printer,
  Eye,
  CreditCard,
  QrCode,
  Building,
  User,
  Clock,
  Sparkles,
  FileText,
  ExternalLink,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { registerParticipant, uploadImage } from "../lib/api";
import SwimmingTimeInput from "./SwimmingTimeInput";

interface SwimmingEvent {
  id: number;
  event_code: number;
  event_name: string;
  distance: string;
  stroke: string;
  gender: string;
  age_group: string;
  fee: number;
  schedule_time?: string;
}

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  events?: SwimmingEvent[];
  tournaments?: any[];
  poolConfig?: any;
  siteConfig?: any;
}

export default function RegistrationModal({
  isOpen,
  onClose,
  events = [],
  tournaments = [],
  poolConfig,
  siteConfig,
}: RegistrationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // TOURNAMENT SELECTOR & DEADLINE CHECK
  const [selectedTournamentID, setSelectedTournamentID] = useState<string>(
    tournaments?.[0]?.id ? String(tournaments[0].id) : ""
  );

  useEffect(() => {
    if (tournaments && tournaments.length > 0) {
      if (!selectedTournamentID || !tournaments.some((t) => String(t.id) === String(selectedTournamentID))) {
        setSelectedTournamentID(String(tournaments[0].id));
      }
    }
  }, [tournaments]);

  const currentTourney =
    (tournaments || []).find((t) => String(t.id) === String(selectedTournamentID)) ||
    tournaments?.[0];

  const todayStr = new Date().toISOString().slice(0, 10);
  const isRegistrationClosed = currentTourney?.registration_end_date
    ? todayStr > currentTourney.registration_end_date
    : false;

  // STEP 1 FIELDS
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [birthDate, setBirthDate] = useState("2012-05-14");
  const [detectedKU, setDetectedKU] = useState("KU 2");
  const [club, setClub] = useState("");
  const [docType, setDocType] = useState("Akte Kelahiran");
  const [pic, setPic] = useState("");
  const [contact, setContact] = useState("");
  const [docFileUrl, setDocFileUrl] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // REFS FOR AUTO-SCROLL TO TOP ON STEP CHANGE
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const modalOuterRef = useRef<HTMLDivElement>(null);

  // STEP 2 FIELDS
  const [selectedEvents, setSelectedEvents] = useState<{
    [eventId: number]: { checked: boolean; timeSeed: string; isNoTime: boolean };
  }>({});

  // STEP 3 FIELDS
  const [paymentMethod, setPaymentMethod] = useState<"BCA" | "Mandiri" | "QRIS">("BCA");
  const [senderBankOwner, setSenderBankOwner] = useState("");
  const [proofFileUrl, setProofFileUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // STEP 4 RESULT
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // Scroll to top of modal whenever step changes
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
    if (modalOuterRef.current) {
      modalOuterRef.current.scrollTop = 0;
    }
  }, [step]);

  // Tournament year for age computation
  const tournamentYear = useMemo(() => {
    if (currentTourney?.event_start_date) {
      const parsed = new Date(currentTourney.event_start_date).getFullYear();
      if (!isNaN(parsed) && parsed > 2000) return parsed;
    }
    return 2026;
  }, [currentTourney]);

  // Real-time Age and official PB PRSI / Akuatik Indonesia KU validation
  const ageValidation = useMemo(() => {
    if (!birthDate) {
      return { age: 0, ku: "KU 2", label: "-", valid: false, error: "Tanggal lahir wajib diisi" };
    }
    const parts = birthDate.split("-").map(Number);
    if (parts.length !== 3 || isNaN(parts[0])) {
      return { age: 0, ku: "KU 2", label: "-", valid: false, error: "Format tanggal tidak valid" };
    }
    const birthYear = parts[0];
    const age = tournamentYear - birthYear;
    const today = new Date();
    const birthDateObj = new Date(birthDate);

    if (birthDateObj > today) {
      return { age, ku: "-", label: "-", valid: false, error: "Tanggal lahir tidak boleh di masa depan" };
    }
    if (age < 4) {
      return { age, ku: "-", label: "-", valid: false, error: `Usia atlet (${age} tahun) belum mencukupi batas minimal kepesertaan turnamen (minimal 4 tahun)` };
    }
    if (age > 80) {
      return { age, ku: "-", label: "-", valid: false, error: "Usia atlet melebihi batas ketentuan kejuaraan" };
    }

    let ku = "Senior";
    let desc = "Senior (Usia 19 Tahun ke atas)";
    if (age <= 9) {
      ku = "KU 5";
      desc = "KU 5 (Usia 9 Tahun ke bawah / Pemula)";
    } else if (age <= 11) {
      ku = "KU 4";
      desc = "KU 4 (Usia 10 - 11 Tahun)";
    } else if (age <= 13) {
      ku = "KU 3";
      desc = "KU 3 (Usia 12 - 13 Tahun)";
    } else if (age <= 15) {
      ku = "KU 2";
      desc = "KU 2 (Usia 14 - 15 Tahun)";
    } else if (age <= 18) {
      ku = "KU 1";
      desc = "KU 1 (Usia 16 - 18 Tahun)";
    }

    return { age, ku, label: desc, valid: true, error: null };
  }, [birthDate, tournamentYear]);

  // Sync detectedKU with ageValidation
  useEffect(() => {
    if (ageValidation.valid && ageValidation.ku !== "-") {
      setDetectedKU(ageValidation.ku);
    }
  }, [ageValidation]);

  // Reset all states when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setName("");
      setGender("PUTRA");
      setBirthDate("2012-05-14");
      setDetectedKU("KU 2");
      setClub("");
      setDocType("Akte Kelahiran");
      setPic("");
      setContact("");
      setDocFileUrl("");
      setUploadingDoc(false);
      setSelectedEvents({});
      setPaymentMethod("BCA");
      setSenderBankOwner("");
      setProofFileUrl("");
      setUploadingProof(false);
      setSubmitting(false);
      setCopiedBank(false);
      setReceiptData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const appWa = siteConfig?.wa_number || "6281234567890";
  const compName =
    poolConfig?.competition_name || "TIME TRIAL 2026 AKUATIK INDONESIA KOTA TANGERANG";
  const compLoc = poolConfig?.location || "Kolam Renang MGCC Mod...";

  // Event Selection handlers
  const handleToggleEvent = (eventId: number) => {
    setSelectedEvents((prev) => {
      const existing = prev[eventId];
      if (existing?.checked) {
        const copy = { ...prev };
        delete copy[eventId];
        return copy;
      } else {
        return {
          ...prev,
          [eventId]: { checked: true, timeSeed: "99:99.99", isNoTime: true },
        };
      }
    });
  };

  const handleSeedChange = (eventId: number, timeSeed: string) => {
    setSelectedEvents((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        timeSeed,
        isNoTime: timeSeed === "99.99.99" || timeSeed === "99:99.99" || timeSeed.trim() === "",
      },
    }));
  };

  const handleNoTimeToggle = (eventId: number, isNoTime: boolean) => {
    setSelectedEvents((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        isNoTime,
        timeSeed: isNoTime ? "99.99.99" : "00.30.00",
      },
    }));
  };

  // Upload handlers
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const res = await uploadImage(file);
    setUploadingDoc(false);
    const uploadedUrl = res.url || res.data?.url;
    if (res.success && uploadedUrl) {
      setDocFileUrl(uploadedUrl);
    } else {
      alert("Gagal mengunggah foto berkas: " + (res.message || "Pastikan format JPG, PNG, WEBP, atau PDF"));
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    const res = await uploadImage(file);
    setUploadingProof(false);
    const uploadedUrl = res.url || res.data?.url;
    if (res.success && uploadedUrl) {
      setProofFileUrl(uploadedUrl);
    } else {
      alert("Gagal mengunggah bukti transfer: " + (res.message || "Pastikan format JPG, PNG, WEBP, atau PDF"));
    }
  };

  // Selected Events Array & Price Calculation
  const checkedEventEntries = Object.entries(selectedEvents).filter(([_, v]) => v.checked);
  const totalSelectedCount = checkedEventEntries.length;
  const totalFee = checkedEventEntries.reduce((sum, [idStr]) => {
    const foundEvent = events.find((e) => Number(e.id) === Number(idStr));
    return sum + Number(foundEvent?.fee ?? 150000);
  }, 0);

  // Step 1 Validation -> Go to Step 2
  const handleGoToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Nama lengkap atlet wajib diisi");
      return;
    }
    if (!ageValidation.valid) {
      alert("Validasi Usia Gagal: " + (ageValidation.error || "Tanggal lahir atlet tidak memenuhi ketentuan kejuaraan."));
      return;
    }
    if (!club.trim()) {
      alert("Asal klub / sekolah wajib diisi");
      return;
    }
    const cleanContact = contact.replace(/\D/g, "");
    if (!cleanContact) {
      alert("Nomor WhatsApp PIC wajib diisi (hanya angka)");
      return;
    }
    if (cleanContact.length < 9) {
      alert("Nomor WhatsApp tidak valid. Masukkan minimal 9 digit angka.");
      return;
    }
    if (!docFileUrl) {
      alert("Foto berkas identitas (" + docType + ") WAJIB diunggah sebelum melanjutkan ke pemilihan nomor lomba!");
      return;
    }
    setStep(2);
  };

  // Step 2 Validation -> Go to Step 3
  const handleGoToStep3 = () => {
    if (totalSelectedCount === 0) {
      alert("Silakan pilih minimal 1 nomor lomba untuk didaftarkan");
      return;
    }
    setStep(3);
  };

  // Submit Final Registration
  const handleSubmitRegistration = async () => {
    if (!senderBankOwner.trim()) {
      alert("Nama pemilik rekening pengirim wajib diisi");
      return;
    }
    if (!proofFileUrl) {
      alert("Bukti struk transfer pembayaran WAJIB diunggah!");
      return;
    }

    setSubmitting(true);
    const eventSelections = checkedEventEntries.map(([idStr, val]) => {
      const finalSeed =
        val.isNoTime || !val.timeSeed || val.timeSeed.trim() === "" || val.timeSeed === "NT"
          ? "99.99.99"
          : val.timeSeed.trim();
      return {
        swimming_event_id: Number(idStr),
        time_seed: finalSeed,
      };
    });

    const payload = {
      name: name.toUpperCase(),
      gender,
      birth_date: birthDate,
      age_group: detectedKU,
      club,
      verification_doc_type: docType,
      verification_doc_url: docFileUrl,
      pic,
      contact,
      payment_method: paymentMethod,
      sender_bank_owner: senderBankOwner,
      payment_proof_url: proofFileUrl,
      event_selections: eventSelections,
    };

    const res = await registerParticipant(payload);
    setSubmitting(false);

    if (res.success && res.data) {
      setReceiptData(res.data);
      setStep(4);
    } else {
      alert("Gagal mengirim pendaftaran: " + (res.message || "Terjadi kesalahan server"));
    }
  };

  // Filter events matching selected tournament, athlete gender & KU
  const eligibleEvents = events.filter((e) => {
    const matchTourney =
      !selectedTournamentID || String((e as any).tournament_id) === String(selectedTournamentID);
    const matchGender = e.gender?.toUpperCase() === gender;
    const matchKU =
      e.age_group?.toUpperCase() === detectedKU.toUpperCase() ||
      e.age_group?.toUpperCase() === "OPEN" ||
      !e.age_group;
    return matchTourney && matchGender && matchKU;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const getWAUrl = () => {
    if (!receiptData) return "#";
    const text = `Halo Admin Panitia Kejuaraan Renang! Saya ingin mengonfirmasi pendaftaran:\n\n*Kode Resi*: ${receiptData.registration_code}\n*Nama Atlet*: ${name.toUpperCase()}\n*KU / Gender*: ${detectedKU} (${gender})\n*Klub*: ${club}\n*Total Biaya*: Rp ${totalFee.toLocaleString()}\n*Metode Bayar*: ${paymentMethod}\n*Pemilik Rekening*: ${senderBankOwner}\n\nMohon verifikasi berkas dan pembayaran saya. Terima kasih!`;
    return `https://wa.me/${appWa}?text=${encodeURIComponent(text)}`;
  };

  const handleCloseAndReset = () => {
    setStep(1);
    setName("");
    setGender("PUTRA");
    setBirthDate("2012-05-14");
    setDetectedKU("KU 2");
    setClub("");
    setDocType("Akte Kelahiran");
    setPic("");
    setContact("");
    setDocFileUrl("");
    setUploadingDoc(false);
    setSelectedEvents({});
    setPaymentMethod("BCA");
    setSenderBankOwner("");
    setProofFileUrl("");
    setUploadingProof(false);
    setSubmitting(false);
    setCopiedBank(false);
    setReceiptData(null);
    onClose();
  };

  return (
    <div
      ref={modalOuterRef}
      onClick={(e) => {
        if (e.target === modalOuterRef.current) handleCloseAndReset();
      }}
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* MODAL HEADER BANNER (STEPS 1-4) */}
        <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-blue-800 text-white p-5 sm:p-6 relative flex-shrink-0">
          <button
            onClick={handleCloseAndReset}
            className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
            title="Tutup Formulir"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-1.5 pr-8">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 bg-sky-400/20 text-sky-100 rounded-full text-[10px] font-black tracking-wider uppercase border border-sky-300/30">
                FORMULIR PENDAFTARAN PUBLIK
              </span>
              <span className="text-[10px] text-sky-200 font-bold">Bebas Login</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{compName}</h2>
            <p className="text-xs text-sky-100 font-medium truncate">{compLoc}</p>
          </div>

          {/* STEPPER PROGRESS BAR */}
          <div className="grid grid-cols-4 gap-2 pt-5 border-t border-white/15 mt-4">
            {[
              { num: 1, label: "1. Identitas Atlet" },
              { num: 2, label: "2. Pilih Nomor" },
              { num: 3, label: "3. Pembayaran" },
              { num: 4, label: "4. Bukti Resi" },
            ].map((s) => (
              <div key={s.num} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s.num ? "bg-emerald-400 shadow-sm" : "bg-white/20"
                  }`}
                />
                <p
                  className={`text-[10px] sm:text-xs font-bold truncate text-center ${
                    step === s.num ? "text-white" : "text-sky-200/70"
                  }`}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div ref={modalBodyRef} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 font-sans text-xs">
          {/* =================================================================== */}
          {/* STEP 1: IDENTITAS ATLET */}
          {/* =================================================================== */}
          {step === 1 && (
            <form onSubmit={handleGoToStep2} className="space-y-5">
              {/* Turnamen / Kejuaraan Selector */}
              <div>
                <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                  PILIH TURNAMEN / KEJUARAAN INDUK <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTournamentID}
                  onChange={(e) => setSelectedTournamentID(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  {(tournaments || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      🏆 {t.name} ({t.registration_end_date ? `Batas: ${t.registration_end_date}` : ""})
                    </option>
                  ))}
                </select>
              </div>

              {/* Deadline Status Banner */}
              {isRegistrationClosed ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900">
                  <span className="text-lg">🚫</span>
                  <div>
                    <h4 className="font-black text-xs">Pendaftaran Turnamen Telah Ditutup</h4>
                    <p className="text-[11px] text-red-700 font-medium leading-relaxed mt-0.5">
                      Batas waktu pendaftaran untuk {currentTourney?.name} telah berakhir pada{" "}
                      <span className="font-black underline">{currentTourney?.registration_end_date}</span>. Pendaftaran baru tidak dapat diproses.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3 text-sky-900">
                  <ShieldCheck className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black text-xs">Ketentuan Data Atlet</h4>
                    <p className="text-[11px] text-sky-700 font-medium leading-relaxed mt-0.5">
                      Data yang diisi akan diverifikasi oleh panitia untuk pembagian Kelompok Umur
                      (KU) dan pencetakan piagam resmi.
                    </p>
                  </div>
                </div>
              )}

              {/* Nama Lengkap Atlet */}
              <div>
                <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                  NAMA LENGKAP ATLET <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="CONTOH: MUHAMMAD ALFATIH"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 uppercase focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:normal-case placeholder:font-medium"
                />
              </div>

              {/* Jenis Kelamin & Tanggal Lahir */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                    JENIS KELAMIN <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender("PUTRA")}
                      className={`py-3 px-3 rounded-2xl font-black text-xs transition-all border ${
                        gender === "PUTRA"
                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      🏊‍♂️ Putra (Laki-laki)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("PUTRI")}
                      className={`py-3 px-3 rounded-2xl font-black text-xs transition-all border ${
                        gender === "PUTRI"
                          ? "bg-pink-600 text-white border-pink-600 shadow-md"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      🏊‍♀️ Putri (Perempuan)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                    TANGGAL LAHIR & KELOMPOK UMUR (KU) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className={`w-full px-4 py-3 bg-white border rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:outline-none transition-all ${
                      ageValidation.valid
                        ? "border-slate-300 focus:ring-sky-500"
                        : "border-rose-400 bg-rose-50/40 focus:ring-rose-500 text-rose-900"
                    }`}
                  />
                  
                  {/* Real-time Validasi Usia & KU Card */}
                  {ageValidation.valid ? (
                    <div className="mt-2 p-2.5 bg-sky-50/80 border border-sky-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-sky-950 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                          Usia: <span className="font-black text-sky-700">{ageValidation.age} Tahun</span>
                        </span>
                        <span className="px-2 py-0.5 bg-sky-600 text-white rounded-md font-black text-[10px] uppercase tracking-wider shadow-xs">
                          {ageValidation.ku}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-600">
                        {ageValidation.label} • Acuan Kejuaraan {tournamentYear}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{ageValidation.error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Asal Klub & Jenis Berkas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                    ASAL KLUB / SEKOLAH / INDEPENDEN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={club}
                    onChange={(e) => setClub(e.target.value)}
                    placeholder="Contoh: MASC Swim Club / SD Al-Azhar"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                    JENIS BERKAS VERIFIKASI
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="Akte Kelahiran">Akte Kelahiran</option>
                    <option value="Kartu Keluarga">Kartu Keluarga (KK)</option>
                    <option value="KTP / Kartu Identitas Anak">KTP / Kartu Identitas Anak</option>
                    <option value="Sertifikat NISN">Sertifikat NISN Sekolah</option>
                  </select>
                </div>
              </div>

              {/* Nama PIC & No WA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                    NAMA PIC / ORANG TUA / PELATIH
                  </label>
                  <input
                    type="text"
                    value={pic}
                    onChange={(e) => setPic(e.target.value)}
                    placeholder="Nama yang bisa dihubungi"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                    NO. WHATSAPP PIC (UNTUK KONFIRMASI) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={contact}
                    onChange={(e) => {
                      const numsOnly = e.target.value.replace(/\D/g, "");
                      setContact(numsOnly);
                    }}
                    onKeyDown={(e) => {
                      if (
                        ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) ||
                        (e.ctrlKey || e.metaKey)
                      ) {
                        return;
                      }
                      if (!/^[0-9]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="0812xxxxxxxx (Hanya Angka)"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Hanya angka (0-9), minimal 9 digit.</p>
                </div>
              </div>

              {/* Upload Foto Berkas */}
              <div>
                <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                  UPLOAD FOTO BERKAS ({docType.toUpperCase()}){" "}
                  <span className="text-red-500 font-black">* WAJIB DIUNGGAH</span>
                </label>

                {docFileUrl ? (
                  <div className="bg-sky-50/60 border-2 border-sky-300 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-sky-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Pratinjau Berkas ({docType}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setDocFileUrl("")}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>

                    <div className="relative rounded-xl overflow-hidden border border-sky-200 bg-white shadow-xs max-h-56 flex items-center justify-center group p-2">
                      {docFileUrl.toLowerCase().endsWith(".pdf") ? (
                        <div className="p-6 text-center space-y-2">
                          <FileText className="w-12 h-12 text-rose-500 mx-auto" />
                          <p className="font-black text-slate-800 text-xs">Dokumen PDF Terunggah</p>
                          <a
                            href={docFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-black text-sky-600 hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Buka PDF di Tab Baru
                          </a>
                        </div>
                      ) : (
                        <div className="relative w-full flex items-center justify-center">
                          <img
                            src={docFileUrl}
                            alt="Pratinjau Berkas Identitas"
                            className="max-h-48 w-auto object-contain rounded-lg shadow-2xs"
                          />
                          <a
                            href={docFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute inset-0 bg-slate-900/60 text-white font-bold text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg gap-1.5"
                          >
                            <Eye className="w-4 h-4" /> Buka Ukuran Penuh
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <a
                        href={docFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-sky-700 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Buka Berkas di Tab Baru
                      </a>
                      <label
                        htmlFor="doc-upload"
                        className="font-black text-sky-600 hover:text-sky-800 cursor-pointer underline"
                      >
                        Ganti File Foto
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 rounded-2xl p-4 text-center cursor-pointer transition-all">
                    <label htmlFor="doc-upload" className="cursor-pointer block space-y-2">
                      <Upload className={`w-6 h-6 text-sky-500 mx-auto ${uploadingDoc ? "animate-bounce" : ""}`} />
                      <div>
                        <p className="font-black text-slate-800 text-xs">
                          {uploadingDoc
                            ? "Sedang mengunggah berkas..."
                            : "Klik atau seret foto akte/KK ke sini (Wajib Diunggah)"}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Format JPG, PNG, WEBP, atau PDF (Maks. 5MB) •{" "}
                          <span className="text-red-600 font-black">Wajib diunggah</span>
                        </p>
                      </div>
                    </label>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocUpload}
                  className="hidden"
                  id="doc-upload"
                />
              </div>

              {/* Submit Button Step 1 */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isRegistrationClosed}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                    isRegistrationClosed
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                  }`}
                >
                  <span>{isRegistrationClosed ? "Pendaftaran Ditutup" : "Lanjut Pilih Nomor Lomba"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* STEP 2: PILIH NOMOR LOMBA */}
          {/* =================================================================== */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Athlete Summary Box */}
              <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-xs">
                    Atlet: {name.toUpperCase()} ({gender === "PUTRA" ? "Putra" : "Putri"})
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Klub: <span className="font-bold text-slate-700">{club}</span> • Usia:{" "}
                    <span className="font-bold text-slate-900">{ageValidation.age} Tahun</span> • Kategori:{" "}
                    <span className="font-black text-sky-600 px-1.5 py-0.5 bg-sky-100 rounded">{detectedKU}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block">Biaya per Nomor</span>
                  <span className="font-black text-slate-900 text-xs">Rp 150.000</span>
                </div>
              </div>

              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                    NOMOR LOMBA TERVALIDASI KATEGORI {detectedKU} & OPEN
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    Hanya nomor lomba yang sesuai dengan umur atlet ({detectedKU} {gender}) yang dapat dipilih
                  </p>
                </div>
                <span className="px-3 py-1 bg-sky-100 text-sky-700 text-[11px] font-black rounded-full shrink-0">
                  {totalSelectedCount} Nomor Dipilih
                </span>
              </div>

              {/* Event Cards Checklist */}
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {eligibleEvents.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <p className="font-black text-slate-700 text-xs">
                      Tidak ada nomor lomba kategori {detectedKU} ({gender}) pada kejuaraan ini.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Silakan periksa kembali tanggal lahir atlet pada Langkah 1 jika terjadi kekeliruan input tahun lahir.
                    </p>
                  </div>
                ) : (
                  eligibleEvents.map((evt) => {
                    const selected = selectedEvents[evt.id];
                    const isChecked = !!selected?.checked;

                    return (
                      <div
                        key={evt.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isChecked
                            ? "bg-sky-50/80 border-sky-400 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleEvent(evt.id)}
                              className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-sky-500 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded">
                                  #{evt.event_code}
                                </span>
                                <h4 className="font-black text-slate-900 text-xs">
                                  {evt.event_name}
                                </h4>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                                  Rp {Number(evt.fee || 150000).toLocaleString("id-ID")}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium mt-1">
                                {evt.age_group} • {evt.gender} • Jadwal:{" "}
                                {evt.schedule_time || "08:00 WIB"}
                              </p>
                            </div>
                          </label>

                          {/* Seed Time Input Field (Displays when Checked) */}
                          {isChecked && (
                            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-sky-200 shadow-xs">
                              <span className="text-[10px] font-bold text-slate-500 shrink-0">Seed Time:</span>
                              <SwimmingTimeInput
                                value={selected?.isNoTime ? "99.99.99" : (selected?.timeSeed || "00.30.00")}
                                onChange={(val) => handleSeedChange(evt.id, val)}
                                disabled={selected?.isNoTime}
                                size="sm"
                              />
                              <label
                                className="flex items-center gap-1 text-[10px] font-bold text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 shrink-0"
                                title="Centang jika belum memiliki catatan waktu resmi (otomatis 99.99.99)"
                              >
                                <input
                                  type="checkbox"
                                  checked={!!selected?.isNoTime}
                                  onChange={(e) => handleNoTimeToggle(evt.id, e.target.checked)}
                                  className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                                />
                                <span>Tanpa Waktu (99.99.99)</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sticky Price Calculation Summary Bar */}
              <div className="p-4 bg-[#091433] rounded-2xl text-white flex items-center justify-between shadow-md">
                <div>
                  <p className="text-[10px] text-slate-300 font-medium">Total Biaya Pendaftaran:</p>
                  <p className="text-xl font-black text-white">
                    Rp {totalFee.toLocaleString("id-ID")}
                  </p>
                </div>
                <p className="text-xs font-bold text-sky-400">
                  {totalSelectedCount} Nomor Lomba Terpilih
                </p>
              </div>

              {/* Navigation Controls Step 2 */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Data Atlet</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoToStep3}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 3: PEMBAYARAN */}
          {/* =================================================================== */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Total Payment Amount Banner */}
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-sky-700 font-bold">Total Yang Harus Dibayar:</p>
                  <p className="text-xl font-black text-sky-950">
                    Rp {totalFee.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full border border-amber-200 inline-block mb-1">
                    {totalSelectedCount} Nomor Lomba
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold">Menunggu Pembayaran</p>
                </div>
              </div>

              {/* Selected Events Breakdown Review */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 font-black text-slate-900">
                    <Trophy className="w-3.5 h-3.5 text-sky-600" />
                    Rincian {totalSelectedCount} Nomor Lomba yang Didaftarkan:
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-sky-600 hover:text-sky-800 text-[11px] font-black underline cursor-pointer"
                  >
                    Ubah Pilihan
                  </button>
                </div>
                <div className="divide-y divide-slate-200 max-h-36 overflow-y-auto">
                  {checkedEventEntries.map(([idStr, val]) => {
                    const foundEv = events.find((e) => Number(e.id) === Number(idStr));
                    return (
                      <div key={idStr} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block">
                            #{foundEv?.event_code} - {foundEv?.event_name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Seed: <strong className="font-mono text-amber-700">{val.isNoTime || val.timeSeed === "NT" ? "99:99.99" : (val.timeSeed || "99:99.99")}</strong> • {foundEv?.distance}
                          </span>
                        </div>
                        <span className="font-black text-emerald-700 text-xs">
                          Rp {Number(foundEv?.fee || 150000).toLocaleString("id-ID")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods Selector Tabs */}
              <div>
                <label className="block font-black text-slate-700 uppercase tracking-wider mb-2">
                  PILIH METODE PEMBAYARAN MANUAL
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("QRIS")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === "QRIS"
                        ? "bg-sky-50/80 border-sky-500 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-sky-600 mb-1" />
                    <p className="font-black text-slate-900 text-xs">QRIS / GoPay Barcode</p>
                    <p className="text-[10px] text-slate-400">Scan via Semua E-Wallet</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BCA")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === "BCA"
                        ? "bg-sky-50/80 border-sky-500 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Building className="w-5 h-5 text-blue-600 mb-1" />
                    <p className="font-black text-slate-900 text-xs">Transfer Bank BCA</p>
                    <p className="text-[10px] text-slate-400">Rekening Resmi Panitia</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Mandiri")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === "Mandiri"
                        ? "bg-sky-50/80 border-sky-500 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-indigo-600 mb-1" />
                    <p className="font-black text-slate-900 text-xs">Transfer Bank Mandiri</p>
                    <p className="text-[10px] text-slate-400">Rekening Resmi Panitia</p>
                  </button>
                </div>
              </div>

              {/* Selected Payment Bank Account Details Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                {paymentMethod === "BCA" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Bank Tujuan:</span>
                      <span className="text-xs font-black text-slate-900">
                        BANK CENTRAL ASIA (BCA)
                      </span>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">Nomor Rekening BCA:</p>
                        <p className="text-base font-black text-blue-700 tracking-wider">
                          8801-2903-8847
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          a.n MASC Swim Academy Official
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("880129038847")}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        {copiedBank ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedBank ? "Tersalin!" : "Salin No. Rek"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {paymentMethod === "Mandiri" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Bank Tujuan:</span>
                      <span className="text-xs font-black text-slate-900">BANK MANDIRI</span>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">
                          Nomor Rekening Mandiri:
                        </p>
                        <p className="text-base font-black text-indigo-700 tracking-wider">
                          137-00-1234567-8
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          a.n MASC Swim Academy Official
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("1370012345678")}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        {copiedBank ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedBank ? "Tersalin!" : "Salin No. Rek"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {paymentMethod === "QRIS" && (
                  <div className="text-center space-y-2 py-2">
                    <p className="text-xs font-black text-slate-800">
                      Scan QRIS Menggunakan GoPay, OVO, Dana, ShopeePay, atau Mobile Banking
                    </p>
                    <div className="w-40 h-40 mx-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MASC-SWIM-CHAMPIONSHIP-PAYMENT"
                        alt="QRIS Barcode"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sender Account Owner */}
              <div>
                <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                  NAMA PEMILIK REKENING PENGIRIM <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={senderBankOwner}
                  onChange={(e) => setSenderBankOwner(e.target.value)}
                  placeholder="Contoh: Budi Santoso / Akun GoPay Budi"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Upload Proof Screenshot */}
              <div>
                <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                  UPLOAD BUKTI STRUK TRANSFER / SCREENSHOT{" "}
                  <span className="text-red-500 font-black">* WAJIB DIUNGGAH</span>
                </label>

                {proofFileUrl ? (
                  <div className="bg-sky-50/60 border-2 border-sky-300 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-sky-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Pratinjau Bukti Transfer Pembayaran:
                      </span>
                      <button
                        type="button"
                        onClick={() => setProofFileUrl("")}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>

                    <div className="relative rounded-xl overflow-hidden border border-sky-200 bg-white shadow-xs max-h-56 flex items-center justify-center group p-2">
                      <div className="relative w-full flex items-center justify-center">
                        <img
                          src={proofFileUrl}
                          alt="Bukti Transfer Pembayaran"
                          className="max-h-48 w-auto object-contain rounded-lg shadow-2xs"
                        />
                        <a
                          href={proofFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-slate-900/60 text-white font-bold text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg gap-1.5"
                        >
                          <Eye className="w-4 h-4" /> Buka Ukuran Penuh
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <a
                        href={proofFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-sky-700 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Buka Bukti Bayar di Tab Baru
                      </a>
                      <label
                        htmlFor="proof-upload"
                        className="font-black text-sky-600 hover:text-sky-800 cursor-pointer underline"
                      >
                        Ganti Bukti Bayar
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 rounded-2xl p-4 text-center cursor-pointer transition-all">
                    <label htmlFor="proof-upload" className="cursor-pointer block space-y-2">
                      <Upload className={`w-6 h-6 text-sky-500 mx-auto ${uploadingProof ? "animate-bounce" : ""}`} />
                      <div>
                        <p className="font-black text-slate-800 text-xs">
                          {uploadingProof
                            ? "Sedang mengunggah bukti pembayaran..."
                            : "Klik atau seret screenshot bukti transfer ke sini"}
                        </p>
                        <p className="text-[10px] text-slate-400">Format PNG, JPG, JPEG (Maks. 5MB)</p>
                      </div>
                    </label>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleProofUpload}
                  className="hidden"
                  id="proof-upload"
                />
              </div>

              {/* Navigation Controls Step 3 */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Pilih Nomor</span>
                </button>
                <button
                  type="button"
                  disabled={submitting || uploadingProof}
                  onClick={handleSubmitRegistration}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Mengirim..." : "Kirim Pendaftaran & Bukti Transfer"}</span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 4: BUKTI RESI & TINDAKAN */}
          {/* =================================================================== */}
          {step === 4 && receiptData && (
            <div className="space-y-6 text-center py-2">
              {/* Success Check Icon */}
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black border border-emerald-200">
                  Pendaftaran Berhasil Dikirim
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Terima Kasih, Pendaftaran Anda Telah Diterima!
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                  Panitia akan memvalidasi bukti transfer dan data atlet. Status atlet otomatis
                  masuk ke daftar kejuaraan.
                </p>
              </div>

              {/* Receipt Card Container */}
              <div className="p-6 bg-white border-2 border-dashed border-sky-200 rounded-3xl text-left space-y-4 shadow-sm max-w-lg mx-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      KODE RESI PENDAFTARAN
                    </span>
                    <span className="text-lg font-black text-blue-700 tracking-wider">
                      {receiptData.registration_code}
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-black rounded-full border border-amber-200">
                    Menunggu Verifikasi
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Nama Atlet:</span>
                    <span className="font-black text-slate-900">{name.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Kategori & KU:</span>
                    <span className="font-black text-sky-600">
                      {detectedKU} ({gender === "PUTRA" ? "Putra" : "Putri"})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Klub / Sekolah:</span>
                    <span className="font-bold text-slate-700">{club}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Total Biaya:</span>
                    <span className="font-black text-emerald-600">
                      Rp {totalFee.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Registered Events Summary List */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Nomor Acara Terdaftar:
                  </span>
                  <div className="space-y-1.5">
                    {checkedEventEntries.map(([idStr, val]) => {
                      const evt = events.find((e) => e.id === Number(idStr));
                      return (
                        <div
                          key={idStr}
                          className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
                        >
                          <span className="font-bold text-slate-800">
                            #{evt?.event_code} {evt?.event_name} ({gender === "PUTRA" ? "Putra" : "Putri"})
                          </span>
                          <span className="font-mono text-[11px] font-black text-sky-600">
                            Seed: {val.isNoTime || val.timeSeed === "NT" ? "99:99.99" : (val.timeSeed || "99:99.99")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Final Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <a
                  href={getWAUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Konfirmasi WA ke Panitia</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Resi (A4 / PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseAndReset}
                  className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Tutup & Selesai</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
