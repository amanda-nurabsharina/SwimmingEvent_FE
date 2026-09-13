const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

function getAuthHeaders(customToken?: string) {
  const token = customToken || (typeof window !== "undefined" ? localStorage.getItem("swimming_admin_token") : "");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

// ----------------------------------------------------------------------
// 0. AUTHENTICATION & LOGIN
// ----------------------------------------------------------------------
export async function adminLogin(credentialsOrEmail: any, passwordArg?: string) {
  try {
    let payload = credentialsOrEmail;
    if (typeof credentialsOrEmail === "string") {
      payload = { username: credentialsOrEmail, password: passwordArg };
    }
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 1. FILE & IMAGE UPLOAD
// ----------------------------------------------------------------------
export async function uploadAdminImage(token: string, file: File) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/admin/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (json.success && (json.data?.url || json.url)) {
      const rawUrl = json.data?.url || json.url || "";
      const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
      const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${baseUrl}${rawUrl}`;
      return {
        success: true,
        url: fullUrl,
        data: { ...json.data, url: fullUrl },
      };
    }
    return json;
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function uploadImage(file: File) {
  const token = typeof window !== "undefined" ? localStorage.getItem("swimming_admin_token") || "" : "";
  return uploadAdminImage(token, file);
}

// ----------------------------------------------------------------------
// 2. REGISTRATION & PARTICIPANT MANAGEMENT
// ----------------------------------------------------------------------
export async function getRegistrations() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/registrations`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchAdminRegistrations(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/registrations`, {
      headers: getAuthHeaders(token),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function verifyPayment(id: number, status: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/registrations/${id}/verify`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ payment_status: status }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 3. BUKU ACARA & RACE RESULTS
// ----------------------------------------------------------------------
export async function generateBukuAcara(maxLanes?: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/buku-acara/generate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ max_lanes: maxLanes || 3 }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function recordRaceResult(id: number, finalTime: string, rank: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/registrations/${id}/result`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ final_time: finalTime, rank }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function updateRaceResult(id: number, heat: number, lane: number, seedTime: string, finalTime: string, status: string, rank: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/registrations/${id}/result`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ heat_number: heat, lane_number: lane, seed_time: seedTime, final_time: finalTime, status, rank }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 4. BANNERS API
// ----------------------------------------------------------------------
export async function getBanners() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/banners`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchAdminBanners(token?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/banners`, {
      headers: getAuthHeaders(token),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveBanner(bannerData: any) {
  try {
    const isEdit = bannerData.id && bannerData.id > 0;
    const url = isEdit ? `${API_BASE_URL}/admin/banners/${bannerData.id}` : `${API_BASE_URL}/admin/banners`;
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(bannerData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function createAdminBanner(token: string, data: any) {
  return saveBanner(data);
}

export async function updateAdminBanner(token: string, id: number, data: any) {
  return saveBanner({ ...data, id });
}

export async function deleteBanner(id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/banners/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function deleteAdminBanner(token: string, id: number) {
  return deleteBanner(id);
}

// ----------------------------------------------------------------------
// 5. SECTIONS API
// ----------------------------------------------------------------------
export async function getSections() {
  try {
    const res = await fetch(`${API_BASE_URL}/public/sections`);
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchAdminSections(token?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/sections`, {
      headers: getAuthHeaders(token),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveSection(sectionData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/sections`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(sectionData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function updateAdminSection(token: string, data: any) {
  return saveSection(data);
}

// ----------------------------------------------------------------------
// 6. MENUS API
// ----------------------------------------------------------------------
export async function fetchAdminMenus(token?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/menus`, {
      headers: getAuthHeaders(token),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function updateAdminMenu(token: string, id: number, data: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/menus/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 7. HERO CONFIG & HERO STATS API
// ----------------------------------------------------------------------
export async function fetchAdminHeroConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/hero/config`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminHeroConfig(configData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/hero/config`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(configData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchAdminHeroStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/hero/stats`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminHeroStats(statsData: any[]) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/hero/stats`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(statsData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function batchSaveBanners(bannersData: any[]) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/banners/batch`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(bannersData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 8. SITE CONFIG & TRAINING PROGRAMS API
// ----------------------------------------------------------------------
export async function fetchAdminSiteConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/site-config`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminSiteConfig(configData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/site-config`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(configData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchAdminProgramSectionConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/programs/section-config`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminProgramSectionConfig(configData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/programs/section-config`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(configData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchAdminTrainingPrograms() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/programs`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminTrainingProgram(programData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/programs`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(programData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function deleteAdminTrainingProgram(id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/programs/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 9. COACHES API
// ----------------------------------------------------------------------
export async function fetchAdminCoachSectionConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/coaches/section-config`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminCoachSectionConfig(configData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/coaches/section-config`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(configData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchAdminCoaches() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/coaches`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminCoach(coachData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/coaches`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(coachData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function deleteAdminCoach(id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/coaches/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 10. FACILITIES API
// ----------------------------------------------------------------------
export async function fetchAdminFacilitySectionConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/facilities/section-config`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminFacilitySectionConfig(configData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/facilities/section-config`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(configData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchAdminFacilities() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/facilities`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminFacility(facilityData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/facilities`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(facilityData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function deleteAdminFacility(id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/facilities/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 11. ACHIEVEMENTS API
// ----------------------------------------------------------------------
export async function fetchAdminAchievementSectionConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/achievements/section-config`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminAchievementSectionConfig(configData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/achievements/section-config`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(configData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchAdminAchievements() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/achievements`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminAchievement(achData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/achievements`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(achData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function deleteAdminAchievement(id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/achievements/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 12. TESTIMONIALS API
// ----------------------------------------------------------------------
export async function fetchAdminTestimonialSectionConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/testimonials/section-config`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminTestimonialSectionConfig(configData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/testimonials/section-config`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(configData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchAdminTestimonials() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/testimonials`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminTestimonial(testData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/testimonials`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(testData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function deleteAdminTestimonial(id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/testimonials/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 13. EVENT MASTER API
// ----------------------------------------------------------------------
export async function fetchAdminEvents() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/events`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminEvent(eventData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/events`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function deleteAdminEvent(id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/events/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 19. MASTER TOURNAMENTS / KEJUARAAN API
// ----------------------------------------------------------------------
export async function fetchAdminTournaments() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/tournaments`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function saveAdminTournament(tournamentData: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/tournaments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(tournamentData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function deleteAdminTournament(id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/tournaments/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}






