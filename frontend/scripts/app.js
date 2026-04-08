import { dom } from "./modules/dom.js";
import { getConfig, setConfigToForm } from "./modules/forms.js";
import {
  logout,
  me,
  crearUsuario,
  refreshToken,
  cargarConfiguracion,
  listarConfiguraciones,
  cargarResumenFinanciero,
  cargarEstadoPlan,
  guardarConfiguracion,
  simularServidor,
  // procesarMes eliminado
  reiniciarPlan,
  listarAdherentes,
  crearAdherente,
  actualizarAdherente,
  actualizarEstadoAdherente,
  eliminarAdherente,
  listarPagos,
  registrarPago,
  actualizarPago,
  eliminarPago
} from "./modules/services.js";
import {
  clearTokens,
  clearBusinessCache,
  getLastUserId,
  hasSession,
  setCurrentUser
} from "./modules/auth.js";
import { setRefreshHandler } from "./modules/http.js";
import { DEBUG_UI } from "./modules/settings.js";
import {
  writeLog,
  setSummary,
  updateKpiFromResumen,
  renderTimeline,
  renderCasasChart,
  renderCasasTerminadasChart,
  renderCasasEjecucionChart,
  renderRecaudacionChart,
  renderAdherentes,
  renderPagos,
  hasTimelineMetrics,
  normalizeTimeline
} from "./modules/renderers.js";
import { initSavedSimulationsWorkspace } from "./modules/simulation-inventory.js";
import { renderCasasChart as renderCasasChartChartJS } from "./chart-casas-iniciadas.js";
import { renderChartCasasTerminadasChartJS } from "./chart-casas-terminadas.js";
import { renderChartCasasEjecucionChartJS } from "./chart-casas-ejecucion.js";
import { renderChartRecaudacionChartJS } from "./chart-recaudacion.js";

setRefreshHandler(refreshToken);

let navController = null;
let userSwitchedSession = false;
let configuracionesUsuario = [];
let isReadOnlyMode = false;
let adherentesItems = [];
let pagosItems = [];
let simulationsWorkspace = null;

const DEFAULT_PORCENTAJE_CUOTA_COMPLETA = 0.8333333333;
const DEFAULT_PORCENTAJE_MEDIA_CUOTA = 0.4166666667;
const DEFAULT_METODOLOGIA_PLAN = "legacy";

function formatArsValue(value) {
  return `${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ARS`;
}

function estimateValorViviendaArsFromForm() {
  if (!dom.form) {
    return null;
  }

  const config = getConfig(dom.form);
  const metros = Number(config.metros_cuadrados_vivienda);
  const valorPorM2 = Number(config.valor_por_m2);
  if (!Number.isFinite(metros) || !Number.isFinite(valorPorM2) || metros <= 0 || valorPorM2 <= 0) {
    return null;
  }

  return Number((metros * valorPorM2).toFixed(2));
}

// Preview de cuotas: ahora la cuota se calcula SOLO sobre el valor del metro cuadrado, no sobre el total de la vivienda.
function updateConfigPreview() {
  const previewTarget = document.getElementById("config-preview");
  if (!previewTarget || !dom.form) {
    return;
  }

  const data = new FormData(dom.form);
  const valorPorM2 = Number(data.get("valorPorM2") || 0);
  const porcentajeCuotaCompleta = Number(data.get("porcentajeCuotaCompleta") || 0);
  const porcentajeMediaCuota = Number(data.get("porcentajeMediaCuota") || 0);

  if (![valorPorM2, porcentajeCuotaCompleta, porcentajeMediaCuota].every((value) => Number.isFinite(value) && value > 0)) {
    previewTarget.textContent = "Preview: cuota_completa = - | media_cuota = -";
    return;
  }

  const cuotaCompleta = valorPorM2 * (porcentajeCuotaCompleta / 100);
  const mediaCuota = valorPorM2 * (porcentajeMediaCuota / 100);

  previewTarget.textContent = `Preview: cuota_completa = ${formatArsValue(cuotaCompleta)} | media_cuota = ${formatArsValue(mediaCuota)}`;
}

function updateMetodologiaUI() {
  const legacyField = document.getElementById("legacy-cronograma-field");
  if (!legacyField || !dom.form) {
    return;
  }

  // Siempre legacy
  legacyField.classList.remove("hidden");
  const cronogramaInput = dom.form.elements.cronogramaAdjudicacionesAnual;
  if (cronogramaInput) {
    cronogramaInput.required = true;
  }
}

function isValidCronogramaCsv(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }

  const items = normalized.split(",").map((part) => part.trim());
  if (items.length === 0) {
    return false;
  }

  return items.every((item) => /^\d+$/.test(item));
}

function validateConfigBusinessRules(payload) {
  const metodologia = String(payload.metodologia_plan || "").trim().toLowerCase();
  if (!["dinamico", "legacy"].includes(metodologia)) {
    throw new Error("La metodología del plan debe ser dinamico o legacy.");
  }

  if (!Number.isFinite(payload.porcentaje_cuota_completa) || payload.porcentaje_cuota_completa <= 0) {
    throw new Error("El porcentaje de cuota completa debe ser mayor a 0.");
  }

  if (!Number.isFinite(payload.porcentaje_media_cuota) || payload.porcentaje_media_cuota <= 0) {
    throw new Error("El porcentaje de media cuota debe ser mayor a 0.");
  }

  if (!Number.isFinite(payload.meses_media_cuota_inicial) || payload.meses_media_cuota_inicial < 0) {
    throw new Error("Los meses de media cuota inicial deben ser un entero mayor o igual a 0.");
  }

  if (!Number.isFinite(payload.periodicidad_licitacion_meses) || payload.periodicidad_licitacion_meses < 1) {
    throw new Error("La periodicidad de licitación debe ser un entero mayor o igual a 1.");
  }

  if (!Number.isFinite(payload.porcentaje_licitacion_extraordinaria) || payload.porcentaje_licitacion_extraordinaria < 0) {
    throw new Error("El porcentaje de licitación extraordinaria debe ser mayor o igual a 0.");
  }

  if (metodologia === "legacy" && !isValidCronogramaCsv(payload.cronograma_adjudicaciones_anual)) {
    throw new Error("El cronograma anual debe tener enteros no negativos separados por coma. Ejemplo: 5,5,5,6,6,7.");
  }
}


