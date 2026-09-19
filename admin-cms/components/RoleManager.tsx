"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Users,
  Lock,
  Sparkles,
  Layers,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
} from "lucide-react";
import {
  fetchAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
} from "../lib/api-admin";

export interface RoleItem {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  users_count: number;
  created_at: string;
  updated_at: string;
}

export const SYSTEM_MODULES = [
  {
    group: "UTAMA",
    items: [
      { id: "dashboard", label: "Dashboard Utama", desc: "Ringkasan metrik, statistik peserta & turnamen" },
    ],
  },
  {
    group: "OPERASIONAL PANITIA",
    items: [
      { id: "results", label: "Catat Hasil Lomba", desc: "Input catatan waktu, diskualifikasi & ranking seri/group" },
      { id: "whatsapp-broadcast", label: "Broadcast WhatsApp PIC", desc: "Kirim pengumuman otomatis via WhatsApp Baileys" },
      { id: "race-result-logs", label: "Log Audit Hasil Lomba", desc: "Riwayat pencatatan waktu & audit trail juri" },
    ],
  },
  {
    group: "MANAJEMEN KEJUARAAN",
    items: [
      { id: "registrations", label: "Kelola Pendaftaran", desc: "Verifikasi bukti bayar & data pendaftaran peserta" },
      { id: "buku-acara", label: "Buku Acara & Heat", desc: "Susun seri lomba, lintasan, dan publikasi bagan" },
      { id: "form-timer", label: "Cetak Form Timer Juri", desc: "Cetak blanko pencatat waktu fisik untuk wasit" },
      { id: "tournaments", label: "Master Turnamen", desc: "Tambah & kelola kalender kejuaraan renang" },
      { id: "events", label: "Master Nomor Lomba", desc: "Tambah & atur nomor lomba (KU, gaya, jarak, jenis heat/group)" },
    ],
  },
  {
    group: "KONTEN LANDING PAGE",
    items: [
      { id: "banners", label: "Kelola Banner & Hero", desc: "Slide banner utama dan tagline landing page publik" },
      { id: "programs", label: "Program Pelatihan", desc: "Manajemen paket latihan renang & akademi" },
      { id: "coaches", label: "Tim Pelatih", desc: "Profil pelatih kepala & instruktur" },
      { id: "facility", label: "Fasilitas Kolam", desc: "Informasi fasilitas & spesifikasi kolam renang" },
      { id: "achievement", label: "Prestasi & Medali", desc: "Daftar perolehan prestasi & torehan piala" },
      { id: "testimonial", label: "Testimoni & Ulasan", desc: "Ulasan dari orang tua atlet & peserta" },
      { id: "layout-order", label: "Urutan Menu Landing Page", desc: "Urutan tata letak section landing page publik" },
    ],
  },
  {
    group: "PENGATURAN",
    items: [
      { id: "settings", label: "Pengaturan Umum", desc: "Nama sistem, logo, nomor WA resmi, email, kontak" },
      { id: "roles", label: "Kelola Role & Hak Akses", desc: "Manajemen jabatan & hak akses menu admin" },
      { id: "users", label: "Kelola User & Admin", desc: "Manajemen akun admin & penetapan role pengguna" },
    ],
  },
];

