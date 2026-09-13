"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { registerParticipant, uploadImage } from "../lib/api";

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

  // STEP 2 FIELDS
  const [selectedEvents, setSelectedEvents] = useState<{
    [eventId: number]: { checked: boolean; timeSeed: string; isNT: boolean };
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

  // Auto calculate KU based on birth date
  useEffect(() => {
    if (!birthDate) return;
    const birthYear = new Date(birthDate).getFullYear();
    const currentYear = 2026; // Championship year
    const age = currentYear - birthYear;

    if (age <= 10) setDetectedKU("KU 4");
    else if (age <= 12) setDetectedKU("KU 3");
    else if (age <= 14) setDetectedKU("KU 2");
    else if (age <= 17) setDetectedKU("KU 1");
    else setDetectedKU("Senior");
  }, [birthDate]);

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
          [eventId]: { checked: true, timeSeed: "00:30.00", isNT: false },
        };
      }
    });
  };

  const handleSeedChange = (eventId: number, timeSeed: string) => {
    setSelectedEvents((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId], timeSeed, isNT: false },
    }));
  };

  const handleNTToggle = (eventId: number, isNT: boolean) => {
    setSelectedEvents((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        isNT,
        timeSeed: isNT ? "NT" : "00:30.00",
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
    if (!club.trim()) {
      alert("Asal klub / sekolah wajib diisi");
      return;
    }
    if (!contact.trim()) {
      alert("Nomor WhatsApp PIC wajib diisi");
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
    // proofFileUrl is optional on initial submission, user can confirm via WhatsApp

    setSubmitting(true);
    const eventSelections = checkedEventEntries.map(([idStr, val]) => ({
      swimming_event_id: Number(idStr),
      time_seed: val.isNT ? "NT" : val.timeSeed || "NT",
    }));

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* MODAL HEADER BANNER (STEPS 1-4) */}
        <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-blue-800 text-white p-5 sm:p-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
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
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 font-sans text-xs">
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
                    TANGGAL LAHIR & KU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 text-sky-600 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Terdeteksi otomatis: {detectedKU}</span>
                  </div>
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
                    type="text"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload Foto Berkas */}
              <div>
                <label className="block font-black text-slate-700 uppercase tracking-wider mb-1">
                  UPLOAD FOTO BERKAS ({docType.toUpperCase()}){" "}
                  <span className="text-slate-400 font-medium">(OPSIONAL SAAT DAFTAR)</span>
                </label>
                <div className="border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 rounded-2xl p-4 text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleDocUpload}
                    className="hidden"
                    id="doc-upload"
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer block space-y-2">
                    <Upload className="w-6 h-6 text-sky-500 mx-auto" />
                    <div>
                      <p className="font-black text-slate-800 text-xs">
                        {uploadingDoc
                          ? "Mengunggah berkas..."
                          : docFileUrl
                          ? "✓ Berkas Berhasil Diunggah"
                          : "Klik atau seret foto akte/KK ke sini"}
                      </p>
                      <p className="text-[10px] text-slate-400">Format JPG, PNG, atau PDF (Maks. 5MB)</p>
                    </div>
                  </label>
                </div>
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
                    Klub: <span className="font-bold text-slate-700">{club}</span> • Kategori:{" "}
                    <span className="font-black text-sky-600">{detectedKU}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block">Biaya per Nomor</span>
                  <span className="font-black text-slate-900 text-xs">Rp 150.000</span>
                </div>
              </div>

              {/* Section Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                  DAFTAR NOMOR LOMBA SESUAI {detectedKU}
                </h3>
                <span className="px-3 py-1 bg-sky-100 text-sky-700 text-[11px] font-black rounded-full">
                  {totalSelectedCount} Nomor Dipilih
                </span>
              </div>

              {/* Event Cards Checklist */}
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {eligibleEvents.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 font-medium">
                    Tidak ada nomor lomba yang sesuai untuk kategori {detectedKU} ({gender}).
                  </p>
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
                              <span className="text-[10px] font-bold text-slate-500">Seed Time:</span>
                              <input
                                type="text"
                                disabled={selected?.isNT}
                                value={selected?.isNT ? "NT" : selected?.timeSeed}
                                onChange={(e) => handleSeedChange(evt.id, e.target.value)}
                                placeholder="00:30.00"
                                className="w-20 px-2 py-1 text-center font-mono text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100"
                              />
                              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!selected?.isNT}
                                  onChange={(e) => handleNTToggle(evt.id, e.target.checked)}
                                  className="w-3.5 h-3.5 rounded text-blue-600"
                                />
                                <span>NT</span>
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
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full border border-amber-200">
                  Menunggu Pembayaran
                </span>
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
                  UPLOAD BUKTI STRUK TRANSFER / SCREENSHOT <span className="text-slate-400 font-medium">(OPSIONAL VIA FORM / BISA DILAMPIRKAN SAAT CHAT WA)</span>
                </label>
                <div className="border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 rounded-2xl p-4 text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    className="hidden"
                    id="proof-upload"
                  />
                  <label htmlFor="proof-upload" className="cursor-pointer block space-y-2">
                    <Upload className="w-6 h-6 text-sky-500 mx-auto" />
                    <div>
                      <p className="font-black text-slate-800 text-xs">
                        {uploadingProof
                          ? "Mengunggah bukti pembayaran..."
                          : proofFileUrl
                          ? "✓ Bukti Transfer Berhasil Diunggah"
                          : "Klik atau seret screenshot bukti transfer ke sini"}
                      </p>
                      <p className="text-[10px] text-slate-400">Format PNG, JPG, JPEG (Maks. 5MB)</p>
                    </div>
                  </label>
                </div>
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
                            Seed: {val.isNT ? "NT" : val.timeSeed}
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
                <a
                  href="/buku-acara"
                  className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>Lihat Bagan (Heat Sheet)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
