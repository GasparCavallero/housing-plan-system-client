import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./settings.js";

const authState = {
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY) || "",
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || "",
  user: null
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
}

export function getCurrentUser() {
  return authState.user;
}

export function hasSession() {
  return Boolean(authState.accessToken);
}
