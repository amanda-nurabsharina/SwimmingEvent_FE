"use client";

import { useState, useEffect } from "react";
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Users,
  Lock,
  Mail,
  User,
  Shield,
  KeyRound,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  fetchAdminRoles,
} from "../lib/api-admin";
import { RoleItem } from "./RoleManager";

export interface UserItem {
  id: number;
  username: string;
  email: string;
  role_id?: number;
  role_name: string;
  role?: RoleItem;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function UserManager({ onRefresh }: { onRefresh?: () => void }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role_id: 0,
    status: "active",
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [userRes, roleRes] = await Promise.all([
      fetchAdminUsers(),
      fetchAdminRoles(),
    ]);

    if (userRes && userRes.success && userRes.data) {
      setUsers(userRes.data);
    }
    if (roleRes && roleRes.success && roleRes.data) {
      setRoles(roleRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role_id: roles.length > 0 ? roles[0].id : 0,
      status: "active",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      confirmPassword: "",
      role_id: user.role_id || (roles.find((r) => r.name === user.role_name)?.id || 0),
      status: user.status || "active",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) {
      if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
        alert("Username, email, dan password wajib diisi");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        alert("Konfirmasi password tidak cocok");
        return;
      }
      if (formData.password.length < 6) {
        alert("Password minimal harus 6 karakter");
        return;
      }
    } else {
      if (formData.password && formData.password !== formData.confirmPassword) {
        alert("Konfirmasi password baru tidak cocok");
        return;
      }
      if (formData.password && formData.password.length < 6) {
        alert("Password baru minimal harus 6 karakter");
        return;
      }
    }

    if (!formData.role_id) {
      alert("Silakan pilih role untuk user ini");
      return;
    }

    setSaving(true);
    let res;

    if (editingUser) {
      res = await updateAdminUser(editingUser.id, {
        email: formData.email,
        password: formData.password ? formData.password : undefined,
        role_id: formData.role_id,
        status: formData.status,
      });
    } else {
      res = await createAdminUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role_id: formData.role_id,
        status: formData.status,
      });
    }

    setSaving(false);

    if (res && res.success) {
      setIsModalOpen(false);
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert(res?.message || "Gagal menyimpan user");
    }
  };

  const handleDelete = async (user: UserItem) => {
    if (user.username === "admin") {
      alert("User admin utama tidak dapat dihapus.");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus user admin "${user.username}"?`)) {
      return;
    }

    const res = await deleteAdminUser(user.id);
    if (res && res.success) {
      loadData();
      if (onRefresh) onRefresh();
    } else {
      alert(res?.message || "Gagal menghapus user");
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole !== "ALL" && u.role_name !== filterRole) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-full text-[11px] font-black tracking-wider uppercase mb-3 shadow-2xs">
            <UserCog className="w-3.5 h-3.5 text-sky-600" />
            MANAJEMEN PENGGUNA CMS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Kelola Akun User Admin
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-2xl">
            Buat akun panitia, atur kredensial login, dan tetapkan role hak akses ke masing-masing pengguna.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadData}
            className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title="Segarkan data user"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah User Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari username, email, atau role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
          >
            <option value="ALL">Semua Role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>

          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
            Total: <strong>{filteredUsers.length} User</strong>
          </span>
        </div>
      </div>

      {/* 3. Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-4 px-5">User</th>
                <th className="py-4 px-5">Role Ditugaskan</th>
                <th className="py-4 px-5">Hak Akses Menu</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Terdaftar</th>
                <th className="py-4 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Tidak ada user yang ditemukan
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isMainAdmin = u.username === "admin";
                  const isSuperAdmin = u.role_name === "Super Admin";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* User Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-2xs shrink-0">
                            {u.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 flex items-center gap-1.5">
                              <span>{u.username}</span>
                              {isMainAdmin && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded">
                                  UTAMA
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-5">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide inline-flex items-center gap-1.5 shadow-2xs ${
                            isSuperAdmin
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {u.role_name}
                        </span>
                      </td>

                      {/* Permissions */}
                      <td className="py-4 px-5">
                        {isSuperAdmin || u.role?.permissions?.includes("*") ? (
                          <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Akses Menyeluruh
                          </span>
                        ) : u.role && u.role.permissions ? (
                          <span className="text-[11px] font-bold text-slate-600">
                            {u.role.permissions.length} Menu Diizinkan
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        {u.status === "active" ? (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-5 text-slate-400 font-medium text-[11px]">
                        {u.created_at || "-"}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="Edit Akun User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isMainAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Hapus Akun User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* 4. Modal Tambah / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingUser ? `Ubah User: ${editingUser.username}` : "Tambah User Baru"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Atur username, email, role, dan kredensial login
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
            <form onSubmit={handleSave} className="space-y-4">
              {/* Username */}
              <div>
                <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Contoh: wasit_jody"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Contoh: panitia@akuatik-tangerang.id"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">
                  Tugaskan Role (Hak Akses) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.role_id}
                  onChange={(e) =>
                    setFormData({ ...formData, role_id: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={0} disabled>
                    Pilih Role...
                  </option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.is_system ? "(Super Admin - Akses Penuh)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">
                  Status Akun
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === "active"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span>Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === "inactive"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span>Nonaktif</span>
                  </label>
                </div>
              </div>

              {/* Password */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div>
                  <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">
                    {editingUser ? "Password Baru (Kosongkan jika tidak diganti)" : "Password"} {!editingUser && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {(!editingUser || formData.password) && (
                  <div>
                    <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">
                      Konfirmasi Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      placeholder="Ulangi password di atas"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs rounded-xl shadow-md shadow-sky-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Menyimpan..." : editingUser ? "Simpan Perubahan" : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
