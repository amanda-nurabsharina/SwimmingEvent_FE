"use client";

import { useState, useEffect } from "react";
import { fetchAdminSiteConfig, saveAdminSiteConfig, uploadImage } from "../lib/api-admin";
import { Settings, Save, Upload, Phone, Globe, Mail, MapPin, Check, MessageSquare, Share2 } from "lucide-react";

export default function SettingsManager({ onRefresh }: { onRefresh: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [appName, setAppName] = useState("AKUATIK TANGERANG");
  const [appTagline, setAppTagline] = useState("TIME TRIAL CHAMPIONSHIP 2025");
  const [logoUrl, setLogoUrl] = useState("");
  const [waNumber, setWaNumber] = useState("6281234567890");
  const [defaultWaTemplate, setDefaultWaTemplate] = useState(
    "Halo Admin Akuatik Tangerang, saya mau menanyakan informasi seputar kejuaraan dan program pelatihan renang."
  );
  const [footerDescription, setFooterDescription] = useState(
    "Membangun Karakter, Mengasah Teknik, Mencetak Juara Renang Masa Depan"
  );
  const [footerText, setFooterText] = useState(
    "© 2025 Akuatik Tangerang. All rights reserved. Platform Resmi Kejuaraan & Pembinaan Atlet Renang."
  );
  const [email, setEmail] = useState("info@akuatik-tangerang.id");
  const [address, setAddress] = useState("Aquatic Center Complex, Jl. Pintu Satu Senayan No. 8, Jakarta Pusat");

  // Social Links
  const [instagramUrl, setInstagramUrl] = useState("https://instagram.com");
  const [youtubeUrl, setYoutubeUrl] = useState("https://youtube.com");
  const [tiktokUrl, setTiktokUrl] = useState("https://tiktok.com");
  const [facebookUrl, setFacebookUrl] = useState("https://facebook.com");

  const [uploadingLogo, setUploadingLogo] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchAdminSiteConfig();
    if (res.success && res.data) {
      const d = res.data;
      if (d.app_name) setAppName(d.app_name);
      if (d.app_tagline) setAppTagline(d.app_tagline);
      if (d.logo_url !== undefined) setLogoUrl(d.logo_url);
      if (d.wa_number) setWaNumber(d.wa_number);
      if (d.default_wa_template) setDefaultWaTemplate(d.default_wa_template);
      if (d.footer_description) setFooterDescription(d.footer_description);
      if (d.footer_text) setFooterText(d.footer_text);
      if (d.email) setEmail(d.email);
      if (d.address) setAddress(d.address);
      if (d.instagram_url !== undefined) setInstagramUrl(d.instagram_url);
      if (d.youtube_url !== undefined) setYoutubeUrl(d.youtube_url);
      if (d.tiktok_url !== undefined) setTiktokUrl(d.tiktok_url);
      if (d.facebook_url !== undefined) setFacebookUrl(d.facebook_url);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const res = await uploadImage(file);
    setUploadingLogo(false);
    if (res.success && res.url) {
      setLogoUrl(res.url);
    } else {
      alert("Gagal mengunggah logo: " + (res.message || "Error"));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      app_name: appName,
      app_tagline: appTagline,
      logo_url: logoUrl,
      wa_number: waNumber,
      default_wa_template: defaultWaTemplate,
      footer_description: footerDescription,
      footer_text: footerText,
      email,
      address,
      instagram_url: instagramUrl,
      youtube_url: youtubeUrl,
      tiktok_url: tiktokUrl,
      facebook_url: facebookUrl,
    };

    const res = await saveAdminSiteConfig(payload);
    setSaving(false);
    if (res.success) {
      alert("Pengaturan Umum berhasil diperbarui!");
      onRefresh();
    } else {
      alert("Gagal menyimpan pengaturan: " + (res.message || "Error"));
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Pengaturan Umum (General Settings)
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Atur Logo, Nama Organisasi/Aplikasi, Subtitle Header, Nomor WhatsApp, Media Sosial & Footer
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Memuat pengaturan umum...</div>
      ) : (
        <form onSubmit={handleSave} className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          {/* SECTION 1: LOGO & APP BRANDING */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-sky-700 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              1. Identitas Branding & Header Logo
            </h2>

            {/* Logo Preview & Upload */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-900 overflow-hidden border border-slate-300 flex items-center justify-center flex-shrink-0 shadow-inner">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Brand" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center p-2">
                    <span className="text-[10px] font-black text-sky-400">NO LOGO</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-xs font-bold text-slate-800">File Logo Organisasi (Dipakai di Header Navbar & Footer)</label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-sm transition-all">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingLogo ? "Mengunggah Logo..." : "📂 Pilih Berkas Logo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Atau tempel URL gambar logo..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Utama Aplikasi / Organisasi *
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. AKUATIK TANGERANG"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-black shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tagline Subtitle Header
                </label>
                <input
                  type="text"
                  value={appTagline}
                  onChange={(e) => setAppTagline(e.target.value)}
                  placeholder="e.g. TIME TRIAL CHAMPIONSHIP 2025"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: SOCIAL MEDIA LINKS */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-black uppercase tracking-wider text-pink-700 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              2. Link Media Sosial (Tampil di Footer)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Link Instagram (IG)
                </label>
                <input
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/akuatik_tangerang"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold shadow-sm focus:border-pink-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Link YouTube
                </label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@akuatiktangerang"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold shadow-sm focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Link TikTok
                </label>
                <input
                  type="text"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@akuatiktangerang"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold shadow-sm focus:border-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Link Facebook (Opsional)
                </label>
                <input
                  type="text"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/akuatiktangerang"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold shadow-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: WHATSAPP NUMBER & CHAT INTEGRATION */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              3. Kontak Resmi WhatsApp Chat Integration
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nomor WhatsApp Utama (Gunakan Kode Negara 62) *
                </label>
                <input
                  type="text"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  placeholder="e.g. 6281234567890 (Tanpa +, spasi, atau 0 depan)"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono font-bold shadow-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Pesan Default WhatsApp Chat
                </label>
                <input
                  type="text"
                  value={defaultWaTemplate}
                  onChange={(e) => setDefaultWaTemplate(e.target.value)}
                  placeholder="Pesan umum bawaan jika pengunjung mengklik kontak WA..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: FOOTER & CONTACT DETAILS */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              4. Informasi Alamat, Email, Slogan & Footer Copyright
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Slogan / Deskripsi Singkat Footer (Bawah Logo)</label>
              <textarea
                rows={2}
                value={footerDescription}
                onChange={(e) => setFooterDescription(e.target.value)}
                placeholder="e.g. Membangun Karakter, Mengasah Teknik, Mencetak Juara Renang Masa Depan"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Email Resmi</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@akuatik-tangerang.id"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Alamat Kolam / Lokasi</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Aquatic Center Complex, Jl. Pintu Satu Senayan No. 8, Jakarta Pusat"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Teks Footer Copyright</label>
              <textarea
                rows={2}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold shadow-sm focus:border-sky-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-700/20 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {saving ? "Menyimpan Pengaturan..." : "Simpan Semua Pengaturan Umum"}
          </button>
        </form>
      )}
    </div>
  );
}
