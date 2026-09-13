"use client";

import { useState } from "react";
import { verifyPayment } from "../lib/api-admin";
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink,
  Filter,
  Trophy,
  User,
  Calendar,
  Phone,
  Mail,
  Building,
  CreditCard,
  FileText,
  Clock,
  ShieldCheck,
  AlertCircle,
  Layers,
  MessageSquare,
  Sparkles,
  Check,
  RefreshCw,
  Maximize2,
  X,
  UserCheck,
  Tag,
} from "lucide-react";

interface ParticipantTableProps {
  registrations: any[];
  tournaments?: any[];
  onRefresh: () => void;
}

interface SwimmerGroup {
  group_key: string;
  registration_code: string;
  participant: any;
  payment_method: string;
  sender_bank_owner: string;
  payment_proof_url: string;
  status: string;
  total_fee: number;
  items: any[];
}

export default function ParticipantTable({
  registrations = [],
  tournaments = [],
  onRefresh,
}: ParticipantTableProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterTournamentID, setFilterTournamentID] = useState("ALL");

  // Selected Group Registration for Modal View
  const [selectedGroup, setSelectedGroup] = useState<SwimmerGroup | null>(null);

  // Fullscreen Image Preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>("");
  const [verifyingGroupKey, setVerifyingGroupKey] = useState<string | null>(null);

  // =========================================================================
  // 1. GROUP REGISTRATIONS BY SWIMMER / REGISTRATION CODE
  // =========================================================================
  const groupMap: { [key: string]: SwimmerGroup } = {};

  registrations.forEach((r) => {
    const code = r.registration_code || `REG-P-${r.participant_id || r.id}`;
    const pName = r.participant?.name || "Perenang";
    const groupKey = `${code}_${pName}`;

    if (!groupMap[groupKey]) {
      groupMap[groupKey] = {
        group_key: groupKey,
        registration_code: r.registration_code || code,
        participant: r.participant || {},
        payment_method: r.payment_method || "BCA",
        sender_bank_owner: r.sender_bank_owner || "-",
        payment_proof_url: r.payment_proof_url || "",
        status: r.payment_status || "pending",
        total_fee: 0,
        items: [],
      };
    }

    const grp = groupMap[groupKey];
    grp.items.push(r);

    // Keep payment proof if any item has it
    if (!grp.payment_proof_url && r.payment_proof_url) {
      grp.payment_proof_url = r.payment_proof_url;
    }
    if (r.payment_method && grp.payment_method === "BCA") {
      grp.payment_method = r.payment_method;
    }
    if (r.sender_bank_owner && grp.sender_bank_owner === "-") {
      grp.sender_bank_owner = r.sender_bank_owner;
    }

    const fee = r.swimming_event?.fee ? Number(r.swimming_event.fee) : 150000;
    grp.total_fee += fee;
  });

  // Calculate unified group status
  const swimmerGroups: SwimmerGroup[] = Object.values(groupMap).map((grp) => {
    const statuses = grp.items.map((i) => i.payment_status);
    let unifiedStatus = "pending";
    if (statuses.every((s) => s === "verified")) {
      unifiedStatus = "verified";
    } else if (statuses.every((s) => s === "rejected")) {
      unifiedStatus = "rejected";
    } else if (statuses.some((s) => s === "verified")) {
      unifiedStatus = "verified";
    } else if (statuses.some((s) => s === "rejected")) {
      unifiedStatus = "rejected";
    }
    return {
      ...grp,
      status: unifiedStatus,
    };
  });

  // Count Statistics (Grouped per Swimmer)
  const countPending = swimmerGroups.filter((g) => g.status === "pending").length;
  const countVerified = swimmerGroups.filter((g) => g.status === "verified").length;
  const countRejected = swimmerGroups.filter((g) => g.status === "rejected").length;

  // Filter Logic on Swimmer Groups
  const filteredGroups = swimmerGroups.filter((g) => {
    // 1. Status Filter
    const matchStatus = filterStatus === "ALL" || g.status === filterStatus;

    // 2. Tournament Filter (Matches if any item belongs to selected tournament)
    const matchTourney =
      filterTournamentID === "ALL" ||
      g.items.some((item) => {
        const tourneyID =
          item.swimming_event?.tournament_id || item.swimming_event?.tournament?.id;
        return String(tourneyID) === String(filterTournamentID);
      });

    // 3. Search Query
    const q = search.toLowerCase();
    const matchQuery =
      !q ||
      g.registration_code?.toLowerCase().includes(q) ||
      g.participant?.name?.toLowerCase().includes(q) ||
      g.participant?.club?.toLowerCase().includes(q) ||
      g.participant?.pic?.toLowerCase().includes(q) ||
      g.items.some(
        (item) =>
          item.swimming_event?.event_name?.toLowerCase().includes(q) ||
          String(item.swimming_event?.event_code).includes(q)
      );

    return matchStatus && matchTourney && matchQuery;
  });

  // Group Verify Handler (Approves / Rejects all sub-events of a swimmer)
  const handleVerifyGroupStatus = async (group: SwimmerGroup, status: string) => {
    setVerifyingGroupKey(group.group_key);
    try {
      await Promise.all(group.items.map((item) => verifyPayment(item.id, status)));
      setVerifyingGroupKey(null);

      // Update active modal if open
      if (selectedGroup && selectedGroup.group_key === group.group_key) {
        const updatedItems = selectedGroup.items.map((i) => ({
          ...i,
          payment_status: status,
        }));
        setSelectedGroup({
          ...selectedGroup,
          status,
          items: updatedItems,
        });
      }
      onRefresh();
    } catch (err) {
      setVerifyingGroupKey(null);
      alert("Terjadi kesalahan saat memverifikasi pendaftaran perenang ini.");
    }
  };

  const openDocPreview = (url: string, title: string) => {
    setPreviewImageUrl(url);
    setPreviewImageTitle(title);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER CONTROLS & FILTER BAR */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* SEARCH INPUT & TOURNAMENT DROPDOWN */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama perenang, kode, klub, event..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
              />
            </div>

            {/* Tournament Selector Filter */}
            {tournaments && tournaments.length > 0 && (
              <div className="relative">
                <select
                  value={filterTournamentID}
                  onChange={(e) => setFilterTournamentID(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-sky-50 border border-sky-300 rounded-2xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer shadow-xs"
                >
                  <option value="ALL">🏆 Semua Kejuaraan Induk</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      🏆 {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* COUNTER BADGE */}
          <div className="text-xs font-bold text-slate-500 self-start lg:self-center">
            Menampilkan <span className="text-sky-700 font-black">{filteredGroups.length}</span> Perenang (Total{" "}
            <span className="font-black text-slate-800">{swimmerGroups.length}</span> Pendaftaran Group)
          </div>
        </div>

        {/* STATUS TAB BUTTONS */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
          {[
            { id: "ALL", label: "Semua Perenang", count: swimmerGroups.length, color: "sky" },
            { id: "pending", label: "PENDING VERIFIKASI", count: countPending, color: "amber" },
            { id: "verified", label: "TERVERIFIKASI (VERIFIED)", count: countVerified, color: "emerald" },
            { id: "rejected", label: "DITOLAK (REJECTED)", count: countRejected, color: "red" },
          ].map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive
                      ? "bg-white/20 text-white"
                      : tab.id === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : tab.id === "verified"
                      ? "bg-emerald-100 text-emerald-800"
                      : tab.id === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-slate-200 text-slate-800"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GROUPED REGISTRATIONS TABLE */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider">
              <th className="p-4">KODE REGISTRASI</th>
              <th className="p-4">PERENANG / ATLET</th>
              <th className="p-4">KLUB / KONTINGEN</th>
              <th className="p-4">SUB NOMOR LOMBA TERDAFTAR</th>
              <th className="p-4 text-center">TOTAL BIAYA</th>
              <th className="p-4 text-center">BERKAS & BAYAR</th>
              <th className="p-4 text-center">STATUS</th>
              <th className="p-4 text-right">AKSI VERIFIKASI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500 font-medium space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="font-bold text-sm text-slate-700">Tidak ada data pendaftaran yang sesuai dengan filter.</p>
                  <p className="text-xs text-slate-400">Coba ubah status tab atau kata kunci pencarian di atas.</p>
                </td>
              </tr>
            ) : (
              filteredGroups.map((g) => {
                const p = g.participant || {};
                const hasDoc = !!p.verification_doc_url;
                const hasProof = !!g.payment_proof_url;

                return (
                  <tr key={g.group_key} className="hover:bg-sky-50/40 transition-colors group">
                    {/* Kode Registrasi */}
                    <td className="p-4 font-mono font-bold text-sky-700">
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 bg-sky-50 rounded-xl text-sky-800 border border-sky-200 text-xs font-black inline-block">
                          {g.registration_code}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {g.items.length} Nomor Lomba
                        </span>
                      </div>
                    </td>

                    {/* Nama Perenang */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-black text-slate-900 uppercase text-xs block group-hover:text-sky-700 transition-colors">
                          {p.name || "-"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              p.gender === "PUTRA" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                            }`}
                          >
                            {p.gender || "PUTRA"}
                          </span>
                          {p.age_group && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black">
                              {p.age_group}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Klub / Kontingen */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-800 block text-xs">{p.club || "-"}</span>
                        {p.pic && (
                          <span className="text-[10px] text-slate-500 font-medium block">
                            PIC: {p.pic} {p.contact ? `(${p.contact})` : ""}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Sub Nomor Lomba (Pills List) */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {g.items.map((item) => (
                          <span
                            key={item.id}
                            className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-xl text-[11px] font-bold border border-slate-200 flex items-center gap-1"
                          >
                            <span className="text-sky-700 font-black">#{item.swimming_event?.event_code}</span>
                            <span className="truncate max-w-[140px]">{item.swimming_event?.event_name}</span>
                            <span className="text-[10px] font-mono text-amber-700 font-black">
                              ({item.time_seed || "NT"})
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Total Biaya */}
                    <td className="p-4 text-center">
                      <div className="space-y-0.5">
                        <span className="font-black text-emerald-700 text-xs block">
                          Rp {g.total_fee.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          ({g.items.length} Nomor)
                        </span>
                      </div>
                    </td>

                    {/* Berkas & Bayar Indicators */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {hasDoc ? (
                          <span
                            title="Berkas Identitas Diunggah"
                            className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black border border-emerald-200"
                          >
                            Dok OK
                          </span>
                        ) : (
                          <span
                            title="Berkas Belum Ada"
                            className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[10px] font-bold"
                          >
                            No Dok
                          </span>
                        )}

                        {hasProof ? (
                          <span
                            title="Bukti Bayar Diunggah"
                            className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md text-[10px] font-black border border-sky-200"
                          >
                            Bayar OK
                          </span>
                        ) : (
                          <span
                            title="Bukti Bayar Belum Ada"
                            className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold"
                          >
                            Pending Bayar
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Unified Status Badge */}
                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${
                          g.status === "verified"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : g.status === "rejected"
                            ? "bg-red-100 text-red-800 border border-red-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            g.status === "verified"
                              ? "bg-emerald-600"
                              : g.status === "rejected"
                              ? "bg-red-600"
                              : "bg-amber-600"
                          }`}
                        />
                        {g.status}
                      </span>
                    </td>

                    {/* Group Action Buttons */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Detail Modal Trigger */}
                        <button
                          onClick={() => setSelectedGroup(g)}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white rounded-xl text-xs font-extrabold transition-all border border-sky-200 flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail ({g.items.length})</span>
                        </button>

                        {/* Group Quick Approve */}
                        {g.status !== "verified" && (
                          <button
                            onClick={() => handleVerifyGroupStatus(g, "verified")}
                            disabled={verifyingGroupKey === g.group_key}
                            title="Setujui Semua Nomor Lomba Perenang Ini"
                            className="p-1.5 bg-emerald-100 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-xl text-xs transition-all border border-emerald-200 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Group Quick Reject */}
                        {g.status !== "rejected" && (
                          <button
                            onClick={() => handleVerifyGroupStatus(g, "rejected")}
                            disabled={verifyingGroupKey === g.group_key}
                            title="Tolak Pendaftaran Perenang Ini"
                            className="p-1.5 bg-red-100 hover:bg-red-600 text-red-800 hover:text-white rounded-xl text-xs transition-all border border-red-200 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* =================================================================== */}
      {/* GROUPED VERIFICATION & REGISTRATION DETAIL MODAL */}
      {/* =================================================================== */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* MODAL HEADER */}
            <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-800 text-white p-5 sm:p-6 relative flex-shrink-0">
              <button
                onClick={() => setSelectedGroup(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1.5 pr-8">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 bg-sky-400/20 text-sky-100 rounded-full text-[10px] font-black tracking-wider uppercase border border-sky-300/30">
                    VERIFIKASI GROUP PENDAFTARAN PERENANG
                  </span>
                  <span className="font-mono text-xs text-sky-200 font-black">
                    {selectedGroup.registration_code}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                  {selectedGroup.participant?.name || "Nama Perenang"}
                </h2>
                <p className="text-xs text-sky-100 font-medium">
                  {selectedGroup.participant?.club || "-"} • {selectedGroup.participant?.gender || "PUTRA"} • KU:{" "}
                  {selectedGroup.participant?.age_group || "-"} • {selectedGroup.items.length} Nomor Lomba Terdaftar
                </p>
              </div>
            </div>

            {/* MODAL BODY (3-COLUMN DETAILED VIEW) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* COLUMN 1: IDENTITAS ATLET & PIC */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-sky-700">
                    <User className="w-4 h-4" />
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">
                      Identitas Atlet & PIC
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">NAMA LENGKAP:</span>
                      <span className="font-black text-slate-900 uppercase block">
                        {selectedGroup.participant?.name || "-"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">GENDER:</span>
                        <span className="font-black text-slate-900">
                          {selectedGroup.participant?.gender || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">KELOMPOK UMUR:</span>
                        <span className="font-black text-sky-700">
                          {selectedGroup.participant?.age_group || "-"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">TANGGAL LAHIR:</span>
                      <span className="font-bold text-slate-800">
                        {selectedGroup.participant?.birth_date || "-"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">KLUB / KONTINGEN:</span>
                      <span className="font-black text-slate-900">
                        {selectedGroup.participant?.club || "-"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">ORANG TUA / PIC:</span>
                      <span className="font-bold text-slate-800">
                        {selectedGroup.participant?.pic || "-"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">WHATSAPP CONTACT:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-slate-900">
                          {selectedGroup.participant?.contact || "-"}
                        </span>
                        {selectedGroup.participant?.contact && (
                          <a
                            href={`https://wa.me/${selectedGroup.participant.contact.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black hover:bg-emerald-200 transition-colors flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> WA
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: SUB NOMOR LOMBA & PEMBAYARAN */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-indigo-700">
                    <Trophy className="w-4 h-4" />
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">
                      Rincian Nomor Lomba ({selectedGroup.items.length})
                    </h3>
                  </div>

                  {/* LIST OF ALL SUB-EVENTS FOR THIS SWIMMER */}
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedGroup.items.map((item, idx) => (
                      <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-indigo-700 text-xs">
                            #{item.swimming_event?.event_code} - {item.swimming_event?.event_name}
                          </span>
                          <span className="font-mono text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Seed: {item.time_seed || "NT"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                          <span>
                            {item.swimming_event?.distance} | {item.swimming_event?.stroke}
                          </span>
                          <span className="font-black text-emerald-700">
                            Rp {item.swimming_event?.fee ? Number(item.swimming_event.fee).toLocaleString("id-ID") : "150.000"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">TOTAL PEMBAYARAN:</span>
                      <span className="font-black text-emerald-700 text-sm">
                        Rp {selectedGroup.total_fee.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">METODE BAYAR:</span>
                      <span className="font-bold text-slate-900">{selectedGroup.payment_method}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">ATAS NAMA PENGIRIM:</span>
                      <span className="font-black text-slate-900">{selectedGroup.sender_bank_owner}</span>
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: PRATINJAU DOKUMEN BERKAS & BUKTI BAYAR */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-amber-700">
                    <FileText className="w-4 h-4" />
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">
                      Pratinjau Dokumen Berkas
                    </h3>
                  </div>

                  {/* 1. Berkas Verifikasi (Akte/KK) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-black block uppercase">
                      1. BERKAS IDENTITAS ({selectedGroup.participant?.verification_doc_type || "Akte Kelahiran"})
                    </span>

                    {selectedGroup.participant?.verification_doc_url ? (
                      <div className="bg-white p-2 rounded-xl border border-slate-200 relative group overflow-hidden">
                        <img
                          src={selectedGroup.participant.verification_doc_url}
                          alt="Berkas Identitas"
                          className="w-full h-28 object-cover rounded-lg"
                        />
                        <button
                          onClick={() =>
                            openDocPreview(
                              selectedGroup.participant.verification_doc_url,
                              `Berkas Identitas: ${selectedGroup.participant?.name}`
                            )
                          }
                          className="absolute inset-0 bg-slate-900/60 text-white font-bold text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-4 h-4" /> Perbesar
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-100 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 font-bold text-[11px]">
                        Berkas belum diunggah
                      </div>
                    )}
                  </div>

                  {/* 2. Bukti Transfer Pembayaran */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-black block uppercase">
                      2. BUKTI TRANSFER PEMBAYARAN
                    </span>

                    {selectedGroup.payment_proof_url ? (
                      <div className="bg-white p-2 rounded-xl border border-slate-200 relative group overflow-hidden">
                        <img
                          src={selectedGroup.payment_proof_url}
                          alt="Bukti Transfer"
                          className="w-full h-28 object-cover rounded-lg"
                        />
                        <button
                          onClick={() =>
                            openDocPreview(
                              selectedGroup.payment_proof_url,
                              `Bukti Transfer: ${selectedGroup.registration_code}`
                            )
                          }
                          className="absolute inset-0 bg-slate-900/60 text-white font-bold text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-4 h-4" /> Perbesar
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-100 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 font-bold text-[11px]">
                        Bukti bayar belum diunggah
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER ACTION BAR */}
            <div className="bg-slate-100 p-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Status Saat Ini:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    selectedGroup.status === "verified"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : selectedGroup.status === "rejected"
                      ? "bg-red-100 text-red-800 border border-red-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  {selectedGroup.status || "pending"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Approve Button */}
                <button
                  onClick={() => handleVerifyGroupStatus(selectedGroup, "verified")}
                  disabled={verifyingGroupKey === selectedGroup.group_key || selectedGroup.status === "verified"}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Setujui Semua (Verified)</span>
                </button>

                {/* Reject Button */}
                <button
                  onClick={() => handleVerifyGroupStatus(selectedGroup, "rejected")}
                  disabled={verifyingGroupKey === selectedGroup.group_key || selectedGroup.status === "rejected"}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Tolak Semua (Rejected)</span>
                </button>

                {/* Reset to Pending */}
                <button
                  onClick={() => handleVerifyGroupStatus(selectedGroup, "pending")}
                  disabled={verifyingGroupKey === selectedGroup.group_key || selectedGroup.status === "pending"}
                  className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Set Pending
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FULLSCREEN IMAGE PREVIEW MODAL */}
      {/* =================================================================== */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">{previewImageTitle}</h3>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-900 rounded-2xl overflow-hidden max-h-[70vh] flex items-center justify-center">
              <img
                src={previewImageUrl}
                alt="Preview"
                className="max-h-[68vh] object-contain rounded-xl"
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka di Tab Baru
              </a>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
