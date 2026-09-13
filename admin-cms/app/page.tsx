"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootAdminPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("swimming_admin_token");
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
      Loading Admin CMS...
    </div>
  );
}