function redirectToLogin() {
  window.location.href = "./login.html";
}

function withUiFeedback(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      const status = Number(error?.status || 0);
      const message = error?.message || "Error inesperado";
      writeLog(dom.systemLog, "Error", { message });
      if (status === 401) {
        setSummary(dom.simSummary, "Sesión expirada o no autenticado. Volvé a iniciar sesión.");
        clearTokens();
        clearBusinessCache();
        clearBusinessUiState();
        redirectToLogin();
        return;
      }

      if (status === 403) {
        setSummary(dom.simSummary, "No tenés permisos para realizar esta operación.");
        return;
      }

      if (status === 404) {
        setSummary(dom.simSummary, "Recurso no encontrado o fuera del alcance de tu usuario.");
        return;
      }

      if (status === 409) {
        setSummary(dom.simSummary, `Conflicto de regla de negocio: ${message}`);
        return;
      }

      setSummary(dom.simSummary, `Error: ${message}`);
      if (dom.configSaveStatus) {
        dom.configSaveStatus.textContent = `Estado: error al guardar (${message}).`;
      }

      if (/no autenticado|token|401/i.test(message)) {
        clearTokens();
        redirectToLogin();
      }
    }
  };
}

function renderSessionStatus(user) {
  dom.sessionStatus.textContent = `Sesión: ${user.username} (${user.role})`;
}

function syncRowActionPermissions(readOnly) {
  const buttons = [
    ...dom.adherentesBody.querySelectorAll(".btn-table"),
    ...dom.pagosBody.querySelectorAll(".btn-table")
  ];
  buttons.forEach((button) => {
    button.disabled = readOnly;
  });
}

function initSectionNav() {
  const nav = document.querySelector(".section-nav");
  const layout = document.querySelector(".layout");
  if (!nav || !layout) {
    return null;
  }

  const ensureNavLink = (id, label, insertAfterId = null) => {
    let link = nav.querySelector(`a[href="#${id}"]`);
    if (!link) {
      link = document.createElement("a");
      link.href = `#${id}`;
      link.textContent = label;

      if (insertAfterId) {
        const anchor = nav.querySelector(`a[href="#${insertAfterId}"]`);
        if (anchor?.nextSibling) {
          nav.insertBefore(link, anchor.nextSibling);
        } else if (anchor) {
          nav.appendChild(link);
        } else {
          nav.appendChild(link);
        }
      } else {
        nav.appendChild(link);
      }
    }

    if (id !== "admin-panel") {
      link.classList.remove("hidden");
    }

    return link;
  };

  ensureNavLink("grafico-casas", "Gráfico de casas", "simulacion");
  ensureNavLink("simulaciones-guardadas", "Simulaciones guardadas", "admin-panel");
  ensureNavLink("plan-simulado", "Plan simulado", "simulaciones-guardadas");

  const links = Array.from(nav.querySelectorAll("a[href^='#']"));
  const sections = links
    .map((link) => {
      const targetId = link.getAttribute("href")?.slice(1) || "";
      const section = document.getElementById(targetId);
      return section ? { link, section, id: targetId } : null;
    })
    .filter(Boolean);

  if (sections.length === 0) {
    return null;
  }

  const sectionLoaders = {
    "simulaciones-guardadas": () => simulationsWorkspace?.refreshList({ silent: true }),
    "plan-simulado": () => simulationsWorkspace?.refreshList({ silent: true }),
    "estado-financiero": cargarResumenServidor,
    configuracion: cargarConfiguracionServidor,
    simulacion: () => ejecutarSimulacionServidor({ skipNavigation: true }),
    "grafico-casas": () => ejecutarSimulacionServidor({ skipNavigation: true }),
    adherentes: actualizarAdherentes,
    pagos: actualizarPagos
  };

  const groupedViews = {
    configuracion: ["configuracion", "estado-financiero"],
    "estado-financiero": ["configuracion", "estado-financiero"]
  };

  let currentSectionId = "";

  const setActive = (id) => {
    links.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const showSection = async (id) => {
    const target = sections.find((item) => item.id === id);
    if (!target) {
      return;
    }
    if (target.section.classList.contains("hidden") || target.link.classList.contains("hidden")) {
      return;
    }

    currentSectionId = id;
    layout.classList.add("single-section");

    const visibleIds = new Set(groupedViews[id] || [id]);
    const allPanels = Array.from(layout.querySelectorAll(".panel[id]"));

    allPanels.forEach((section) => {
      const shouldShow = visibleIds.has(section.id) && !section.classList.contains("hidden");
      section.classList.toggle("section-visible", shouldShow);
    });

    setActive(id);

    const loaders = Array.from(visibleIds)
      .map((sectionId) => sectionLoaders[sectionId])
      .filter((loader, index, array) => typeof loader === "function" && array.indexOf(loader) === index);

    await Promise.all(loaders.map((loader) => withUiFeedback(loader)()));
  };

  const ensureVisibleSelection = async () => {
    const selected = sections.find((item) => item.id === currentSectionId);
    if (selected && !selected.section.classList.contains("hidden") && !selected.link.classList.contains("hidden")) {
      return;
    }

    const fallback = sections.find(
      (item) => !item.section.classList.contains("hidden") && !item.link.classList.contains("hidden")
    );
    if (fallback) {
      await showSection(fallback.id);
    }
  };

  links.forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const id = link.getAttribute("href")?.slice(1);
      if (id) {
        await showSection(id);
      }
    });
  });

  return {
    showSection,
    ensureVisibleSelection
  };
}

