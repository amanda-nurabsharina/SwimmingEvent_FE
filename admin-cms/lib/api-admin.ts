export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
export const PUBLIC_LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || "http://localhost:3000";

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
export async function generateBukuAcara(maxLanes?: number, tournamentID?: number, force?: boolean) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/buku-acara/generate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        max_lanes: maxLanes || 3,
        tournament_id: tournamentID || 0,
        force: !!force,
      }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function getBukuAcara(tournamentID?: number, round?: string) {
  try {
    const params = new URLSearchParams();
    if (tournamentID) params.append("tournament_id", tournamentID.toString());
    if (round) params.append("round", round);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/admin/buku-acara${queryString}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error", data: [] };
  }
}

export async function generateFinalRound(tournamentID: number, maxLanes?: number, qualifyMode?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/buku-acara/generate-final`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        tournament_id: tournamentID,
        max_lanes: maxLanes || 3,
        qualify_mode: qualifyMode || "heat_winners_and_fastest",
      }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function lockTournamentBukuAcara(tournamentID: number, isLocked: boolean) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/tournaments/${tournamentID}/lock-buku-acara`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_locked: isLocked }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function publishTournamentBukuAcara(tournamentID: number, isPublished: boolean) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/tournaments/${tournamentID}/publish-buku-acara`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_published: isPublished }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function swapRegistrationHeatLine(
  id: number,
  targetHeat: number,
  targetLine: number,
  swapIfOccupied: boolean = true,
  round: string = "preliminary"
) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/registrations/${id}/heat-line`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        target_heat: targetHeat,
        target_line: targetLine,
        swap_if_occupied: swapIfOccupied,
        round: round,
      }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function recordRaceResult(id: number, finalTime: string, rank: number, status?: string, round?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/registrations/${id}/result`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        final_time: finalTime,
        rank,
        status: status || "OK",
        round: round || "preliminary",
      }),
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

// ----------------------------------------------------------------------
// 20. PAGE SECTIONS (LANDING PAGE SORT & LAYOUT ORDER)
// ----------------------------------------------------------------------
export async function fetchPageSections(pageSlug = "homepage") {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/page-sections?page_slug=${encodeURIComponent(pageSlug)}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function batchSavePageSections(sections: any[]) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/page-sections/batch`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ sections }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function resetPageSections(pageSlug = "homepage") {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/page-sections/reset?page_slug=${encodeURIComponent(pageSlug)}`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 12. RACE RESULT AUDIT LOGS
// ----------------------------------------------------------------------
export async function fetchRaceResultLogs(params: {
  tournament_id?: number;
  round?: string;
  action?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}) {
  try {
    const query = new URLSearchParams();
    if (params.tournament_id) query.append("tournament_id", params.tournament_id.toString());
    if (params.round && params.round !== "ALL") query.append("round", params.round);
    if (params.action && params.action !== "ALL") query.append("action", params.action);
    if (params.search) query.append("search", params.search);
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.offset !== undefined) query.append("offset", params.offset.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/admin/race-results/logs${queryString}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function fetchRaceResultLogStats(tournamentId?: number) {
  try {
    const query = tournamentId ? `?tournament_id=${tournamentId}` : "";
    const res = await fetch(`${API_BASE_URL}/admin/race-results/logs/stats${query}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

// ----------------------------------------------------------------------
// 19. WHATSAPP GATEWAY (BAILEYS) API
// ----------------------------------------------------------------------
const WA_GATEWAY_URL = process.env.NEXT_PUBLIC_WA_GATEWAY_URL || "http://localhost:5001/api/wa";

export async function getWhatsAppStatus() {
  try {
    const res = await fetch(`${WA_GATEWAY_URL}/status`, { cache: "no-store" });
    return await res.json();
  } catch (error) {
    return { success: false, isConnected: false, message: "WhatsApp Gateway offline" };
  }
}

export async function requestWhatsAppPairingCode(phoneNumber: string) {
  try {
    const res = await fetch(`${WA_GATEWAY_URL}/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Gagal meminta kode pairing" };
  }
}

export async function sendWhatsAppMessage(to: string, text: string) {
  try {
    const res = await fetch(`${WA_GATEWAY_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, text }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Gagal mengirim pesan WhatsApp" };
  }
}

export async function sendWhatsAppBroadcast(
  recipients: { id: string | number; phone: string; text: string }[],
  delayMs: number = 2000
) {
  try {
    const res = await fetch(`${WA_GATEWAY_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients, delayMs }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Gagal mengirim broadcast WhatsApp" };
  }
}

export async function logoutWhatsApp() {
  try {
    const res = await fetch(`${WA_GATEWAY_URL}/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Gagal memutuskan koneksi WhatsApp" };
  }
}

// ----------------------------------------------------------------------
// 20. ROLE & PERMISSION MANAGEMENT API
// ----------------------------------------------------------------------
export async function fetchAdminRoles() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/roles`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error fetching roles" };
  }
}

export async function createAdminRole(data: { name: string; description?: string; permissions: string[] }) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/roles`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error creating role" };
  }
}

export async function updateAdminRole(id: number, data: { name: string; description?: string; permissions: string[] }) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/roles/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error updating role" };
  }
}

export async function deleteAdminRole(id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/roles/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error deleting role" };
  }
}

// ----------------------------------------------------------------------
// 21. USER MANAGEMENT API
// ----------------------------------------------------------------------
export async function fetchAdminUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error fetching users" };
  }
}

export async function createAdminUser(data: {
  username: string;
  email: string;
  password: string;
  role_id: number;
  status: string;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error creating user" };
  }
}

export async function updateAdminUser(
  id: number,
  data: {
    email?: string;
    password?: string;
    role_id?: number;
    status?: string;
  }
) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error updating user" };
  }
}

export async function deleteAdminUser(id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error deleting user" };
  }
}
