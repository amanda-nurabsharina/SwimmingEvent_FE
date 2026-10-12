"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Award,
  Phone,
  Calendar,
  School,
  User,
  Shield,
  FileText,
  Activity,
  X,
  Upload,
} from "lucide-react";
import {
  getClubMembers,
  createClubMember,
  updateClubMember,
  deleteClubMember,
  getClubMemberSpeedHistory,
  uploadImage,
} from "../lib/api-admin";
import { toast } from "./Toast";

export interface ClubMember {
  id: number;
  member_number: string;
  full_name: string;
  nickname?: string;
  gender: string;
  birth_place?: string;
  birth_date?: string;
  phone?: string;
  parent_name?: string;
  parent_phone?: string;
  email?: string;
  address?: string;
  school?: string;
  join_date?: string;
  status: string;
  photo_url?: string;
  document_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export default function MascMemberManager() {
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    member_number: "",
    full_name: "",
    nickname: "",
    gender: "PUTRA",
    birth_place: "",
    birth_date: "",
    phone: "",
    parent_name: "",
    parent_phone: "",
    email: "",
    address: "",
    school: "",
    join_date: new Date().toISOString().split("T")[0],
    status: "active",
    photo_url: "",
    document_url: "",
    notes: "",
  });

  // Speed History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historyMember, setHistoryMember] = useState<ClubMember | null>(null);
  const [speedHistory, setSpeedHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const fetchMembers = async () => {
    setLoading(true);
    const res = await getClubMembers({
      search,
      status: statusFilter,
      gender: genderFilter,
    });
    if (res.success) {
      setMembers(res.data || []);
    } else {
      toast.error(res.message || "Gagal memuat data anggota");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [statusFilter, genderFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers();
  };

  const openCreateModal = () => {
    setEditingMember(null);
    setFormData({
      member_number: "",
      full_name: "",
      nickname: "",
      gender: "PUTRA",
      birth_place: "",
      birth_date: "",
      phone: "",
      parent_name: "",
      parent_phone: "",
      email: "",
      address: "",
      school: "",
      join_date: new Date().toISOString().split("T")[0],
      status: "active",
      photo_url: "",
      document_url: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (member: ClubMember) => {
    setEditingMember(member);
    setFormData({
      member_number: member.member_number || "",
      full_name: member.full_name || "",
      nickname: member.nickname || "",
      gender: member.gender || "PUTRA",
      birth_place: member.birth_place || "",
      birth_date: member.birth_date || "",
      phone: member.phone || "",
      parent_name: member.parent_name || "",
      parent_phone: member.parent_phone || "",
      email: member.email || "",
      address: member.address || "",
      school: member.school || "",
      join_date: member.join_date || "",
      status: member.status || "active",
      photo_url: member.photo_url || "",
      document_url: member.document_url || "",
      notes: member.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "photo_url" | "document_url") => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    toast.info("Mengunggah berkas...");
    const res = await uploadImage(file);
    if (res.success && res.url) {
      setFormData((prev) => ({ ...prev, [field]: res.url }));
      toast.success("Berkas berhasil diunggah");
    } else {
      toast.error("Gagal mengunggah berkas");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_number.trim()) {
      toast.error("Nomor anggota wajib diisi manual oleh admin!");
      return;
    }
    if (!formData.full_name.trim()) {
      toast.error("Nama lengkap wajib diisi!");
      return;
    }

    setFormSubmitting(true);
    let res;
    if (editingMember) {
      res = await updateClubMember(editingMember.id, formData);
    } else {
      res = await createClubMember(formData);
    }
    setFormSubmitting(false);

    if (res.success) {
      toast.success(editingMember ? "Data anggota berhasil diperbarui" : "Anggota baru berhasil didaftarkan");
      setIsModalOpen(false);
      fetchMembers();
    } else {
      toast.error(res.message || "Gagal menyimpan data anggota");
    }
  };

  const handleDeleteMember = async (member: ClubMember) => {
    if (!confirm(`Hapus anggota "${member.full_name}" (${member.member_number})?`)) return;
    const res = await deleteClubMember(member.id);
    if (res.success) {
      toast.success("Anggota berhasil dihapus");
      fetchMembers();
    } else {
      toast.error(res.message || "Gagal menghapus anggota");
    }
  };

  const handleViewSpeedHistory = async (member: ClubMember) => {
    setHistoryMember(member);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    const res = await getClubMemberSpeedHistory(member.id);
    if (res.success) {
      setSpeedHistory(res.data || []);
    } else {
      setSpeedHistory([]);
    }
    setLoadingHistory(false);
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return "-";
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? `${age} Tahun` : "-";
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl text-white shadow-md shadow-sky-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Anggota & Peserta MASC Swim Club</h1>
              <p className="text-xs font-bold text-slate-500">Database master resmi atlet renang MASC dengan nomor anggota manual</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMembers}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold text-xs flex items-center gap-2"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-500/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Tambah Anggota Klub
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, nomor anggota, panggilan, atau kontak..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Gender:</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="bg-transparent font-black text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua</option>
              <option value="PUTRA">Putra</option>
              <option value="PUTRI">Putri</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-black text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua</option>
              <option value="active">Aktif</option>
              <option value="inactive">Non-Aktif</option>
              <option value="leave">Cuti</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE DATA ANGGOTA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider">
                <th className="p-3.5 pl-5">NO. ANGGOTA</th>
                <th className="p-3.5">NAMA ATLET / PERENANG</th>
                <th className="p-3.5">GENDER / USIA</th>
                <th className="p-3.5">KONTAK / ORTU</th>
                <th className="p-3.5">SEKOLAH</th>
                <th className="p-3.5 text-center">STATUS</th>
                <th className="p-3.5 pr-5 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
                    Memuat data anggota klub...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    Belum ada data anggota yang terdaftar atau cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition group">
                    <td className="p-3.5 pl-5">
                      <span className="font-mono font-black text-sky-700 bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-lg">
                        {m.member_number}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        {m.photo_url ? (
                          <img
                            src={m.photo_url}
                            alt={m.full_name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black">
                            {m.full_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-black text-slate-900 uppercase leading-snug">{m.full_name}</p>
                          {m.nickname && <p className="text-[11px] font-semibold text-slate-400">Panggilan: {m.nickname}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-black mr-2 ${
                          m.gender === "PUTRA" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                        }`}
                      >
                        {m.gender}
                      </span>
                      <span className="font-bold text-slate-600">{calculateAge(m.birth_date)}</span>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-800">{m.phone || "-"}</p>
                      {m.parent_name && (
                        <p className="text-[10px] text-slate-400 font-medium">Ortu: {m.parent_name}</p>
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-slate-600">{m.school || "-"}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          m.status === "active"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : m.status === "leave"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {m.status === "active"
                          ? "AKTIF"
                          : m.status === "leave"
                          ? "CUTI"
                          : m.status === "alumni"
                          ? "ALUMNI"
                          : "NON-AKTIF"}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewSpeedHistory(m)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg transition"
                          title="Lihat Riwayat Speed / Test Time Trial"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(m)}
                          className="p-1.5 hover:bg-sky-50 text-sky-600 hover:text-sky-700 rounded-lg transition"
                          title="Edit Data Anggota"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m)}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition"
                          title="Hapus Anggota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM PENDAFTARAN / EDIT ANGGOTA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* MODAL HEADER */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500 text-white rounded-xl shadow-md shadow-sky-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingMember ? "Edit Data Anggota MASC" : "Form Pendaftaran Anggota Baru MASC Swim"}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    Nomor anggota diinput manual oleh admin sesuai kode penomoran klub
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL BODY */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* SECTION 1: NOMOR ANGGOTA & IDENTITAS UTAMA */}
              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 space-y-4">
                <h4 className="font-black text-sky-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-sky-600" />
                  1. Nomor Anggota & Identitas Atlet
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-black text-slate-700 mb-1">
                      NO. ANGGOTA (MANUAL) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: MASC-001 / 2026-088"
                      value={formData.member_number}
                      onChange={(e) => setFormData({ ...formData, member_number: e.target.value })}
                      required
                      className="w-full px-3 py-2 font-mono font-bold text-sky-800 bg-white border border-sky-300 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-700 mb-1">
                      NAMA LENGKAP <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nama lengkap atlet"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-700 mb-1">NAMA PANGGILAN</label>
                    <input
                      type="text"
                      placeholder="Panggilan akrab"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-black text-slate-700 mb-1">JENIS KELAMIN</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    >
                      <option value="PUTRA">PUTRA</option>
                      <option value="PUTRI">PUTRI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-black text-slate-700 mb-1">TEMPAT LAHIR</label>
                    <input
                      type="text"
                      placeholder="Kota Lahir (e.g. Tangerang)"
                      value={formData.birth_place}
                      onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-700 mb-1">TANGGAL LAHIR</label>
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: KONTAK & WALI */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-slate-600" />
                  2. Kontak & Orang Tua / Wali
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-black text-slate-700 mb-1">NO. WA / HP ATLET</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0812xxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-3 py-2 font-bold font-mono text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-700 mb-1">NAMA ORANG TUA / WALI</label>
                    <input
                      type="text"
                      placeholder="Nama ayah / ibu"
                      value={formData.parent_name}
                      onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-700 mb-1">NO. WA ORANG TUA</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0813xxxx"
                      value={formData.parent_phone}
                      onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-3 py-2 font-bold font-mono text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-black text-slate-700 mb-1">ASAL SEKOLAH</label>
                    <input
                      type="text"
                      placeholder="Nama sekolah atlet"
                      value={formData.school}
                      onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-700 mb-1">EMAIL (OPSIONAL)</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1">ALAMAT TINGGAL</label>
                  <textarea
                    rows={2}
                    placeholder="Alamat lengkap domisili"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                  />
                </div>
              </div>

              {/* SECTION 3: KEANGGOTAAN & FOTO */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  3. Status Keanggotaan & Berkas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-black text-slate-700 mb-1">TANGGAL GABUNG KLUB</label>
                    <input
                      type="date"
                      value={formData.join_date}
                      onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-700 mb-1">STATUS KEANGGOTAAN</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    >
                      <option value="active">AKTIF</option>
                      <option value="inactive">NON-AKTIF</option>
                      <option value="leave">CUTI SEMENTARA</option>
                      <option value="alumni">ALUMNI</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-black text-slate-700 mb-1">PAS FOTO ATLET</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "photo_url")}
                        className="text-[11px] font-bold text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-sky-500 file:text-white file:font-bold hover:file:bg-sky-600 cursor-pointer"
                      />
                    </div>
                    {formData.photo_url && (
                      <img
                        src={formData.photo_url}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded-xl mt-2 border border-slate-200 shadow-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block font-black text-slate-700 mb-1">CATATAN KHUSUS / PELATIH</label>
                    <textarea
                      rows={2}
                      placeholder="Catatan kesehatan, alergi, atau pesan pelatih..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* FOOTER BUTTONS */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-md shadow-sky-500/20 transition disabled:opacity-50"
                >
                  {formSubmitting ? "Menyimpan..." : editingMember ? "Simpan Perubahan" : "Daftarkan Anggota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT SPEED / PERSONAL BEST TIME TRIAL */}
      {isHistoryModalOpen && historyMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Riwayat Catatan Speed Time Trial</h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    Atlet: <span className="text-emerald-700">{historyMember.full_name}</span> ({historyMember.member_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingHistory ? (
                <div className="text-center py-8 text-slate-400 font-bold">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                  Mengambil riwayat kecepatan atlet...
                </div>
              ) : speedHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Belum ada catatan waktu hasil Time Trial untuk atlet ini.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 font-black text-slate-600 border-b border-slate-200 uppercase">
                        <th className="p-3">SESI TIME TRIAL</th>
                        <th className="p-3">NOMOR GAYA</th>
                        <th className="p-3 text-center">WAKTU SPEED</th>
                        <th className="p-3 text-center">RANK</th>
                        <th className="p-3">CATATAN PELATIH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {speedHistory.map((h, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">
                            {h.heat?.session?.title || "Sesi Time Trial"}
                          </td>
                          <td className="p-3 font-black text-sky-700 uppercase">
                            {h.heat?.stroke?.name || "-"}
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-sm">
                              {h.result_time}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {h.rank > 0 ? (
                              <span className="font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                                #{h.rank}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-3 text-slate-500 font-medium">{h.coach_notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-xl text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