function applyRoleUI(user) {
  const esAdmin = user.role === "admin";

  dom.adminPanel.classList.toggle("hidden", !esAdmin);
  dom.navLinkAdmin.classList.toggle("hidden", !esAdmin);

  document
    .querySelectorAll('.section-nav a[href^="#"]:not([href="#admin-panel"])')
    .forEach((link) => link.classList.remove("hidden"));

  dom.adminRoleLabel.textContent = esAdmin ? "Perfil admin" : "-";
  dom.adminUserData.textContent = `ID ${user.id} | ${user.username} | ${user.role} | activo: ${user.is_active ? "sí" : "no"}`;

  const canWrite = user.role === "admin" || user.role === "operador";
  const readOnlyMode = !canWrite;
  isReadOnlyMode = readOnlyMode;

  if (readOnlyMode) {
    setSummary(dom.simSummary, "Tu rol no está habilitado para operar en este sistema.");
  }

  dom.buttonGuardarConfig.disabled = readOnlyMode;
  dom.buttonReiniciarPlan.disabled = readOnlyMode;
  document.getElementById("btn-crear-adherente").disabled = readOnlyMode;
  const buttonCambiarEstado = document.getElementById("btn-cambiar-estado");
  if (buttonCambiarEstado) {
    buttonCambiarEstado.disabled = readOnlyMode;
  }
  document.getElementById("btn-registrar-pago").disabled = readOnlyMode;
  // dom.buttonEliminarPago eliminado
  syncRowActionPermissions(readOnlyMode);
}

function clearBusinessUiState() {
  dom.tableBody.innerHTML = "";
  dom.adherentesBody.innerHTML = "";
  dom.pagosBody.innerHTML = "";
  dom.simSummary.textContent = "Ejecutá la simulación para ver proyecciones.";
  dom.adherentesSummary.textContent = "Sin adherentes para este usuario.";
  dom.pagosSummary.textContent = "Sin pagos para este usuario.";
  if (dom.casasChart) {
    dom.casasChart.innerHTML = "Sin datos de simulación para graficar.";
    dom.casasChart.classList.add("casas-chart-empty");
  }
  if (dom.casasChartSummary) {
    dom.casasChartSummary.textContent = "Ejecutá una simulación para visualizar la evolución mensual.";
  }
  if (dom.casasFinishChart) {
    dom.casasFinishChart.innerHTML = "Sin datos de simulación para graficar.";
    dom.casasFinishChart.classList.add("casas-chart-empty");
  }
  if (dom.casasFinishChartSummary) {
    dom.casasFinishChartSummary.textContent = "Ejecutá una simulación para visualizar la evolución mensual.";
  }
  if (dom.casasEjecucionChart) {
    dom.casasEjecucionChart.innerHTML = "Sin datos de simulación para graficar.";
    dom.casasEjecucionChart.classList.add("casas-chart-empty");
  }
  if (dom.casasEjecucionChartSummary) {
    dom.casasEjecucionChartSummary.textContent = "Ejecutá una simulación para visualizar la evolución anual.";
  }
  if (dom.recaudacionChart) {
    dom.recaudacionChart.innerHTML = "Sin datos de simulación para graficar.";
    dom.recaudacionChart.classList.add("casas-chart-empty");
  }
  if (dom.recaudacionChartSummary) {
    dom.recaudacionChartSummary.textContent = "Ejecutá una simulación para visualizar recaudación anual y cobertura de viviendas.";
  }
  if (dom.adherentesSearch) {
    dom.adherentesSearch.value = "";
  }
  if (dom.pagosSearch) {
    dom.pagosSearch.value = "";
  }
  adherentesItems = [];
  pagosItems = [];
  configuracionesUsuario = [];
  dom.configModalList && (dom.configModalList.innerHTML = "");
  dom.configModal?.classList.add("hidden");

  if (dom.simulationsList) {
    dom.simulationsList.innerHTML = "";
  }
  if (dom.simulationsSummary) {
    dom.simulationsSummary.textContent = "Sin simulaciones cargadas.";
  }
  if (dom.simulationDetailTitle) {
    dom.simulationDetailTitle.textContent = "Sin simulación seleccionada";
  }
  if (dom.simulationDetailMeta) {
    dom.simulationDetailMeta.textContent = "Seleccioná una simulación para ver y editar detalle.";
  }
  if (dom.simulationParametrosPanel) {
    dom.simulationParametrosPanel.textContent = "Sin datos.";
  }
  if (dom.simulationGlobalSummary) {
    dom.simulationGlobalSummary.innerHTML = "";
  }
  if (dom.simulationGlobalMaterials) {
    dom.simulationGlobalMaterials.innerHTML = "<tr><td colspan=\"6\">Sin materiales cargados.</td></tr>";
  }
  if (dom.simulationTimelinePreview) {
    dom.simulationTimelinePreview.innerHTML = "<tr><td colspan=\"4\">Sin proyección.</td></tr>";
  }
  if (dom.simulationHousesContainer) {
    dom.simulationHousesContainer.innerHTML = "<p>Seleccioná una simulación para editar casas, items y materiales.</p>";
  }
}

function matchesSearch(item, query, fields) {
  if (!query) {
    return true;
  }

  const normalizedQuery = String(query).toLowerCase().trim();
  return fields.some((field) => String(field ?? "").toLowerCase().includes(normalizedQuery));
}

function applyAdherentesFilter() {
  const query = dom.adherentesSearch?.value || "";
  const filtered = adherentesItems.filter((item) => matchesSearch(item, query, [
    item.id,
    item.nombre,
    item.estado,
    item.cuotas_pagadas,
    item.cuotas_bonificadas_por_licitacion
  ]));

  renderAdherentes(dom.adherentesBody, dom.adherentesSummary, filtered);
  syncRowActionPermissions(isReadOnlyMode);
}

function applyPagosFilter() {
  const query = dom.pagosSearch?.value || "";
  const filtered = pagosItems.filter((item) => matchesSearch(item, query, [
    item.id,
    item.adherente_id,
    item.monto_ars,
    item.mes,
    item.fecha
  ]));

  renderPagos(dom.pagosBody, dom.pagosSummary, filtered);
  syncRowActionPermissions(isReadOnlyMode);
}

function pickConfigPayload(item) {
  if (item && typeof item === "object") {
    if (item.configuracion && typeof item.configuracion === "object") {
      return item.configuracion;
    }
    if (item.payload && typeof item.payload === "object") {
      return item.payload;
    }
    return item;
  }
  return null;
}

