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

export async function simularServidor({ horizonteMeses = null, ofertas = [], configuracion = null } = {}) {
  const body = { ofertas };
  if (Number.isFinite(horizonteMeses) && horizonteMeses > 0) {
    body.horizonte_meses = horizonteMeses;
  }

  if (configuracion && typeof configuracion === "object") {
    body.configuracion = configuracion;
    Object.assign(body, configuracion);
  }

  return apiRequest("/planes/simular", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function listarCasasSimulacion(simulacionId) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas`, { method: "GET" });
}

export async function crearCasaSimulacion(simulacionId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listarPlanillasCasa(simulacionId, casaId) {
  const payload = await apiRequest(
    `/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas`,
    { method: "GET" }
  );
  return extractArrayPayload(payload, ["planillas", "entregas", "items"]);
}

export async function crearPlanillaCasa(simulacionId, casaId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function actualizarPlanillaCasa(simulacionId, casaId, planillaId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas/${planillaId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function listarItemsPlanilla(simulacionId, casaId, planillaId) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas/${planillaId}/items`, { method: "GET" });
}

export async function crearItemPlanilla(simulacionId, casaId, planillaId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas/${planillaId}/items`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function actualizarItemPlanilla(simulacionId, casaId, planillaId, itemId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas/${planillaId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function listarMaterialesItem(simulacionId, casaId, planillaId, itemId) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas/${planillaId}/items/${itemId}/materiales`, { method: "GET" });
}

export async function crearMaterialPlanilla(simulacionId, casaId, planillaId, itemId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas/${planillaId}/items/${itemId}/materiales`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function actualizarMaterialPlanilla(simulacionId, casaId, planillaId, itemId, materialId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas/${planillaId}/items/${itemId}/materiales/${materialId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function listarMovimientosMaterial(filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      query.set(key, value);
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequestWithFallback([
    `/movimientos${suffix}`,
    `/planes/movimientos${suffix}`
  ], { method: "GET" });
}

export async function registrarMovimientoEntrega(payload) {
  return apiRequestWithFallback([
    "/movimientos",
    "/planes/movimientos"
  ], {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listarGastosCasa(simulacionId, casaId) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/gastos`, { method: "GET" });
}

