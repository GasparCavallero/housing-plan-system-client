import { BASE_URL } from "./settings.js";
import { getAccessToken } from "./auth.js";

let refreshHandler = null;

export function setRefreshHandler(handler) {
  refreshHandler = handler;
}

export async function apiRequest(path, options = {}, allowRefresh = true) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = getAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401 && allowRefresh && typeof refreshHandler === "function") {
    const refreshed = await refreshHandler();
    if (refreshed) {
      return apiRequest(path, options, false);
    }
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const detail = data?.detail || `HTTP ${response.status}`;
    const error = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    error.status = response.status;
    throw error;
  }

  return data;
}
