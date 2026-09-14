"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Image as ImageIcon,
  LogOut,
  CheckSquare,
  Waves,
  GraduationCap,
  Settings,
  UserCheck,
  Building2,
  Trophy,
  MessageSquareQuote,
  ListOrdered,
  Award,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function Sidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const router = useRouter();

  // Collapsible state per group title (false = expanded, true = collapsed)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem("swimming_admin_token");
    router.push("/login");
  };

  const menuGroups = [
    {
      title: "UTAMA",
      items: [
        { id: "dashboard", label: "Dashboard Utama", icon: LayoutDashboard },
      ],
    },
    {
      title: "MANAJEMEN KEJUARAAN",
      items: [
        { id: "registrations", label: "Kelola Pendaftaran", icon: Users },
        { id: "buku-acara", label: "Buku Acara & Heat", icon: Calendar },
        { id: "results", label: "Catat Hasil Lomba", icon: CheckSquare },
        { id: "tournaments", label: "Master Turnamen", icon: Trophy },
        { id: "events", label: "Master Nomor Lomba", icon: ListOrdered },
      ],
    },
    {
      title: "KONTEN LANDING PAGE",
      items: [
        { id: "banners", label: "Kelola Banner & Hero", icon: ImageIcon },
        { id: "programs", label: "Program Pelatihan", icon: GraduationCap },
        { id: "coaches", label: "Tim Pelatih", icon: UserCheck },
        { id: "facility", label: "Fasilitas Kolam", icon: Building2 },
        { id: "achievement", label: "Prestasi & Medali", icon: Award },
        { id: "testimonial", label: "Testimoni & Ulasan", icon: MessageSquareQuote },
        { id: "layout-order", label: "Urutan Menu Landing Page", icon: ArrowUpDown },
      ],
    },
    {
      title: "PENGATURAN",
      items: [
        { id: "settings", label: "Pengaturan Umum", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen p-5 flex flex-col justify-between shadow-sm flex-shrink-0 font-sans">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* SIDEBAR LOGO HEADER */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="p-2.5 bg-sky-500 rounded-xl text-white shadow-md">
            <Waves className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-wider">CMS AKUATIK</h1>
            <p className="text-[10px] text-sky-600 font-bold">ADMIN DASHBOARD 2025</p>
          </div>
        </div>

        {/* SCROLLABLE GROUPED NAV WITH COLLAPSIBLE ACCORDION */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
          {menuGroups.map((group, groupIdx) => {
            const isCollapsed = !!collapsedGroups[group.title];

            return (
              <div key={groupIdx} className="space-y-1.5">
                {/* COLLAPSIBLE SECTION HEADER BUTTON */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-all group cursor-pointer"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-slate-900">
                    {group.title}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded-full">
                      {group.items.length}
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                    )}
                  </div>
                </button>

                {/* GROUP ITEMS LIST */}
                {!isCollapsed && (
                  <div className="space-y-1 pl-1 transition-all">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                            isActive
                              ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* LOGOUT BUTTON */}
      <div className="pt-4 border-t border-slate-100 shrink-0 mt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all border border-red-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar (Logout)</span>
        </button>
      </div>
    </aside>
  );
}
