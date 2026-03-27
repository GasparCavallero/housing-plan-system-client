import { apiRequest } from "./http.js";
import { BASE_URL } from "./settings.js";
import { clearTokens, getRefreshToken, setTokens } from "./auth.js";

export async function login(username, password) {
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);

  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || "No se pudo iniciar sesión");
  }

  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function refreshToken() {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) {
    return false;
  }

  try {
    const data = await apiRequest("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshTokenValue })
    }, false);
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function logout() {
  const refreshTokenValue = getRefreshToken();
  if (refreshTokenValue) {
    await apiRequest("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshTokenValue })
    }, false);
  }
  clearTokens();
}

export async function me() {
  return apiRequest("/auth/me", { method: "GET" });
}

export async function crearUsuario(username, password, role) {
  return apiRequest("/auth/users", {
    method: "POST",
    body: JSON.stringify({ username, password, role })
  });
}

export async function cargarConfiguracion() {
  return apiRequest("/configuracion", { method: "GET" });
}

export async function listarConfiguraciones() {
  const payload = await apiRequest("/configuracion", { method: "GET" });

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.configuraciones)) {
    return payload.configuraciones;
  }

  if (payload && typeof payload === "object") {
    return [payload];
  }

  return [];
}

export async function cargarResumenFinanciero() {
  return apiRequest("/configuracion/resumen-financiero", { method: "GET" });
}

export async function cargarEstadoPlan() {
  return apiRequest("/planes/estado", { method: "GET" });
}

export async function guardarConfiguracion(config) {
  return apiRequest("/configuracion", {
    method: "PUT",
    body: JSON.stringify(config)
  });
}

export async function simularServidor(horizonteMeses = null, ofertas = []) {
  const body = { ofertas };
  if (Number.isFinite(horizonteMeses) && horizonteMeses > 0) {
    body.horizonte_meses = horizonteMeses;
  }

  return apiRequest("/planes/simular", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function procesarMes(ofertas = []) {
  return apiRequest("/planes/procesar-mes", {
    method: "POST",
    body: JSON.stringify({ ofertas })
  });
}

export async function reiniciarPlan() {
  try {
    return await apiRequest("/planes/reiniciar", {
      method: "POST"
    });
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status !== 404 && !/404|Not Found|No encontrado/i.test(String(error?.message || ""))) {
      throw error;
    }

    return apiRequest("/planes/reset", {
      method: "POST"
    });
  }
}

export async function listarAdherentes() {
  return apiRequest("/adherentes", { method: "GET" });
}

export async function crearAdherente(nombre) {
  return apiRequest("/adherentes", {
    method: "POST",
    body: JSON.stringify({ nombre })
  });
}

export async function actualizarEstadoAdherente(adherenteId, estado) {
  return apiRequest(`/adherentes/${adherenteId}/estado?estado=${encodeURIComponent(estado)}`, {
    method: "PATCH"
  });
}

export async function actualizarAdherente(adherenteId, payload) {
  const body = JSON.stringify(payload);

  try {
    return await apiRequest(`/adherentes/${adherenteId}`, {
      method: "PATCH",
      body
    });
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status !== 404 && status !== 405) {
      throw error;
    }

    return apiRequest(`/adherentes/${adherenteId}`, {
      method: "PUT",
      body
    });
  }
}

export async function eliminarAdherente(adherenteId) {
  try {
    return await apiRequest(`/adherentes/${adherenteId}`, {
      method: "DELETE"
    });
  } catch (error) {
    const status = Number(error?.status || 0);
    if (![404, 405].includes(status) && !/404|405|Not Found|Method Not Allowed|No encontrado/i.test(String(error?.message || ""))) {
      throw error;
    }

    return apiRequest(`/adherentes/${adherenteId}/eliminar`, {
      method: "POST"
    });
  }
}

export async function listarPagos() {
  return apiRequest("/pagos", { method: "GET" });
}

export async function registrarPago(adherenteId, montoArs, mes) {
  return apiRequest("/pagos", {
    method: "POST",
    body: JSON.stringify({
      adherente_id: adherenteId,
      monto_ars: montoArs,
      mes
    })
  });
}

export async function actualizarPago(pagoId, adherenteId, montoArs, mes, fecha = null) {
  const payload = {
    adherente_id: adherenteId,
    monto_ars: montoArs,
    mes
  };

  if (fecha) {
    payload.fecha = fecha;
  }

  const body = JSON.stringify(payload);

  try {
    return await apiRequest(`/pagos/${pagoId}`, {
      method: "PATCH",
      body
    });
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status !== 404 && status !== 405) {
      throw error;
    }

    return apiRequest(`/pagos/${pagoId}`, {
      method: "PUT",
      body
    });
  }
}

export async function eliminarPago(pagoId) {
  try {
    return await apiRequest(`/pagos/${pagoId}`, {
      method: "DELETE"
    });
  } catch (error) {
    const status = Number(error?.status || 0);
    if (![404, 405].includes(status) && !/404|405|Not Found|Method Not Allowed|No encontrado/i.test(String(error?.message || ""))) {
      throw error;
    }

    return apiRequest(`/pagos/${pagoId}/eliminar`, {
      method: "POST"
    });
  }
}
