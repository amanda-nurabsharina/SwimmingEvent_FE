"use client";

export default function Navbar() {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
      {/* Left Active Module Badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
          MODUL AKTIF:
        </span>
        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-black rounded-md">
          CMS
        </span>
      </div>

      {/* Middle Website Title */}
      <div className="hidden md:flex items-center gap-2 text-xs font-black text-slate-800">
        <span>Mitsui Leasing Website Revamp</span>
      </div>

      {/* Right User Profile */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-900 text-white font-black text-xs flex items-center justify-center border-2 border-blue-500 shadow-sm">
            SU
          </div>
          <div className="text-right hidden sm:block leading-tight">
            <div className="text-xs font-black text-slate-900">Superadmin User</div>
            <div className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online & Terautentikasi
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
