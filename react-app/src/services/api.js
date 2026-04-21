import { BASE_URL } from "./settings.js";
import { getAccessToken, clearTokens } from "./auth.js";

let refreshHandler = null;

export function setRefreshHandler(handler) {
  refreshHandler = handler;
}

export async function apiRequest(path, options = {}, allowRefresh = true) {
  const headers = new Headers(options.headers || {});

  // Setear Content-Type si no es FormData
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = getAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && allowRefresh && typeof refreshHandler === "function") {
    const refreshed = await refreshHandler();

    if (refreshed) {
      return apiRequest(path, options, false); 
    } else {
      clearTokens();
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
    const error = new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail)
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export const get = (path) => apiRequest(path);

export const post = (path, body) =>
  apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body)
  });

export const put = (path, body) =>
  apiRequest(path, {
    method: "PUT",
    body: JSON.stringify(body)
  });

export const del = (path) =>
  apiRequest(path, {
    method: "DELETE"
  });