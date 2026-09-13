"use client";

import { useState, useEffect } from "react";
import { getSections, saveSection } from "../lib/api-admin";
import { FileText, Save, CheckCircle2, Layout, Layers } from "lucide-react";

export default function SectionManager() {
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("hero_section");

  const [badgeText, setBadgeText] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const sectionOptions = [
    { code: "hero_section", name: "Hero Main Banner Section" },
    { code: "about_event", name: "Tentang Kejuaraan Renang 2025" },
    { code: "rules_section", name: "Peraturan & Ketentuan Lomba" },
    { code: "category_info", name: "Informasi Kelompok Umur & Gaya" },
    { code: "faq_section", name: "Tanya Jawab (FAQ Pendaftaran)" },
  ];

  const loadSections = async () => {
    const res = await getSections();
    if (res.success && res.data) {
      setSections(res.data);
      const curr = res.data.find((s: any) => s.section_code === selectedSection);
      if (curr) {
        setBadgeText(curr.badge_text || "");
        setTitle(curr.title || "");
        setDescription(curr.description || "");
        setIsPublished(curr.is_published ?? true);
      }
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const handleSectionSelect = (code: string) => {
    setSelectedSection(code);
    const curr = sections.find((s: any) => s.section_code === code);
    if (curr) {
      setBadgeText(curr.badge_text || "");
      setTitle(curr.title || "");
      setDescription(curr.description || "");
      setIsPublished(curr.is_published ?? true);
    } else {
      setBadgeText("");
      setTitle("");
      setDescription("");
      setIsPublished(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      page_slug: "homepage",
      section_code: selectedSection,
      badge_text: badgeText,
      title: title,
      description: description,
      is_published: isPublished,
    };

    const res = await saveSection(payload);
    if (res.success) {
      setMessage("Section berhasil disimpan & diperbarui!");
      loadSections();
    } else {
      setMessage("Gagal menyimpan section: " + (res.message || "Unknown error"));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-cyan-100 text-cyan-800 text-xs font-black rounded-lg">CMS CONTENT</span>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-600" /> Page Section Content Editor
            </h2>
          </div>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Ubah judul, badge, dan teks konten halaman utama kejuaraan secara cepat seperti pada Mitsui CMS.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section List Selector */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Layout className="w-4 h-4 text-sky-600" /> Pilih Halaman Section
          </h3>
          {sectionOptions.map((opt) => {
            const isSelected = selectedSection === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleSectionSelect(opt.code)}
                className={`w-full text-left p-3.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                  isSelected
                    ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-500/20"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                <span>{opt.name}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Section Editor Form */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Editing: <span className="text-sky-600">{sectionOptions.find((s) => s.code === selectedSection)?.name}</span>
              </h3>
              <p className="text-xs font-bold text-slate-500">Kode Section: {selectedSection}</p>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-xs font-bold ${message.includes("berhasil") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Badge Header Text</label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="e.g. INFORMASI PENTING"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-xs font-bold focus:bg-white focus:border-sky-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Judul Section (Title) *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masukkan judul section..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-xs font-bold focus:bg-white focus:border-sky-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Deskripsi Lengkap Section</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Detail deskripsi section..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-xs font-semibold focus:bg-white focus:border-sky-500 focus:outline-none transition-all resize-y"
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <input
                type="checkbox"
                id="is_published"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
              />
              <label htmlFor="is_published" className="text-xs font-bold text-slate-800 cursor-pointer">
                Publikasikan Section ini di Landing Web Utama
              </label>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-black rounded-2xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan Section"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