export async function crearGastoCasa(simulacionId, casaId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/gastos`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function apiRequestWithFallback(paths, options = {}) {
  const candidates = Array.isArray(paths) ? paths : [paths];
  let lastError = null;

  for (const path of candidates) {
    try {
      return await apiRequest(path, options);
    } catch (error) {
      const status = Number(error?.status || 0);
      if (status === 404 || status === 405) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("No se encontró un endpoint válido para esta operación.");
}

function extractArrayPayload(payload, preferredKeys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const key of preferredKeys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  const firstArray = Object.values(payload).find((value) => Array.isArray(value));
  if (Array.isArray(firstArray)) {
    return firstArray;
  }

  return [];
}

export async function listarSimulacionesGuardadas() {
  const payload = await apiRequest("/planes/simulaciones", { method: "GET" });

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.simulaciones)) {
    return payload.simulaciones;
  }

  if (payload && typeof payload === "object") {
    return [payload];
  }

  return [];
}

export async function obtenerDetalleSimulacion(simulacionId) {
  return apiRequest(`/planes/simulaciones/${simulacionId}`, { method: "GET" });
}

export async function crearSimulacionGuardada(payload) {
  return apiRequest("/planes/simulaciones", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function actualizarSimulacionGuardada(simulacionId, payload) {
  const body = JSON.stringify(payload);

  return apiRequest(`/planes/simulaciones/${simulacionId}`, {
    method: "PUT",
    body
  });
}

export async function clonarSimulacionGuardada(simulacionId, payload = {}) {
  return apiRequest(`/planes/simulaciones/${simulacionId}/clonar`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function recalcularSimulacionGuardada(simulacionId, payload = {}) {
  return apiRequest(`/planes/simulaciones/${simulacionId}/recalcular`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function actualizarCasaSimulacion(simulacionId, casaId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function agregarCasaSimulacion(simulacionId, payload) {
  const payloadVariants = [
    payload,
    {
      ...payload,
      adherenteId: payload?.adherente_id,
      adherenteNombre: payload?.adherente_nombre,
      precioArs: payload?.precio_ars,
      simulacion_id: simulacionId
    },
    {
      simulacion_id: simulacionId,
      adherente_id: payload?.adherente_id,
      adherente_nombre: payload?.adherente_nombre,
      precio: payload?.precio_ars,
      descripcion: payload?.descripcion,
      completada: payload?.completada
    }
  ];

  const pathVariants = [
    [
      `/simulaciones/${simulacionId}/casas`,
      `/planes/simulaciones/${simulacionId}/casas`,
      `/simulaciones/${simulacionId}/casa`,
      `/planes/simulaciones/${simulacionId}/casa`
    ],
    [
      "/casas",
      "/planes/casas"
    ]
  ];

  let lastError = null;
  for (const paths of pathVariants) {
    for (const bodyPayload of payloadVariants) {
      try {
        return await apiRequestWithFallback(paths, {
          method: "POST",
          body: JSON.stringify(bodyPayload)
        });
      } catch (error) {
        const status = Number(error?.status || 0);
        if ([400, 404, 405, 409, 422].includes(status)) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("No se pudo crear la casa con los endpoints disponibles.");
}

export async function agregarItemCasa(simulacionId, casaId, payload) {
  return apiRequestWithFallback([
    `/simulaciones/${simulacionId}/casas/${casaId}/items`,
    `/planes/simulaciones/${simulacionId}/casas/${casaId}/items`
  ], {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function actualizarItemCasa(simulacionId, casaId, itemId, payload) {
  return apiRequestWithFallback([
    `/simulaciones/${simulacionId}/casas/${casaId}/items/${itemId}`,
    `/planes/simulaciones/${simulacionId}/casas/${casaId}/items/${itemId}`
  ], {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function agregarMaterialItem(simulacionId, casaId, itemId, payload) {
  return apiRequestWithFallback([
    `/simulaciones/${simulacionId}/casas/${casaId}/items/${itemId}/materiales`,
    `/planes/simulaciones/${simulacionId}/casas/${casaId}/items/${itemId}/materiales`
  ], {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function actualizarMaterialItem(simulacionId, casaId, itemId, materialId, payload) {
  return apiRequestWithFallback([
    `/simulaciones/${simulacionId}/casas/${casaId}/items/${itemId}/materiales/${materialId}`,
    `/planes/simulaciones/${simulacionId}/casas/${casaId}/items/${itemId}/materiales/${materialId}`
  ], {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function registrarEntregaMaterial(simulacionId, casaId, itemId, materialId, payload) {
  return apiRequestWithFallback([
    `/simulaciones/${simulacionId}/casas/${casaId}/items/${itemId}/materiales/${materialId}/entregas`,
    `/planes/simulaciones/${simulacionId}/casas/${casaId}/items/${itemId}/materiales/${materialId}/entregas`
  ], {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function agregarGastoCasa(simulacionId, casaId, payload) {
  return apiRequestWithFallback([
    `/simulaciones/${simulacionId}/casas/${casaId}/gastos`,
    `/planes/simulaciones/${simulacionId}/casas/${casaId}/gastos`
  ], {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function actualizarGastoCasa(simulacionId, casaId, gastoId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/gastos/${gastoId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function eliminarGastoCasa(simulacionId, casaId, gastoId) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/gastos/${gastoId}`, {
    method: "DELETE"
  });
}

export async function listarManoObraCasa(simulacionId, casaId) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/mano-obra`, { method: "GET" });
}

export async function crearManoObraCasa(simulacionId, casaId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/mano-obra`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function actualizarManoObraCasa(simulacionId, casaId, manoObraId, payload) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/mano-obra/${manoObraId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function eliminarManoObraCasa(simulacionId, casaId, manoObraId) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/mano-obra/${manoObraId}`, {
    method: "DELETE"
  });
}

export async function eliminarPlanillaCasa(simulacionId, casaId, planillaId) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas/${planillaId}`, {
    method: "DELETE"
  });
}

export async function eliminarItemPlanilla(simulacionId, casaId, planillaId, itemId) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas/${planillaId}/items/${itemId}`, {
    method: "DELETE"
  });
}

export async function eliminarMaterialPlanilla(simulacionId, casaId, planillaId, itemId, materialId) {
  return apiRequest(`/planes/simulaciones-entregas/${simulacionId}/casas/${casaId}/planillas/${planillaId}/items/${itemId}/materiales/${materialId}`, {
    method: "DELETE"
  });
}

export async function eliminarSimulacion(simulacionId) {
  return apiRequest(`/planes/simulaciones/${simulacionId}`, {
    method: "DELETE"
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