export default function RoleManager({ onRefresh }: { onRefresh?: () => void }) {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    permissions: string[];
  }>({
    name: "",
    description: "",
    permissions: [],
  });
  const [saving, setSaving] = useState(false);

  const loadRoles = async () => {
    setLoading(true);
    const res = await fetchAdminRoles();
    if (res && res.success && res.data) {
      setRoles(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      permissions: ["dashboard"],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role: RoleItem) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || [],
    });
    setIsModalOpen(true);
  };

  const handleTogglePermission = (moduleId: string) => {
    if (editingRole?.is_system) return; // Super Admin always full access

    setFormData((prev) => {
      const exists = prev.permissions.includes(moduleId);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter((p) => p !== moduleId) };
      } else {
        return { ...prev, permissions: [...prev.permissions, moduleId] };
      }
    });
  };

  const handleSelectAllPermissions = () => {
    if (editingRole?.is_system) return;
    const allModuleIds: string[] = [];
    SYSTEM_MODULES.forEach((group) => {
      group.items.forEach((item) => allModuleIds.push(item.id));
    });
    setFormData((prev) => ({ ...prev, permissions: allModuleIds }));
  };

  const handleDeselectAllPermissions = () => {
    if (editingRole?.is_system) return;
    setFormData((prev) => ({ ...prev, permissions: [] }));
  };

  const handleToggleGroup = (groupItems: { id: string }[]) => {
    if (editingRole?.is_system) return;
    const groupIds = groupItems.map((i) => i.id);
    const allSelected = groupIds.every((id) => formData.permissions.includes(id));

    setFormData((prev) => {
      if (allSelected) {
        return {
          ...prev,
          permissions: prev.permissions.filter((id) => !groupIds.includes(id)),
        };
      } else {
        const set = new Set([...prev.permissions, ...groupIds]);
        return { ...prev, permissions: Array.from(set) };
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Nama role wajib diisi");
      return;
    }

    setSaving(true);
    let res;
    if (editingRole) {
      res = await updateAdminRole(editingRole.id, formData);
    } else {
      res = await createAdminRole(formData);
    }
    setSaving(false);

    if (res && res.success) {
      setIsModalOpen(false);
      loadRoles();
      if (onRefresh) onRefresh();
    } else {
      alert(res?.message || "Gagal menyimpan role");
    }
  };

  const handleDelete = async (role: RoleItem) => {
    if (role.is_system) {
      alert("Role Super Admin bawaan sistem tidak dapat dihapus.");
      return;
    }

    if (role.users_count > 0) {
      alert(
        `Role "${role.name}" sedang digunakan oleh ${role.users_count} user admin. Silakan pindahkan role user tersebut terlebih dahulu sebelum menghapus.`
      );
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus role "${role.name}"?`)) return;

    const res = await deleteAdminRole(role.id);
    if (res && res.success) {
      loadRoles();
      if (onRefresh) onRefresh();
    } else {
      alert(res?.message || "Gagal menghapus role");
    }
  };

  const filteredRoles = roles.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[11px] font-black tracking-wider uppercase mb-3 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            HAK AKSES & KEAMANAN SISTEM
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Kelola Role & Hak Akses Menu
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-2xl">
            Tentukan kewenangan setiap pengguna admin dengan mengatur akses menu secara presisi. Role Super Admin selalu memiliki akses penuh ke seluruh fitur.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadRoles}
            className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title="Segarkan data role"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Role Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Overview */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama role atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">
          Total: <strong>{roles.length} Role Terdaftar</strong>
        </span>
      </div>

      {/* 3. Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRoles.map((role) => {
          const isSuperAdmin = role.is_system || role.name === "Super Admin";
          const hasWildcard = isSuperAdmin || role.permissions.includes("*");

          return (
            <div
              key={role.id}
              className={`bg-white rounded-3xl p-6 border-2 flex flex-col justify-between transition-all shadow-xs hover:shadow-md ${
                isSuperAdmin
                  ? "border-indigo-300 ring-2 ring-indigo-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-4">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-900 text-base">
                        {role.name}
                      </h3>
                      {isSuperAdmin && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> SUPER ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {role.description || "Tidak ada deskripsi tambahan"}
                    </p>
                  </div>

                  <div className="px-2.5 py-1 bg-slate-100 rounded-xl text-slate-700 text-xs font-black flex items-center gap-1.5 shrink-0">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{role.users_count} User</span>
                  </div>
                </div>

                {/* Permissions Preview */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Hak Akses Menu:
                  </span>
                  {hasWildcard ? (
                    <div className="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-xs font-bold text-indigo-950 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Akses Menyeluruh (Semua Menu Admin Terbuka)</span>
                    </div>
                  ) : role.permissions.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-bold text-amber-800">
                      Belum ada izin menu yang diberikan
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {role.permissions.map((perm) => {
                        let label = perm;
                        for (const group of SYSTEM_MODULES) {
                          const match = group.items.find((i) => i.id === perm);
                          if (match) {
                            label = match.label;
                            break;
                          }
                        }
                        return (
                          <span
                            key={perm}
                            className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg truncate max-w-[160px]"
                            title={label}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-5 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(role)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Ubah</span>
                </button>

                {!isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(role)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Modal Tambah / Ubah Role */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingRole ? `Ubah Role: ${editingRole.name}` : "Tambah Role Baru"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Atur nama jabatan dan daftar hak akses menu yang diizinkan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-5 overflow-y-auto pr-1 flex-1">
              {/* Nama Role */}
              <div>
                <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">
                  Nama Role <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={editingRole?.is_system}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Operator Lomba, Wasit Timer, Humas"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">
                  Deskripsi Tanggung Jawab
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ringkasan tugas atau peruntukan role ini"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Hak Akses Menu */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-800 block">
                      Pengaturan Hak Akses Menu Sidebar
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Menu yang dicentang akan otomatis muncul di navigasi admin pengguna
                    </p>
                  </div>

                  {!editingRole?.is_system && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllPermissions}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllPermissions}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Kosongkan
                      </button>
                    </div>
                  )}
                </div>

                {editingRole?.is_system ? (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1 text-xs text-indigo-950 font-medium">
                    <p className="font-black">👑 Role Super Admin Memiliki Akses Menyeluruh</p>
                    <p className="text-[11px] text-indigo-800">
                      Seluruh modul, manajemen kejuaraan, pengaturan sistem, dan database terbuka penuh untuk role ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {SYSTEM_MODULES.map((group) => {
                      const groupIds = group.items.map((i) => i.id);
                      const isGroupAllSelected = groupIds.every((id) =>
                        formData.permissions.includes(id)
                      );

                      return (
                        <div
                          key={group.group}
                          className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                              {group.group}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleGroup(group.items)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
                            >
                              {isGroupAllSelected ? "Batal Bagian Ini" : "Pilih Bagian Ini"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.items.map((item) => {
                              const checked = formData.permissions.includes(item.id);
                              return (
                                <label
                                  key={item.id}
                                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                                    checked
                                      ? "bg-white border-indigo-400 shadow-2xs ring-1 ring-indigo-200"
                                      : "bg-white/60 border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleTogglePermission(item.id)}
                                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <div className="space-y-0.5">
                                    <div className="text-xs font-black text-slate-800">
                                      {item.label}
                                    </div>
                                    <div className="text-[10px] text-slate-400 leading-tight">
                                      {item.desc}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Menyimpan..." : editingRole ? "Simpan Perubahan" : "Buat Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
