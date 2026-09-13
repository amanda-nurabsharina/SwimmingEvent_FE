const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "secret-swimming-api-key-2026";

function getPublicHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };
}

export async function getHomepageData() {
  try {
    const res = await fetch(`${API_BASE_URL}/public/homepage`, {
      headers: getPublicHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error", data: null };
  }
}

export async function getBanners() {
  try {
    const res = await fetch(`${API_BASE_URL}/public/banners`, {
      headers: getPublicHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error", data: [] };
  }
}

export async function getEvents() {
  try {
    const res = await fetch(`${API_BASE_URL}/public/events`, {
      headers: getPublicHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error", data: [] };
  }
}

export async function getTournaments() {
  try {
    const res = await fetch(`${API_BASE_URL}/public/tournaments`, {
      headers: getPublicHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error", data: [] };
  }
}

export async function getSections() {
  try {
    const res = await fetch(`${API_BASE_URL}/public/sections`, {
      headers: getPublicHeaders(),
      cache: "no-store",
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error", data: [] };
  }
}

export async function submitRegistration(payload: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/public/register`, {
      method: "POST",
      headers: getPublicHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: "Network error" };
  }
}

export async function registerParticipant(payload: any) {
  return submitRegistration(payload);
}

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE_URL}/public/upload-proof`, {
      method: "POST",
      headers: {
        "X-API-Key": API_KEY,
      },
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
  } catch (err) {
    return { success: false, message: "Upload failed" };
  }
}
