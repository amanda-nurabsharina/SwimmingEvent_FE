const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1/public";
const API_KEY = "secret-swimming-api-key-2026";

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    return await res.json();
  } catch (error) {
    console.error("API Request Error:", error);
    return { success: false, message: "Network connection failed" };
  }
}

export async function getHomepageData() {
  return fetchAPI("/homepage");
}

export async function getEvents() {
  return fetchAPI("/events");
}

export async function getTournaments() {
  return fetchAPI("/tournaments");
}

export async function submitRegistration(data: any) {
  return fetchAPI("/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getStartingList() {
  return fetchAPI("/starting-list");
}

export async function getBukuAcara(tournamentId?: number, round?: string) {
  const params = new URLSearchParams();
  if (tournamentId) params.append("tournament_id", tournamentId.toString());
  if (round) params.append("round", round);
  const queryString = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI(`/buku-acara${queryString}`);
}

export async function checkRegistrationCode(code: string) {
  return fetchAPI(`/registration-status/${code}`);
}

export async function uploadPaymentProof(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE_URL}/upload-proof`, {
      method: "POST",
      headers: {
        "X-API-Key": API_KEY,
      },
      body: formData,
    });
    return await res.json();
  } catch (err) {
    return { success: false, message: "Upload failed" };
  }
}