function normalizePlanConfig(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const normalized = {
    metodologia_plan: String(raw.metodologia_plan ?? raw.metodologiaPlan ?? DEFAULT_METODOLOGIA_PLAN).trim().toLowerCase(),
    cronograma_adjudicaciones_anual: String(raw.cronograma_adjudicaciones_anual ?? raw.cronogramaAdjudicacionesAnual ?? "").trim() || null,
    periodicidad_licitacion_meses: Number(raw.periodicidad_licitacion_meses ?? raw.periodicidadLicitacionMeses ?? 3),
    porcentaje_licitacion_extraordinaria: Number(raw.porcentaje_licitacion_extraordinaria ?? raw.porcentajeLicitacionExtraordinaria ?? 0),
    cantidad_cuotas: Number(raw.cantidad_cuotas ?? raw.cantidadCuotas),
    cantidad_de_adherentes: Number(raw.cantidad_de_adherentes ?? raw.cantidadAdherentes),
    metros_cuadrados_vivienda: Number(raw.metros_cuadrados_vivienda ?? raw.metrosCuadradosVivienda ?? raw.metrosCuadrados),
    valor_por_m2: Number(raw.valor_por_m2 ?? raw.valorPorM2),
    porcentaje_cuota_completa: Number(raw.porcentaje_cuota_completa ?? raw.porcentajeCuotaCompleta ?? DEFAULT_PORCENTAJE_CUOTA_COMPLETA),
    porcentaje_media_cuota: Number(raw.porcentaje_media_cuota ?? raw.porcentajeMediaCuota ?? DEFAULT_PORCENTAJE_MEDIA_CUOTA),
    meses_media_cuota_inicial: Number(raw.meses_media_cuota_inicial ?? raw.mesesMediaCuotaInicial ?? 7),
    duracion_construccion_meses: Number(raw.duracion_construccion_meses ?? raw.duracionConstruccionMeses),
    tipo_cambio: Number(raw.tipo_cambio ?? raw.tipoCambio)
  };

  return isPlanConfigShape(normalized) ? normalized : null;
}

function isPlanConfigShape(config) {
  if (!config || typeof config !== "object") {
    return false;
  }

  const keys = [
    "metodologia_plan",
    "periodicidad_licitacion_meses",
    "porcentaje_licitacion_extraordinaria",
    "cantidad_cuotas",
    "cantidad_de_adherentes",
    "metros_cuadrados_vivienda",
    "valor_por_m2",
    "porcentaje_cuota_completa",
    "porcentaje_media_cuota",
    "meses_media_cuota_inicial",
    "duracion_construccion_meses",
    "tipo_cambio"
  ];

  return keys.every((key) => config[key] !== undefined && config[key] !== null);
}

function buildConfigLabel(item, index) {
  const name = String(item?.nombre || item?.name || item?.titulo || "").trim();
  const idPart = item?.id != null ? `#${item.id}` : `#${index + 1}`;
  const dateRaw = item?.created_at || item?.fecha_creacion || item?.updated_at || item?.fecha;
  if (name) {
    return `${idPart} - ${name}`;
  }

  if (dateRaw) {
    const dateValue = new Date(dateRaw);
    if (!Number.isNaN(dateValue.getTime())) {
      return `${idPart} - ${dateValue.toLocaleString("es-AR")}`;
    }
  }

  return `Configuración ${idPart}`;
}

function syncSimulationHorizonFromConfig(config) {
  const horizonteInput = dom.operacionForm?.elements?.horizonteMeses;
  if (!horizonteInput) {
    return;
  }

  const cuotas = Number(config?.cantidad_cuotas);
  if (Number.isFinite(cuotas) && cuotas > 0) {
    horizonteInput.value = String(Math.trunc(cuotas));
  }
}

function renderConfigListInModal() {
  if (!dom.configModalList) {
    return;
  }

  dom.configModalList.innerHTML = configuracionesUsuario
    .map((item, index) => {
      const config = item.configuracion;
      return `
        <article class="config-item">
          <h3>${buildConfigLabel(item, index)}</h3>
          <div class="config-item-grid">
            <p><strong>Tipo de cambio:</strong> ${Number(config.tipo_cambio).toLocaleString("es-AR")}</p>
            <p><strong>Adherentes:</strong> ${Number(config.cantidad_de_adherentes).toLocaleString("es-AR")}</p>
            <p><strong>m2 vivienda:</strong> ${Number(config.metros_cuadrados_vivienda).toLocaleString("es-AR")}</p>
            <p><strong>Cuotas:</strong> ${Number(config.cantidad_cuotas).toLocaleString("es-AR")}</p>
            <p><strong>Valor por m2:</strong> ${Number(config.valor_por_m2).toLocaleString("es-AR")}</p>
            <p><strong>Metodología:</strong> ${String(config.metodologia_plan || DEFAULT_METODOLOGIA_PLAN)}</p>
            <p><strong>Periodicidad licitación (meses):</strong> ${Number(config.periodicidad_licitacion_meses).toLocaleString("es-AR")}</p>
            <p><strong>% licitación extraordinaria:</strong> ${Number(config.porcentaje_licitacion_extraordinaria).toLocaleString("es-AR")}%</p>
            <p><strong>% cuota completa:</strong> ${Number(config.porcentaje_cuota_completa).toLocaleString("es-AR")}%</p>
            <p><strong>% media cuota:</strong> ${Number(config.porcentaje_media_cuota).toLocaleString("es-AR")}%</p>
            <p><strong>Meses media cuota inicial:</strong> ${Number(config.meses_media_cuota_inicial).toLocaleString("es-AR")}</p>
            <p><strong>Cronograma anual:</strong> ${config.cronograma_adjudicaciones_anual || "-"}</p>
            <p><strong>Duración obra (meses):</strong> ${Number(config.duracion_construccion_meses).toLocaleString("es-AR")}</p>
          </div>
          <button class="btn btn-secondary js-config-apply" type="button" data-config-index="${index}">Usar esta configuración</button>
        </article>
      `;
    })
    .join("");
}

