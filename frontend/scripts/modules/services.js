import { apiRequest } from "./http.js";

export async function cargarConfiguracion() {
  return apiRequest("/configuracion", { method: "GET" });
}

export async function guardarConfiguracion(config) {
  return apiRequest("/configuracion", {
    method: "PUT",
    body: JSON.stringify(config)
  });
}

export async function simularServidor(horizonteMeses = 36) {
  return apiRequest("/planes/simular", {
    method: "POST",
    body: JSON.stringify({ horizonte_meses: horizonteMeses })
  });
}

export async function procesarMes() {
  return apiRequest("/planes/procesar-mes", {
    method: "POST",
    body: JSON.stringify({ metodo_adjudicacion: "sorteo", ofertas: [] })
  });
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
