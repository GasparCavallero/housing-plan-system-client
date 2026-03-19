import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, LAST_USER_ID_KEY } from "./settings.js";

const authState = {
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY) || "",
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || "",
  user: null,
  lastUserId: localStorage.getItem(LAST_USER_ID_KEY) || ""
};

export function getAccessToken() {
  return authState.accessToken;
}

export function getRefreshToken() {
  return authState.refreshToken;
}

export function setTokens(accessToken, refreshToken) {
  authState.accessToken = accessToken;
  authState.refreshToken = refreshToken;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  authState.accessToken = "";
  authState.refreshToken = "";
  authState.user = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function setCurrentUser(user) {
  authState.user = user;
  const userId = user?.id != null ? String(user.id) : "";
  authState.lastUserId = userId;
  if (userId) {
    localStorage.setItem(LAST_USER_ID_KEY, userId);
  } else {
    localStorage.removeItem(LAST_USER_ID_KEY);
  }
}

export function getCurrentUser() {
  return authState.user;
}

export function hasSession() {
  return Boolean(authState.accessToken);
}

export function getLastUserId() {
  return authState.lastUserId;
}

export function clearBusinessCache() {
  // Keep auth tokens intact here; this reset is for user-scoped business state.
  const keysToRemove = [
    "hps_simulation_rows",
    "hps_simulation_summary",
    "hps_last_section",
    "hps_kpi_snapshot",
    "hps_adherentes_snapshot",
    "hps_pagos_snapshot"
  ];

  keysToRemove.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem("hps_simulation_rows");
  sessionStorage.removeItem("hps_adherentes_snapshot");
  sessionStorage.removeItem("hps_pagos_snapshot");
}