function pedirSeleccionConfiguracion() {
  const { configModal, configModalCloseButton, configModalList } = dom;
  if (!configModal || !configModalCloseButton || !configModalList) {
    return Promise.resolve(configuracionesUsuario[0] || null);
  }

  renderConfigListInModal();
  configModal.classList.remove("hidden");
  configModalCloseButton.focus();

  return new Promise((resolve) => {
    const cleanup = () => {
      configModal.classList.add("hidden");
      configModalCloseButton.removeEventListener("click", onClose);
      configModal.removeEventListener("click", onBackdrop);
      configModalList.removeEventListener("click", onListClick);
      document.removeEventListener("keydown", onKeyDown);
      dom.buttonGuardarConfig?.focus();
    };

    const onClose = () => {
      cleanup();
      resolve(null);
    };

    const onBackdrop = (event) => {
      if (event.target === configModal) {
        onClose();
      }
    };

    const onListClick = (event) => {
      const button = event.target.closest(".js-config-apply");
      if (!button) {
        return;
      }

      const index = Number(button.getAttribute("data-config-index") || "-1");
      const item = configuracionesUsuario[index] || null;
      cleanup();
      resolve(item);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    configModalCloseButton.addEventListener("click", onClose);
    configModal.addEventListener("click", onBackdrop);
    configModalList.addEventListener("click", onListClick);
    document.addEventListener("keydown", onKeyDown);
  });
}

function pedirConfirmacion({ title, message, acceptLabel = "Confirmar", focusBackElement = dom.buttonReiniciarPlan }) {
  const {
    confirmModal,
    confirmModalTitle,
    confirmModalMessage,
    confirmCancelButton,
    confirmAcceptButton
  } = dom;

  if (!confirmModal || !confirmCancelButton || !confirmAcceptButton) {
    return Promise.resolve(window.confirm(message));
  }

  confirmModalTitle.textContent = title;
  confirmModalMessage.textContent = message;
  confirmAcceptButton.textContent = acceptLabel;
  confirmModal.classList.remove("hidden");
  confirmAcceptButton.focus();

  return new Promise((resolve) => {
    const cleanup = () => {
      confirmModal.classList.add("hidden");
      confirmCancelButton.removeEventListener("click", onCancel);
      confirmAcceptButton.removeEventListener("click", onAccept);
      confirmModal.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onKeyDown);
      confirmAcceptButton.textContent = "Confirmar";
      if (focusBackElement && typeof focusBackElement.focus === "function") {
        focusBackElement.focus();
      }
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onAccept = () => {
      cleanup();
      resolve(true);
    };

    const onBackdropClick = (event) => {
      if (event.target === confirmModal) {
        onCancel();
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    confirmCancelButton.addEventListener("click", onCancel);
    confirmAcceptButton.addEventListener("click", onAccept);
    confirmModal.addEventListener("click", onBackdropClick);
    document.addEventListener("keydown", onKeyDown);
  });
}

async function ejecutarSimulacionServidor(options = {}) {
  if (navController && !options.skipNavigation) {
    // La navegación ya dispara el loader de la sección simulación.
    await navController.showSection("simulacion");
    return;
  }

  // Intentamos persistir, pero sin bloquear por validaciones locales estrictas.
  const config = await persistirConfiguracionActual({
    silent: true,
    strictValidation: false
  });
  const horizonte = Number(config.cantidad_cuotas) || 36;
  const payload = await simularServidor({
    horizonteMeses: horizonte,
    ofertas: [],
    configuracion: config
  });
  const rows = normalizeTimeline(payload);
  const valorViviendaArs = estimateValorViviendaArsFromForm();
  const horizonteTexto = Number.isFinite(horizonte) && horizonte > 0 ? String(horizonte) : "el horizonte configurado";

  if (rows.length > 0) {
    const hasMetrics = hasTimelineMetrics(rows);

    renderTimeline(dom.tableBody, rows);
    // Chart.js
    renderCasasChartChartJS(rows);
    renderChartCasasTerminadasChartJS(rows);
    renderChartCasasEjecucionChartJS(rows);
    renderChartRecaudacionChartJS(rows, valorViviendaArs);
    // SVG
    renderCasasChart(dom.casasChart, dom.casasChartSummary, rows);
    renderCasasTerminadasChart(dom.casasFinishChart, dom.casasFinishChartSummary, rows);
    renderCasasEjecucionChart(dom.casasEjecucionChart, dom.casasEjecucionChartSummary, rows);
    renderRecaudacionChart(dom.recaudacionChart, dom.recaudacionChartSummary, rows, valorViviendaArs);
    if (hasMetrics) {
      setSummary(dom.simSummary, `Simulación servidor ok: ${rows.length} fila(s) en ${horizonteTexto}.`);
    } else {
      setSummary(
        dom.simSummary,
        `Simulación servidor ok: ${rows.length} evento(s) en ${horizonteTexto}. La API no devolvió métricas mensuales en esta respuesta.`
      );
    }
  } else {
    renderCasasChartChartJS([]);
    renderChartCasasTerminadasChartJS([]);
    renderChartCasasEjecucionChartJS([]);
    renderChartRecaudacionChartJS([], valorViviendaArs);
    renderCasasChart(dom.casasChart, dom.casasChartSummary, []);
    renderCasasTerminadasChart(dom.casasFinishChart, dom.casasFinishChartSummary, []);
    renderCasasEjecucionChart(dom.casasEjecucionChart, dom.casasEjecucionChartSummary, []);
    renderRecaudacionChart(dom.recaudacionChart, dom.recaudacionChartSummary, [], valorViviendaArs);
    const fondoFinal = typeof payload?.fondo_final_ars === "number"
      ? ` Fondo final: ${payload.fondo_final_ars.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ARS.`
      : "";

    let diagnostico = "";
    if (DEBUG_UI) {
      try {
        const estadoPlan = await cargarEstadoPlan();
        const cantidadAdherentes = Array.isArray(estadoPlan?.adherentes)
          ? estadoPlan.adherentes.length
          : null;
        const ingresoMensual = Number(estadoPlan?.resumen?.ingreso_mensual_ars ?? 0);
        const fondoActual = Number(estadoPlan?.estado?.fondo_ars ?? 0);

        if (cantidadAdherentes === 0 || ingresoMensual <= 0) {
          diagnostico = " Diagnóstico: no hay ingreso mensual (posible falta de adherentes cargados o todos en estado sin aporte).";
        } else if (fondoActual <= 0) {
          diagnostico = " Diagnóstico: el fondo actual es 0 y el horizonte puede ser corto para alcanzar una vivienda.";
        }
      } catch {
        diagnostico = "";
      }
    }

    setSummary(
      dom.simSummary,
      `Simulación servidor ejecutada, pero no hubo eventos de casas en ${horizonteTexto}.${fondoFinal}${diagnostico}`
    );
  }

  writeLog(dom.systemLog, "Simulación servidor", payload);
}

async function cargarConfiguracionServidor(options = {}) {
  const showPicker = options.showPicker !== false;
  const items = await listarConfiguraciones();

  configuracionesUsuario = items
    .map((item) => ({ raw: item, config: normalizePlanConfig(pickConfigPayload(item)) }))
    .filter((entry) => entry.config)
    .map((entry) => ({ ...entry.raw, configuracion: entry.config }));

  if (configuracionesUsuario.length === 0) {
    // Fallback para backends que exponen una sola configuración en /configuracion.
    const directConfig = normalizePlanConfig(await cargarConfiguracion());
    if (directConfig) {
      configuracionesUsuario = [{ id: "actual", nombre: "Actual", configuracion: directConfig }];
    }
  }

  if (configuracionesUsuario.length === 0) {
    throw new Error("No hay configuraciones guardadas para este usuario.");
  }

  if (configuracionesUsuario.length === 1 || !showPicker) {
    setConfigToForm(dom.form, configuracionesUsuario[0].configuracion);
    syncSimulationHorizonFromConfig(configuracionesUsuario[0].configuracion);
    updateMetodologiaUI();
    updateConfigPreview();
    writeLog(dom.systemLog, "Configuración cargada", configuracionesUsuario[0]);
    return;
  }

  const selected = await pedirSeleccionConfiguracion();
  if (!selected) {
    setSummary(dom.simSummary, "Selección de configuración cancelada.");
    return;
  }

  setConfigToForm(dom.form, selected.configuracion);
  syncSimulationHorizonFromConfig(selected.configuracion);
  updateMetodologiaUI();
  updateConfigPreview();
  writeLog(dom.systemLog, "Configuración cargada", selected);
  setSummary(dom.simSummary, `Configuración aplicada (${buildConfigLabel(selected, configuracionesUsuario.indexOf(selected))}).`);
}

async function cargarResumenServidor() {
  const [resumen, estadoPlan] = await Promise.all([
    cargarResumenFinanciero(),
    cargarEstadoPlan()
  ]);

  updateKpiFromResumen(dom.kpi, resumen, estadoPlan);
  writeLog(dom.systemLog, "Resumen financiero", { resumen, estado: estadoPlan?.estado, cuotas_actuales: estadoPlan?.cuotas_actuales });
}

async function guardarConfiguracionServidor() {
  const payload = await persistirConfiguracionActual({
    silent: true,
    strictValidation: true
  });
  await cargarConfiguracionServidor({ showPicker: false });
  const mediaMayorQueCompleta = payload.porcentaje_media_cuota > payload.porcentaje_cuota_completa;

  if (mediaMayorQueCompleta) {
    setSummary(dom.simSummary, "Configuración guardada. Advertencia: se recomienda que % media cuota sea menor o igual que % cuota completa.");
  } else {
    setSummary(dom.simSummary, "Configuración guardada correctamente.");
  }
}

async function persistirConfiguracionActual(options = {}) {
  const { silent = false, strictValidation = true } = options;
  const payload = getConfig(dom.form);
  if (payload.metodologia_plan !== "legacy") {
    payload.cronograma_adjudicaciones_anual = null;
  }
  if (strictValidation) {
    validateConfigBusinessRules(payload);
  }

  const response = await guardarConfiguracion(payload);
  syncSimulationHorizonFromConfig(payload);
  updateConfigPreview();
  if (dom.configSaveStatus) {
    const ahora = new Date().toLocaleTimeString("es-AR");
    dom.configSaveStatus.textContent = `Estado: guardado correctamente (${ahora}).`;
  }
  if (!silent) {
    writeLog(dom.systemLog, "Configuración guardada", response);
  }

  return payload;
}


async function reiniciarPlanServidor() {
  const confirmacion = await pedirConfirmacion({
    title: "Reiniciar plan",
    message: "Esta acción restablece el estado del plan y no se puede deshacer desde esta pantalla.",
    acceptLabel: "Reiniciar",
    focusBackElement: dom.buttonReiniciarPlan
  });
  if (!confirmacion) {
    return;
  }

  const payload = await reiniciarPlan();
  dom.tableBody.innerHTML = "";
  setSummary(dom.simSummary, "Plan reiniciado. Ejecutá una simulación para ver una nueva proyección.");
  writeLog(dom.systemLog, "Reiniciar plan", payload);

  await Promise.all([
    cargarResumenServidor(),
    actualizarAdherentes(),
    actualizarPagos()
  ]);
}

async function actualizarAdherentes() {
  const items = await listarAdherentes();
  adherentesItems = Array.isArray(items) ? items : [];
  applyAdherentesFilter();
  writeLog(dom.systemLog, "Listado de adherentes", items);
}

async function actualizarPagos() {
  const items = await listarPagos();
  pagosItems = Array.isArray(items) ? items : [];
  applyPagosFilter();
  writeLog(dom.systemLog, "Listado de pagos", items);
}

function getRowField(row, field) {
  const input = row?.querySelector(`[data-field="${field}"]`);
  return input ? String(input.value || "").trim() : "";
}

function setRowEditing(row, editing, type) {
  if (!row) {
    return;
  }

  row.querySelectorAll(".cell-read").forEach((element) => {
    element.classList.toggle("hidden", editing);
  });

  row.querySelectorAll(".cell-edit").forEach((element) => {
    element.classList.toggle("hidden", !editing);
  });

  const editButton = row.querySelector(type === "adherente" ? ".js-edit-adherente" : ".js-edit-pago");
  const saveButton = row.querySelector(type === "adherente" ? ".js-save-adherente" : ".js-save-pago");
  const cancelButton = row.querySelector(type === "adherente" ? ".js-cancel-adherente" : ".js-cancel-pago");
  const deleteButton = row.querySelector(type === "adherente" ? ".js-delete-adherente" : ".js-delete-pago");

  editButton?.classList.toggle("hidden", editing);
  saveButton?.classList.toggle("hidden", !editing);
  cancelButton?.classList.toggle("hidden", !editing);
  deleteButton?.classList.toggle("hidden", editing);

  if (editing) {
    const firstInput = row.querySelector(".cell-edit");
    firstInput?.focus();
  }
}

async function guardarAdherenteDesdeFila(button) {
  const adherenteId = Number(button.getAttribute("data-adherente-id") || 0);
  if (!Number.isFinite(adherenteId) || adherenteId < 1) {
    throw new Error("ID de adherente inválido.");
  }

  const row = button.closest("tr");
  const nombre = getRowField(row, "nombre");
  const estado = getRowField(row, "estado");
  const cuotasPagadas = Number(getRowField(row, "cuotas_pagadas"));
  const cuotasBonificadas = Number(getRowField(row, "cuotas_bonificadas_por_licitacion"));

  if (!nombre) {
    throw new Error("El nombre del adherente es obligatorio.");
  }
  if (!["activo", "en_construccion", "adjudicado"].includes(estado)) {
    throw new Error("Estado inválido.");
  }
  if (!Number.isFinite(cuotasPagadas) || cuotasPagadas < 0) {
    throw new Error("Cuotas pagadas inválidas.");
  }
  if (!Number.isFinite(cuotasBonificadas) || cuotasBonificadas < 0) {
    throw new Error("Cuotas bonificadas inválidas.");
  }

  try {
    await actualizarAdherente(adherenteId, {
      nombre,
      estado,
      cuotas_pagadas: cuotasPagadas,
      cuotas_bonificadas_por_licitacion: cuotasBonificadas
    });
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status === 404) {
      writeLog(dom.systemLog, "Editar adherente", {
        adherenteId,
        message: "No encontrado o fuera de tu alcance"
      });
      await actualizarAdherentes();
      return;
    }

    if (status === 405) {
      // Compatibilidad con backends que solo exponen endpoint de estado.
      await actualizarEstadoAdherente(adherenteId, estado);
      setSummary(dom.simSummary, "Backend parcial: se actualizó solo el estado del adherente.");
      await actualizarAdherentes();
      return;
    }
    throw error;
  }

  await actualizarAdherentes();
}

async function eliminarAdherentePorId(adherenteId, focusBackElement = null) {
  const confirmacion = await pedirConfirmacion({
    title: "Eliminar adherente",
    message: `Se eliminará el adherente ID ${adherenteId}. Esta acción puede afectar pagos y estado del plan.`,
    acceptLabel: "Eliminar",
    focusBackElement
  });

  if (!confirmacion) {
    return;
  }

  let payload;
  try {
    payload = await eliminarAdherente(adherenteId);
  } catch (error) {
    if (Number(error?.status || 0) === 404) {
      writeLog(dom.systemLog, "Eliminar adherente", {
        adherenteId,
        message: "No encontrado o fuera de tu alcance"
      });
      await actualizarAdherentes();
      return;
    }
    throw error;
  }

  writeLog(dom.systemLog, "Eliminar adherente", { adherenteId, payload });
  await actualizarAdherentes();
}

async function guardarPagoDesdeFila(button) {
  const pagoId = Number(button.getAttribute("data-pago-id") || 0);
  if (!Number.isFinite(pagoId) || pagoId < 1) {
    throw new Error("ID de pago inválido.");
  }

  const row = button.closest("tr");
  const adherenteId = Number(getRowField(row, "adherente_id"));
  const montoArs = Number(getRowField(row, "monto_ars"));
  const mes = Number(getRowField(row, "mes"));
  const fechaRaw = getRowField(row, "fecha");
  const fecha = fechaRaw ? new Date(fechaRaw).toISOString() : null;

  if (!Number.isFinite(adherenteId) || adherenteId < 1) {
    throw new Error("Adherente ID inválido.");
  }
  if (!Number.isFinite(montoArs) || montoArs <= 0) {
    throw new Error("Monto inválido.");
  }
  if (!Number.isFinite(mes) || mes < 1) {
    throw new Error("Mes inválido.");
  }
  if (fechaRaw && Number.isNaN(new Date(fechaRaw).getTime())) {
    throw new Error("Fecha inválida.");
  }

  try {
    await actualizarPago(pagoId, adherenteId, montoArs, mes, fecha);
  } catch (error) {
    if (Number(error?.status || 0) === 404) {
      writeLog(dom.systemLog, "Editar pago", {
        pagoId,
        message: "No encontrado o fuera de tu alcance"
      });
      await actualizarPagos();
      return;
    }
    throw error;
  }

  await actualizarPagos();
}

async function eliminarPagoPorId(pagoId, focusBackElement = null) {
  const confirmacion = await pedirConfirmacion({
    title: "Eliminar pago",
    message: `Se eliminará el pago ID ${pagoId}. Esta acción no se puede deshacer desde esta pantalla.`,
    acceptLabel: "Eliminar",
    focusBackElement
  });

  if (!confirmacion) {
    return;
  }

  let payload;
  try {
    payload = await eliminarPago(pagoId);
  } catch (error) {
    if (Number(error?.status || 0) === 404) {
      writeLog(dom.systemLog, "Eliminar pago", {
        pagoId,
        message: "No encontrado o fuera de tu alcance"
      });
      await actualizarPagos();
      return;
    }
    throw error;
  }

  writeLog(dom.systemLog, "Eliminar pago", { pagoId, payload });
  await actualizarPagos();
}

async function logoutFlow() {
  try {
    await logout();
  } catch {
    clearTokens();
  }
  clearBusinessCache();
  clearBusinessUiState();
  redirectToLogin();
}

async function bootstrapSession() {
  if (!hasSession()) {
    redirectToLogin();
    return false;
  }

  try {
    const user = await me();
    const previousUserId = getLastUserId();
    const currentUserId = user?.id != null ? String(user.id) : "";
    userSwitchedSession = Boolean(previousUserId && currentUserId && previousUserId !== currentUserId);
    if (userSwitchedSession) {
      clearBusinessCache();
      clearBusinessUiState();
    }

    setCurrentUser(user);
    renderSessionStatus(user);
    applyRoleUI(user);
    if (navController) {
      await navController.ensureVisibleSelection();
    }
    return true;
  } catch {
    clearTokens();
    clearBusinessCache();
    clearBusinessUiState();
    redirectToLogin();
    return false;
  }
}

async function crearUsuarioAdminFlow(event) {
  event.preventDefault();
  const data = new FormData(dom.adminCreateUserForm);
  const username = String(data.get("username") || "").trim();
  const password = String(data.get("password") || "");
  const role = String(data.get("role") || "operador");

  if (!["admin", "operador"].includes(role)) {
    throw new Error("Rol inválido. Solo se permite admin u operador.");
  }

  const user = await crearUsuario(username, password, role);
  dom.adminCreateUserForm.reset();
  writeLog(dom.systemLog, "Usuario creado por admin", user);
}


// eliminarPagoFlow eliminado

dom.buttonSimularServidor.addEventListener("click", withUiFeedback(ejecutarSimulacionServidor));
dom.buttonGuardarConfig.addEventListener("click", withUiFeedback(guardarConfiguracionServidor));
dom.buttonCargarResumen.addEventListener("click", withUiFeedback(cargarResumenServidor));
dom.buttonReiniciarPlan.addEventListener("click", withUiFeedback(reiniciarPlanServidor));

dom.buttonLogout.addEventListener("click", withUiFeedback(logoutFlow));

dom.buttonListarAdherentes.addEventListener("click", withUiFeedback(actualizarAdherentes));
dom.adherenteForm.addEventListener("submit", withUiFeedback(async (event) => {
  event.preventDefault();
  const data = new FormData(dom.adherenteForm);
  const nombre = String(data.get("nombre") || "").trim();

  if (!nombre) {
    throw new Error("Ingresá un nombre para crear adherente.");
  }

  await crearAdherente(nombre);
  dom.adherenteForm.reset();
  await actualizarAdherentes();
}));


dom.buttonListarPagos.addEventListener("click", withUiFeedback(actualizarPagos));
dom.pagoForm.addEventListener("submit", withUiFeedback(async (event) => {
  event.preventDefault();
  const data = new FormData(dom.pagoForm);

  await registrarPago(
    Number(data.get("adherenteId")),
    Number(data.get("montoArs")),
    Number(data.get("mes"))
  );

  dom.pagoForm.reset();
  await actualizarPagos();
}));
// Listener de pagoEliminarForm eliminado

dom.adherentesSearch?.addEventListener("input", () => {
  applyAdherentesFilter();
});

dom.pagosSearch?.addEventListener("input", () => {
  applyPagosFilter();
});

dom.form?.addEventListener("input", () => {
  updateMetodologiaUI();
  updateConfigPreview();
  if (dom.configSaveStatus) {
    dom.configSaveStatus.textContent = "Estado: cambios sin guardar.";
  }
});

dom.adherentesBody.addEventListener("click", withUiFeedback(async (event) => {
  const editButton = event.target.closest(".js-edit-adherente");
  if (editButton) {
    const row = editButton.closest("tr");
    setRowEditing(row, true, "adherente");
    return;
  }

  const saveButton = event.target.closest(".js-save-adherente");
  if (saveButton) {
    await guardarAdherenteDesdeFila(saveButton);
    return;
  }

  const cancelButton = event.target.closest(".js-cancel-adherente");
  if (cancelButton) {
    await actualizarAdherentes();
    return;
  }

  const deleteButton = event.target.closest(".js-delete-adherente");
  if (deleteButton) {
    const adherenteId = Number(deleteButton.getAttribute("data-adherente-id") || 0);
    if (!Number.isFinite(adherenteId) || adherenteId < 1) {
      throw new Error("ID de adherente inválido.");
    }
    await eliminarAdherentePorId(adherenteId, deleteButton);
  }
}));

dom.pagosBody.addEventListener("click", withUiFeedback(async (event) => {
  const editButton = event.target.closest(".js-edit-pago");
  if (editButton) {
    const row = editButton.closest("tr");
    setRowEditing(row, true, "pago");
    return;
  }

  const saveButton = event.target.closest(".js-save-pago");
  if (saveButton) {
    await guardarPagoDesdeFila(saveButton);
    return;
  }

  const cancelButton = event.target.closest(".js-cancel-pago");
  if (cancelButton) {
    await actualizarPagos();
    return;
  }

  const deleteButton = event.target.closest(".js-delete-pago");
  if (deleteButton) {
    const pagoId = Number(deleteButton.getAttribute("data-pago-id") || 0);
    if (!Number.isFinite(pagoId) || pagoId < 1) {
      throw new Error("ID de pago inválido.");
    }
    await eliminarPagoPorId(pagoId, deleteButton);
  }
}));

dom.adminCreateUserForm.addEventListener("submit", withUiFeedback(crearUsuarioAdminFlow));

simulationsWorkspace = initSavedSimulationsWorkspace({
  dom,
  withUiFeedback,
  getConfig,
  setConfigToForm,
  updateConfigPreview,
  updateMetodologiaUI,
  writeLog,
  setSummary,
  pedirConfirmacion,
  onSimulationLoaded: () => {
    // No sincronizamos automáticamente para no pisar edición manual de configuración.
  }
});

navController = initSectionNav();
clearBusinessUiState();
updateMetodologiaUI();
updateConfigPreview();
const sessionOk = await bootstrapSession();
if (sessionOk) {
  await withUiFeedback(() => cargarConfiguracionServidor({ showPicker: false }))();
  await withUiFeedback(() => simulationsWorkspace.refreshList({ silent: true }))();
  if (navController) {
    await navController.showSection("estado-financiero");
  }

  await withUiFeedback(() => ejecutarSimulacionServidor({ skipNavigation: true }))();
  userSwitchedSession = false;
}
