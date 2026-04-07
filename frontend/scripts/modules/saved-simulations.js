import { formatterArs } from "./formatters.js";
import {
  listarSimulacionesGuardadas,
  obtenerDetalleSimulacion,
  crearSimulacionGuardada,
  actualizarSimulacionGuardada,
  clonarSimulacionGuardada,
  recalcularSimulacionGuardada,
  actualizarCasaSimulacion,
  agregarCasaSimulacion,
  agregarItemCasa,
  actualizarItemCasa,
  agregarMaterialItem,
  actualizarMaterialItem,
  registrarEntregaMaterial,
  agregarGastoCasa,
  actualizarGastoCasa,
  eliminarGastoCasa
} from "./services.js";

function money(value) {
  return formatterArs.format(Number(value || 0));
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMaterial(material) {
  const cantidadTotal = numberOrZero(material?.cantidad_total ?? material?.cantidad ?? 0);
  const cantidadRetirada = numberOrZero(material?.cantidad_retirada ?? material?.retirada ?? 0);
  const cantidadEnConstruccion = numberOrZero(material?.cantidad_en_construccion ?? material?.en_construccion ?? Math.max(0, cantidadTotal - cantidadRetirada));
  const precioUnitario = numberOrZero(material?.precio_unitario ?? material?.precio ?? 0);

  return {
    id: material?.id ?? `material-${Math.random().toString(16).slice(2)}`,
    nombre: String(material?.nombre || "Material").trim(),
    proveedor: String(material?.proveedor || "").trim(),
    descripcion: String(material?.descripcion || "").trim(),
    unidad: String(material?.unidad || "u").trim(),
    precio_unitario: Number(precioUnitario.toFixed(2)),
    cantidad_total: Number(cantidadTotal.toFixed(2)),
    cantidad_retirada: Number(cantidadRetirada.toFixed(2)),
    cantidad_en_construccion: Number(cantidadEnConstruccion.toFixed(2)),
    total_ars: Number((cantidadTotal * precioUnitario).toFixed(2))
  };
}

function normalizeItem(item) {
  const materiales = Array.isArray(item?.materiales) ? item.materiales.map(normalizeMaterial) : [];
  const total = Number(materiales.reduce((acc, material) => acc + numberOrZero(material.total_ars), 0).toFixed(2));

  return {
    id: item?.id ?? `item-${Math.random().toString(16).slice(2)}`,
    nombre: String(item?.nombre || "Item").trim(),
    proveedor: String(item?.proveedor || "").trim(),
    descripcion: String(item?.descripcion || "").trim(),
    materiales,
    total_ars: total
  };
}

function normalizeGasto(gasto) {
  return {
    id: gasto?.id ?? `gasto-${Math.random().toString(16).slice(2)}`,
    nombre: String(gasto?.nombre || "Gasto").trim(),
    descripcion: String(gasto?.descripcion || "").trim(),
    monto_ars: Number(numberOrZero(gasto?.monto_ars ?? gasto?.monto).toFixed(2))
  };
}

function calculateHouseTotals(casa) {
  const items = Array.isArray(casa.items) ? casa.items : [];
  const gastos = Array.isArray(casa.gastos) ? casa.gastos : [];
  const totalItems = items.reduce((acc, item) => acc + numberOrZero(item.total_ars), 0);
  const totalGastos = gastos.reduce((acc, gasto) => acc + numberOrZero(gasto.monto_ars), 0);
  const gastoTotal = Number((totalItems + totalGastos).toFixed(2));
  const precioCasa = numberOrZero(casa.precio_ars ?? casa.precio ?? 0);
  const saldo = Number((precioCasa - gastoTotal).toFixed(2));
  const avance = precioCasa > 0 ? Number(Math.min(100, Math.max(0, (gastoTotal / precioCasa) * 100)).toFixed(2)) : 0;

  return {
    totalItems: Number(totalItems.toFixed(2)),
    totalGastos: Number(totalGastos.toFixed(2)),
    gastoTotal,
    saldo,
    avance
  };
}

function normalizeCasa(casa) {
  const items = Array.isArray(casa?.items) ? casa.items.map(normalizeItem) : [];
  const gastos = Array.isArray(casa?.gastos) ? casa.gastos.map(normalizeGasto) : [];

  const normalized = {
    id: casa?.id ?? `casa-${Math.random().toString(16).slice(2)}`,
    adherente_id: casa?.adherente_id ?? casa?.adherenteId ?? null,
    adherente_nombre: String(casa?.adherente_nombre ?? casa?.adherenteNombre ?? "").trim(),
    precio_ars: Number(numberOrZero(casa?.precio_ars ?? casa?.precio).toFixed(2)),
    descripcion: String(casa?.descripcion || "").trim(),
    completada: Boolean(casa?.completada ?? casa?.is_completed ?? false),
    items,
    gastos
  };

  const totals = calculateHouseTotals(normalized);
  normalized.total_items_ars = totals.totalItems;
  normalized.total_gastos_ars = totals.totalGastos;
  normalized.gasto_total_ars = totals.gastoTotal;
  normalized.saldo_ars = totals.saldo;
  normalized.avance_financiero_pct = totals.avance;

  return normalized;
}

function normalizeSimulationDetail(detail, fallbackId = null) {
  const casasRaw = detail?.casas ?? detail?.houses ?? [];
  const casas = Array.isArray(casasRaw) ? casasRaw.map(normalizeCasa) : [];

  return {
    id: detail?.id ?? fallbackId,
    titulo: String(detail?.titulo ?? detail?.title ?? "Simulacion").trim(),
    descripcion: String(detail?.descripcion ?? detail?.description ?? "").trim(),
    parametros: detail?.parametros ?? detail?.configuracion ?? {},
    ofertas: Array.isArray(detail?.ofertas) ? detail.ofertas : [],
    resumen: detail?.resumen ?? null,
    timeline: Array.isArray(detail?.timeline) ? detail.timeline : [],
    casas,
    updated_at: detail?.updated_at ?? detail?.fecha_actualizacion ?? null,
    created_at: detail?.created_at ?? detail?.fecha_creacion ?? null
  };
}

function groupMaterialsFromHouses(casas) {
  const grouped = new Map();

  casas.forEach((casa) => {
    (casa.items || []).forEach((item) => {
      (item.materiales || []).forEach((material) => {
        const key = `${material.nombre.toLowerCase()}::${material.unidad.toLowerCase()}`;
        const current = grouped.get(key) || {
          nombre: material.nombre,
          unidad: material.unidad,
          cantidad_total: 0,
          cantidad_retirada: 0,
          cantidad_en_construccion: 0,
          total_ars: 0
        };

        current.cantidad_total += numberOrZero(material.cantidad_total);
        current.cantidad_retirada += numberOrZero(material.cantidad_retirada);
        current.cantidad_en_construccion += numberOrZero(material.cantidad_en_construccion);
        current.total_ars += numberOrZero(material.total_ars);
        grouped.set(key, current);
      });
    });
  });

  return Array.from(grouped.values()).map((row) => ({
    ...row,
    cantidad_total: Number(row.cantidad_total.toFixed(2)),
    cantidad_retirada: Number(row.cantidad_retirada.toFixed(2)),
    cantidad_en_construccion: Number(row.cantidad_en_construccion.toFixed(2)),
    total_ars: Number(row.total_ars.toFixed(2))
  }));
}

function computeGlobalSummary(detail) {
  const casas = Array.isArray(detail?.casas) ? detail.casas : [];
  const materiales = groupMaterialsFromHouses(casas);

  const gastoTotal = casas.reduce((acc, casa) => acc + numberOrZero(casa.gasto_total_ars), 0);
  const fondoTotal = numberOrZero(detail?.resumen?.fondo_total_ars ?? detail?.resumen?.fondo_ars);
  const saldoTotal = casas.reduce((acc, casa) => acc + numberOrZero(casa.saldo_ars), 0);
  const materialesTotal = materiales.reduce((acc, material) => acc + numberOrZero(material.total_ars), 0);
  const casasCompletadas = casas.filter((casa) => casa.completada).length;

  return {
    fondoTotal: Number(fondoTotal.toFixed(2)),
    gastoTotal: Number(gastoTotal.toFixed(2)),
    materialesTotal: Number(materialesTotal.toFixed(2)),
    saldoTotal: Number(saldoTotal.toFixed(2)),
    casasTotales: casas.length,
    casasCompletadas,
    materiales
  };
}

function normalizeOffer(rawOffer) {
  return {
    adherente_id: numberOrZero(rawOffer?.adherente_id ?? rawOffer?.adherenteId),
    monto_ars: Number(numberOrZero(rawOffer?.monto_ars ?? rawOffer?.montoArs).toFixed(2))
  };
}

function renderOffers(target, offers) {
  if (!target) {
    return;
  }

  if (!Array.isArray(offers) || offers.length === 0) {
    target.innerHTML = "<p class=\"config-help\">No hay ofertas cargadas.</p>";
    return;
  }

  target.innerHTML = offers.map((offer, index) => `
    <span class="offer-chip">
      Adherente ${offer.adherente_id} | ${money(offer.monto_ars)}
      <button type="button" class="js-offer-remove" data-offer-index="${index}" aria-label="Quitar oferta">x</button>
    </span>
  `).join("");
}

function getOffersFromUi(dom, fallbackOffers = []) {
  if (!dom.simulationOffersList) {
    return fallbackOffers;
  }

  const raw = dom.simulationOffersList.getAttribute("data-offers");
  if (!raw) {
    return fallbackOffers;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallbackOffers;
  } catch {
    return fallbackOffers;
  }
}

function setOffersToUi(dom, offers) {
  const safeOffers = (Array.isArray(offers) ? offers : [])
    .map(normalizeOffer)
    .filter((offer) => offer.adherente_id > 0 && offer.monto_ars >= 0);

  if (dom.simulationOffersList) {
    dom.simulationOffersList.setAttribute("data-offers", JSON.stringify(safeOffers));
    renderOffers(dom.simulationOffersList, safeOffers);
  }
}

function renderGlobalSummary(target, summary) {
  if (!target) {
    return;
  }

  target.innerHTML = `
    <article class="plan-summary-card">
      <p>Fondo total</p>
      <h4>${money(summary.fondoTotal)}</h4>
    </article>
    <article class="plan-summary-card">
      <p>Gasto total</p>
      <h4>${money(summary.gastoTotal)}</h4>
    </article>
    <article class="plan-summary-card">
      <p>Materiales total</p>
      <h4>${money(summary.materialesTotal)}</h4>
    </article>
    <article class="plan-summary-card">
      <p>Saldo total</p>
      <h4>${money(summary.saldoTotal)}</h4>
    </article>
    <article class="plan-summary-card">
      <p>Casas totales</p>
      <h4>${summary.casasTotales}</h4>
    </article>
    <article class="plan-summary-card">
      <p>Casas completadas</p>
      <h4>${summary.casasCompletadas}</h4>
    </article>
  `;
}

function renderGlobalMaterials(target, materials) {
  if (!target) {
    return;
  }

  if (!Array.isArray(materials) || materials.length === 0) {
    target.innerHTML = "<tr><td colspan=\"6\">Sin materiales cargados.</td></tr>";
    return;
  }

  target.innerHTML = materials.map((material) => `
    <tr>
      <td>${material.nombre}</td>
      <td>${material.unidad}</td>
      <td>${material.cantidad_total}</td>
      <td>${material.cantidad_retirada}</td>
      <td>${material.cantidad_en_construccion}</td>
      <td>${money(material.total_ars)}</td>
    </tr>
  `).join("");
}

function renderTimelinePreview(target, rows) {
  if (!target) {
    return;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    target.innerHTML = "<tr><td colspan=\"4\">Sin proyeccion en esta simulacion.</td></tr>";
    return;
  }

  target.innerHTML = rows.slice(0, 24).map((row) => `
    <tr>
      <td>${row.mes ?? "-"}</td>
      <td>${row.evento ?? row.evento_mes ?? "-"}</td>
      <td>${money(row.ingreso_mes_ars ?? row.ingreso_mes ?? row.ingresoMes ?? 0)}</td>
      <td>${money(row.fondo_ars ?? row.fondo ?? row.fondo_cierre ?? 0)}</td>
    </tr>
  `).join("");
}

function parsePromptNumber(label, defaultValue = 0, minValue = null) {
  const raw = window.prompt(label, String(defaultValue));
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error("Debes ingresar un numero valido.");
  }
  if (Number.isFinite(minValue) && parsed < minValue) {
    throw new Error(`El valor no puede ser menor a ${minValue}.`);
  }
  return parsed;
}

export function initSavedSimulationsWorkspace(options) {
  const {
    dom,
    withUiFeedback,
    getConfig,
    setConfigToForm,
    updateConfigPreview,
    updateMetodologiaUI,
    writeLog,
    setSummary,
    pedirConfirmacion,
    onSimulationLoaded
  } = options;

  const state = {
    list: [],
    activeId: null,
    activeDetail: null,
    loading: false,
    isCreatingHouse: false
  };

  function setHouseCreateMode(visible) {
    state.isCreatingHouse = Boolean(visible);
    if (dom.houseCreateForm) {
      dom.houseCreateForm.classList.toggle("hidden", !state.isCreatingHouse);
    }
    if (dom.buttonAddHouse) {
      dom.buttonAddHouse.disabled = state.isCreatingHouse;
    }

    if (state.isCreatingHouse) {
      if (dom.houseCreateStatus) {
        dom.houseCreateStatus.classList.add("hidden");
        dom.houseCreateStatus.textContent = "";
      }
      dom.houseCreateAdherenteInput?.focus();
    }
  }

  function setHouseCreateStatus(message, isError = false) {
    if (!dom.houseCreateStatus) {
      return;
    }
    dom.houseCreateStatus.textContent = message;
    dom.houseCreateStatus.classList.remove("hidden");
    dom.houseCreateStatus.style.color = isError ? "#8b3f15" : "#006d5b";
  }

  function updateSummaryLine() {
    if (!dom.simulationsSummary) {
      return;
    }
    const total = state.list.length;
    const activeText = state.activeDetail ? ` | Actual: ${state.activeDetail.titulo}` : "";
    dom.simulationsSummary.textContent = `Total simulaciones: ${total}${activeText}`;
  }

  function renderActiveParams(parametros) {
    if (!dom.simulationParametrosPanel) {
      return;
    }

    const entries = Object.entries(parametros || {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
    if (entries.length === 0) {
      dom.simulationParametrosPanel.textContent = "Sin parametros activos.";
      return;
    }

    dom.simulationParametrosPanel.innerHTML = entries.map(([key, value]) => `<span>${key}: ${value}</span>`).join("");
  }

  function renderSimulationList() {
    if (!dom.simulationsList) {
      return;
    }

    if (!Array.isArray(state.list) || state.list.length === 0) {
      dom.simulationsList.innerHTML = "<p>No hay simulaciones guardadas.</p>";
      return;
    }

    dom.simulationsList.innerHTML = state.list.map((sim) => {
      const activeClass = sim.id === state.activeId ? "is-active" : "";
      const updated = sim.updated_at || sim.fecha_actualizacion || sim.created_at || sim.fecha_creacion;
      const dateText = updated ? new Date(updated).toLocaleString("es-AR") : "sin fecha";
      return `
        <button class="simulation-list-item ${activeClass}" type="button" data-simulation-id="${sim.id}">
          <h4>${sim.titulo || sim.title || `Simulacion #${sim.id}`}</h4>
          <p>${sim.descripcion || sim.description || "Sin descripcion"}</p>
          <p>Actualizada: ${dateText}</p>
        </button>
      `;
    }).join("");
  }

  function renderHouseMaterialsTable(casaId, item) {
    if (!Array.isArray(item.materiales) || item.materiales.length === 0) {
      return "<p class=\"item-sub\">Sin materiales en este item.</p>";
    }

    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Proveedor</th>
              <th>Descripcion</th>
              <th>Unidad</th>
              <th>Cantidad total</th>
              <th>Retirada</th>
              <th>En construccion</th>
              <th>Precio u.</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${item.materiales.map((material) => `
              <tr>
                <td>${material.nombre}</td>
                <td>${material.proveedor || "-"}</td>
                <td>${material.descripcion || "-"}</td>
                <td>${material.unidad}</td>
                <td>${material.cantidad_total}</td>
                <td>${material.cantidad_retirada}</td>
                <td>${material.cantidad_en_construccion}</td>
                <td>${money(material.precio_unitario)}</td>
                <td>${money(material.total_ars)}</td>
                <td>
                  <div class="row-compact">
                    <button class="btn-table js-material-edit" type="button" data-casa-id="${casaId}" data-item-id="${item.id}" data-material-id="${material.id}">Editar</button>
                    <button class="btn-table js-material-delivery" type="button" data-casa-id="${casaId}" data-item-id="${item.id}" data-material-id="${material.id}">Entrega parcial</button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderHouses(detail) {
    if (!dom.simulationHousesContainer) {
      return;
    }

    const casas = Array.isArray(detail?.casas) ? detail.casas : [];
    if (casas.length === 0) {
      dom.simulationHousesContainer.innerHTML = "<p>Esta simulacion aun no tiene casas.</p>";
      return;
    }

    dom.simulationHousesContainer.innerHTML = casas.map((casa) => `
      <article class="house-card" data-casa-id="${casa.id}">
        <div class="house-head">
          <h4>Casa #${casa.id}</h4>
          <label class="row-compact">
            <input class="js-casa-completada" type="checkbox" ${casa.completada ? "checked" : ""} data-casa-id="${casa.id}" />
            Completada
          </label>
        </div>

        <div class="house-grid">
          <label>
            Adherente
            <input class="js-casa-field" data-casa-id="${casa.id}" data-field="adherente_nombre" value="${casa.adherente_nombre || ""}" />
          </label>
          <label>
            Precio ARS
            <input class="js-casa-field" data-casa-id="${casa.id}" data-field="precio_ars" type="number" min="0" step="0.01" value="${casa.precio_ars}" />
          </label>
          <label>
            Saldo ARS
            <input value="${casa.saldo_ars}" disabled />
          </label>
          <label>
            Gasto total ARS
            <input value="${casa.gasto_total_ars}" disabled />
          </label>
        </div>

        <label>
          Descripcion editable
          <textarea class="js-casa-field" data-casa-id="${casa.id}" data-field="descripcion" rows="2">${casa.descripcion || ""}</textarea>
        </label>

        <p class="item-sub">Avance financiero: ${casa.avance_financiero_pct}%</p>
        <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${casa.avance_financiero_pct}">
          <div class="progress-fill" style="width:${casa.avance_financiero_pct}%"></div>
        </div>

        <div class="row-compact mt-1">
          <button class="btn-table js-casa-save" type="button" data-casa-id="${casa.id}">Guardar casa</button>
          <button class="btn-table js-add-item" type="button" data-casa-id="${casa.id}">Agregar item</button>
          <button class="btn-table js-add-gasto" type="button" data-casa-id="${casa.id}">Agregar gasto</button>
        </div>

        <div class="house-items">
          <h5>Items de la casa</h5>
          ${(casa.items || []).map((item) => `
            <details class="house-item" open>
              <summary class="item-head">
                <span>${item.nombre}</span>
                <strong>${money(item.total_ars)}</strong>
              </summary>
              <p class="item-sub">Proveedor: ${item.proveedor || "-"} | ${item.descripcion || "Sin descripcion"}</p>
              <div class="row-compact">
                <button class="btn-table js-item-edit" type="button" data-casa-id="${casa.id}" data-item-id="${item.id}">Editar item</button>
                <button class="btn-table js-material-add" type="button" data-casa-id="${casa.id}" data-item-id="${item.id}">Agregar material</button>
              </div>
              ${renderHouseMaterialsTable(casa.id, item)}
            </details>
          `).join("")}

          <h5>Gastos extra por casa</h5>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripcion</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${(casa.gastos || []).length === 0
                  ? "<tr><td colspan=\"4\">Sin gastos extra.</td></tr>"
                  : (casa.gastos || []).map((gasto) => `
                    <tr>
                      <td>${gasto.nombre}</td>
                      <td>${gasto.descripcion || "-"}</td>
                      <td>${money(gasto.monto_ars)}</td>
                      <td>
                        <div class="row-compact">
                          <button class="btn-table js-gasto-edit" type="button" data-casa-id="${casa.id}" data-gasto-id="${gasto.id}">Editar</button>
                          <button class="btn-table js-gasto-delete" type="button" data-casa-id="${casa.id}" data-gasto-id="${gasto.id}">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </article>
    `).join("");
  }

  function renderDetail() {
    if (!state.activeDetail) {
      if (dom.simulationDetailTitle) {
        dom.simulationDetailTitle.textContent = "Sin simulacion seleccionada";
      }
      if (dom.simulationDetailMeta) {
        dom.simulationDetailMeta.textContent = "Selecciona una simulacion para trabajar.";
      }
      if (dom.simulationHousesContainer) {
        dom.simulationHousesContainer.innerHTML = "<p>Selecciona una simulacion para editar casas, items y materiales.</p>";
      }
      return;
    }

    const detail = state.activeDetail;
    const summary = computeGlobalSummary(detail);

    if (dom.simulationDetailTitle) {
      dom.simulationDetailTitle.textContent = detail.titulo || `Simulacion #${detail.id}`;
    }

    if (dom.simulationDetailMeta) {
      const fecha = detail.updated_at ? new Date(detail.updated_at).toLocaleString("es-AR") : "sin fecha";
      dom.simulationDetailMeta.textContent = `ID ${detail.id} | Ultima actualizacion: ${fecha}`;
    }

    if (dom.simulationTitleInput) {
      dom.simulationTitleInput.value = detail.titulo || "";
    }

    if (dom.simulationDescriptionInput) {
      dom.simulationDescriptionInput.value = detail.descripcion || "";
    }

    setOffersToUi(dom, detail.ofertas || []);

    renderActiveParams(detail.parametros || {});
    renderGlobalSummary(dom.simulationGlobalSummary, summary);
    renderGlobalMaterials(dom.simulationGlobalMaterials, summary.materiales);
    renderTimelinePreview(dom.simulationTimelinePreview, detail.timeline || []);
    renderHouses(detail);
    setHouseCreateMode(false);
  }

  async function loadDetail(simulationId, silent = false) {
    if (!simulationId) {
      return;
    }

    state.loading = true;
    const payload = await obtenerDetalleSimulacion(simulationId);
    state.activeId = simulationId;
    state.activeDetail = normalizeSimulationDetail(payload, simulationId);

    if (typeof onSimulationLoaded === "function") {
      onSimulationLoaded(state.activeDetail);
    }

    renderSimulationList();
    renderDetail();
    updateSummaryLine();

    if (!silent) {
      setSummary(dom.simSummary, `Simulacion ${state.activeDetail.titulo} cargada.`);
    }

    state.loading = false;
  }

  async function refreshList(options = {}) {
    const { silent = false } = options;
    const payload = await listarSimulacionesGuardadas();
    state.list = (Array.isArray(payload) ? payload : []).map((item) => ({
      ...item,
      id: item.id ?? item.simulacion_id ?? item.snapshot_id
    })).filter((item) => item.id != null);

    if (!state.activeId && state.list.length > 0) {
      state.activeId = state.list[0].id;
    }

    renderSimulationList();
    updateSummaryLine();

    if (state.activeId) {
      await loadDetail(state.activeId, true);
    } else {
      state.activeDetail = null;
      renderDetail();
    }

    if (!silent) {
      setSummary(dom.simSummary, `Listado de simulaciones actualizado (${state.list.length}).`);
    }
  }

  function getActiveSimulationId() {
    const id = state.activeDetail?.id || state.activeId;
    if (!id) {
      throw new Error("Selecciona una simulacion antes de continuar.");
    }
    return id;
  }

  async function createSimulation(event) {
    event.preventDefault();
    const data = new FormData(dom.simulationCreateForm);
    const titulo = String(data.get("titulo") || "").trim();
    const descripcion = String(data.get("descripcion") || "").trim();

    if (!titulo || !descripcion) {
      throw new Error("Completa titulo y descripcion.");
    }

    const parametros = getConfig(dom.form);
    const payload = await crearSimulacionGuardada({ titulo, descripcion, parametros, ofertas: [] });
    const newId = payload?.id ?? payload?.simulacion_id ?? payload?.snapshot_id;

    dom.simulationCreateForm.reset();
    await refreshList({ silent: true });

    if (newId) {
      await loadDetail(newId, true);
    }

    setSummary(dom.simSummary, "Simulacion creada correctamente.");
    writeLog(dom.systemLog, "Crear simulacion", payload);
  }

  async function saveSimulation() {
    const simulationId = getActiveSimulationId();
    const titulo = String(dom.simulationTitleInput?.value || "").trim();
    const descripcion = String(dom.simulationDescriptionInput?.value || "").trim();
    const ofertas = getOffersFromUi(dom, state.activeDetail?.ofertas || []);

    const parametros = getConfig(dom.form);
    const payload = await actualizarSimulacionGuardada(simulationId, {
      titulo,
      descripcion,
      parametros,
      ofertas
    });

    await loadDetail(simulationId, true);
    await refreshList({ silent: true });
    setSummary(dom.simSummary, "Cambios guardados en la simulacion.");
    writeLog(dom.systemLog, "Guardar simulacion", payload);
  }

  async function saveSnapshot() {
    const simulationId = getActiveSimulationId();
    const parametros = getConfig(dom.form);
    const ofertas = getOffersFromUi(dom, state.activeDetail?.ofertas || []);

    const payload = await actualizarSimulacionGuardada(simulationId, {
      parametros,
      ofertas,
      snapshot: true
    });

    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, "Snapshot guardado correctamente.");
    writeLog(dom.systemLog, "Guardar snapshot", payload);
  }

  async function cloneSimulation() {
    const simulationId = getActiveSimulationId();
    const tituloSugerido = `${state.activeDetail?.titulo || "Simulacion"} (copia)`;
    const titulo = window.prompt("Titulo de la nueva version", tituloSugerido);
    if (!titulo) {
      return;
    }

    const payload = await clonarSimulacionGuardada(simulationId, { titulo });
    const newId = payload?.id ?? payload?.simulacion_id ?? payload?.snapshot_id;

    await refreshList({ silent: true });
    if (newId) {
      await loadDetail(newId, true);
    }

    setSummary(dom.simSummary, "Se clono la simulacion como nueva version.");
    writeLog(dom.systemLog, "Clonar simulacion", payload);
  }

  async function recalculateSimulation() {
    const simulationId = getActiveSimulationId();
    const parametros = getConfig(dom.form);
    const ofertas = getOffersFromUi(dom, state.activeDetail?.ofertas || []);

    const payload = await recalcularSimulacionGuardada(simulationId, { parametros, ofertas });
    await loadDetail(simulationId, true);

    if (state.activeDetail?.parametros) {
      setConfigToForm(dom.form, state.activeDetail.parametros);
      updateMetodologiaUI();
      updateConfigPreview();
    }

    setSummary(dom.simSummary, "Simulacion recalculada con parametros economicos actuales.");
    writeLog(dom.systemLog, "Recalcular simulacion", payload);
  }

  async function saveHouse(casaId) {
    const simulationId = getActiveSimulationId();
    const card = dom.simulationHousesContainer?.querySelector(`[data-casa-id="${casaId}"]`);
    if (!card) {
      throw new Error("No se encontro la casa en pantalla.");
    }

    const adherenteNombre = String(card.querySelector('[data-field="adherente_nombre"]')?.value || "").trim();
    const descripcion = String(card.querySelector('[data-field="descripcion"]')?.value || "").trim();
    const precioArs = numberOrZero(card.querySelector('[data-field="precio_ars"]')?.value || 0);
    const completada = Boolean(card.querySelector(".js-casa-completada")?.checked);

    const payload = await actualizarCasaSimulacion(simulationId, casaId, {
      adherente_nombre: adherenteNombre,
      descripcion,
      precio_ars: Number(precioArs.toFixed(2)),
      completada
    });

    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, `Casa ${casaId} actualizada.`);
    writeLog(dom.systemLog, "Actualizar casa", payload);
  }

  async function addHouseFromForm(event) {
    event?.preventDefault();
    try {
      const simulationId = getActiveSimulationId();
      const adherenteId = numberOrZero(dom.houseCreateAdherenteIdInput?.value || 0);
      const adherenteNombre = String(dom.houseCreateAdherenteInput?.value || "").trim();
      const precioArs = numberOrZero(dom.houseCreatePrecioInput?.value || 0);
      const descripcion = String(dom.houseCreateDescripcionInput?.value || "").trim();

      if (!adherenteNombre && adherenteId < 1) {
        setHouseCreateStatus("Ingresa nombre o ID del adherente.", true);
        throw new Error("Ingresa nombre o ID del adherente.");
      }

      if (!Number.isFinite(precioArs) || precioArs <= 0) {
        setHouseCreateStatus("Ingresa un precio mayor a 0.", true);
        throw new Error("Ingresa un precio de casa válido.");
      }

      const housePayload = {
        adherente_nombre: adherenteNombre,
        precio_ars: Number(precioArs.toFixed(2)),
        descripcion,
        completada: false
      };

      if (adherenteId > 0) {
        housePayload.adherente_id = adherenteId;
      }

      const payload = await agregarCasaSimulacion(simulationId, housePayload);

      await loadDetail(simulationId, true);
      dom.houseCreateForm?.reset();
      setHouseCreateMode(false);
      setHouseCreateStatus("Casa agregada correctamente.");
      setSummary(dom.simSummary, "Casa agregada a la simulacion.");
      writeLog(dom.systemLog, "Agregar casa", payload);
    } catch (error) {
      const message = String(error?.message || "No se pudo agregar la casa.");
      setHouseCreateStatus(`No se pudo agregar: ${message}`, true);
      throw error;
    }
  }

  async function addItem(casaId) {
    const simulationId = getActiveSimulationId();
    const nombre = window.prompt("Nombre del item (cimientos, losa, revoque, etc.)", "");
    if (!nombre) {
      return;
    }

    const proveedor = window.prompt("Proveedor del item", "") || "";
    const descripcion = window.prompt("Descripcion del item", "") || "";

    const payload = await agregarItemCasa(simulationId, casaId, { nombre, proveedor, descripcion });
    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, `Item agregado en casa ${casaId}.`);
    writeLog(dom.systemLog, "Agregar item", payload);
  }

  async function editItem(casaId, itemId) {
    const simulationId = getActiveSimulationId();
    const casa = state.activeDetail?.casas?.find((entry) => String(entry.id) === String(casaId));
    const item = casa?.items?.find((entry) => String(entry.id) === String(itemId));
    if (!item) {
      throw new Error("No se encontro el item seleccionado.");
    }

    const nombre = window.prompt("Nombre del item", item.nombre);
    if (!nombre) {
      return;
    }

    const proveedor = window.prompt("Proveedor", item.proveedor || "") || "";
    const descripcion = window.prompt("Descripcion", item.descripcion || "") || "";

    const payload = await actualizarItemCasa(simulationId, casaId, itemId, { nombre, proveedor, descripcion });
    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, `Item ${itemId} actualizado.`);
    writeLog(dom.systemLog, "Editar item", payload);
  }

  async function addMaterial(casaId, itemId) {
    const simulationId = getActiveSimulationId();
    const nombre = window.prompt("Nombre del material", "");
    if (!nombre) {
      return;
    }

    const proveedor = window.prompt("Proveedor", "") || "";
    const descripcion = window.prompt("Descripcion", "") || "";
    const unidad = window.prompt("Unidad (kg, m2, bolsa, etc.)", "u") || "u";

    const precioUnitario = parsePromptNumber("Precio unitario ARS", 0, 0);
    if (precioUnitario === null) {
      return;
    }

    const cantidadTotal = parsePromptNumber("Cantidad total", 0, 0);
    if (cantidadTotal === null) {
      return;
    }

    const cantidadRetirada = parsePromptNumber("Cantidad retirada", 0, 0);
    if (cantidadRetirada === null) {
      return;
    }

    const cantidadEnConstruccion = parsePromptNumber("Cantidad en construccion", Math.max(0, cantidadTotal - cantidadRetirada), 0);
    if (cantidadEnConstruccion === null) {
      return;
    }

    const payload = await agregarMaterialItem(simulationId, casaId, itemId, {
      nombre,
      proveedor,
      descripcion,
      unidad,
      precio_unitario: Number(precioUnitario.toFixed(2)),
      cantidad_total: Number(cantidadTotal.toFixed(2)),
      cantidad_retirada: Number(cantidadRetirada.toFixed(2)),
      cantidad_en_construccion: Number(cantidadEnConstruccion.toFixed(2))
    });

    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, `Material agregado al item ${itemId}.`);
    writeLog(dom.systemLog, "Agregar material", payload);
  }

  async function editMaterial(casaId, itemId, materialId) {
    const simulationId = getActiveSimulationId();
    const casa = state.activeDetail?.casas?.find((entry) => String(entry.id) === String(casaId));
    const item = casa?.items?.find((entry) => String(entry.id) === String(itemId));
    const material = item?.materiales?.find((entry) => String(entry.id) === String(materialId));
    if (!material) {
      throw new Error("No se encontro el material seleccionado.");
    }

    const nombre = window.prompt("Nombre", material.nombre);
    if (!nombre) {
      return;
    }

    const proveedor = window.prompt("Proveedor", material.proveedor || "") || "";
    const descripcion = window.prompt("Descripcion", material.descripcion || "") || "";
    const unidad = window.prompt("Unidad", material.unidad || "u") || "u";
    const precioUnitario = parsePromptNumber("Precio unitario", material.precio_unitario, 0);
    if (precioUnitario === null) {
      return;
    }

    const cantidadTotal = parsePromptNumber("Cantidad total", material.cantidad_total, 0);
    if (cantidadTotal === null) {
      return;
    }

    const cantidadRetirada = parsePromptNumber("Cantidad retirada", material.cantidad_retirada, 0);
    if (cantidadRetirada === null) {
      return;
    }

    const cantidadEnConstruccion = parsePromptNumber(
      "Cantidad en construccion",
      material.cantidad_en_construccion,
      0
    );
    if (cantidadEnConstruccion === null) {
      return;
    }

    const payload = await actualizarMaterialItem(simulationId, casaId, itemId, materialId, {
      nombre,
      proveedor,
      descripcion,
      unidad,
      precio_unitario: Number(precioUnitario.toFixed(2)),
      cantidad_total: Number(cantidadTotal.toFixed(2)),
      cantidad_retirada: Number(cantidadRetirada.toFixed(2)),
      cantidad_en_construccion: Number(cantidadEnConstruccion.toFixed(2))
    });

    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, `Material ${materialId} actualizado.`);
    writeLog(dom.systemLog, "Editar material", payload);
  }

  async function registerMaterialDelivery(casaId, itemId, materialId) {
    const simulationId = getActiveSimulationId();
    const cantidad = parsePromptNumber("Cantidad de entrega parcial", 0, 0);
    if (cantidad === null) {
      return;
    }

    const payload = await registrarEntregaMaterial(simulationId, casaId, itemId, materialId, {
      cantidad: Number(cantidad.toFixed(2))
    });

    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, `Entrega parcial registrada en material ${materialId}.`);
    writeLog(dom.systemLog, "Entrega parcial", payload);
  }

  async function addGasto(casaId) {
    const simulationId = getActiveSimulationId();
    const nombre = window.prompt("Nombre del gasto (ej. mano de obra)", "");
    if (!nombre) {
      return;
    }

    const descripcion = window.prompt("Descripcion", "") || "";
    const monto = parsePromptNumber("Monto ARS", 0, 0);
    if (monto === null) {
      return;
    }

    const payload = await agregarGastoCasa(simulationId, casaId, {
      nombre,
      descripcion,
      monto_ars: Number(monto.toFixed(2))
    });

    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, `Gasto agregado en casa ${casaId}.`);
    writeLog(dom.systemLog, "Agregar gasto", payload);
  }

  async function editGasto(casaId, gastoId) {
    const simulationId = getActiveSimulationId();
    const casa = state.activeDetail?.casas?.find((entry) => String(entry.id) === String(casaId));
    const gasto = casa?.gastos?.find((entry) => String(entry.id) === String(gastoId));
    if (!gasto) {
      throw new Error("No se encontro el gasto seleccionado.");
    }

    const nombre = window.prompt("Nombre", gasto.nombre);
    if (!nombre) {
      return;
    }

    const descripcion = window.prompt("Descripcion", gasto.descripcion || "") || "";
    const monto = parsePromptNumber("Monto ARS", gasto.monto_ars, 0);
    if (monto === null) {
      return;
    }

    const payload = await actualizarGastoCasa(simulationId, casaId, gastoId, {
      nombre,
      descripcion,
      monto_ars: Number(monto.toFixed(2))
    });

    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, `Gasto ${gastoId} actualizado.`);
    writeLog(dom.systemLog, "Editar gasto", payload);
  }

  async function deleteGasto(casaId, gastoId, focusBackElement) {
    const confirmed = await pedirConfirmacion({
      title: "Eliminar gasto",
      message: "Esta accion eliminara el gasto de la casa.",
      acceptLabel: "Eliminar",
      focusBackElement
    });

    if (!confirmed) {
      return;
    }

    const simulationId = getActiveSimulationId();
    const payload = await eliminarGastoCasa(simulationId, casaId, gastoId);
    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, `Gasto ${gastoId} eliminado.`);
    writeLog(dom.systemLog, "Eliminar gasto", payload);
  }

  dom.simulationCreateForm?.addEventListener("submit", withUiFeedback(createSimulation));
  dom.simulationOfferForm?.addEventListener("submit", withUiFeedback(async (event) => {
    event.preventDefault();

    const adherenteId = numberOrZero(dom.simulationOfferAdherenteInput?.value || 0);
    const montoArs = Number(numberOrZero(dom.simulationOfferMontoInput?.value || 0).toFixed(2));

    if (!Number.isFinite(adherenteId) || adherenteId < 1) {
      throw new Error("Ingresa un ID de adherente valido.");
    }

    if (!Number.isFinite(montoArs) || montoArs < 0) {
      throw new Error("Ingresa un monto valido.");
    }

    const current = getOffersFromUi(dom, state.activeDetail?.ofertas || []);
    current.push({ adherente_id: adherenteId, monto_ars: montoArs });
    setOffersToUi(dom, current);

    if (dom.simulationOfferForm) {
      dom.simulationOfferForm.reset();
    }
  }));

  dom.buttonOfferClear?.addEventListener("click", () => {
    setOffersToUi(dom, []);
  });

  dom.buttonRefreshSimulations?.addEventListener("click", withUiFeedback(() => refreshList()));
  dom.buttonSaveSimulation?.addEventListener("click", withUiFeedback(saveSimulation));
  dom.buttonSaveSnapshot?.addEventListener("click", withUiFeedback(saveSnapshot));
  dom.buttonCloneSimulation?.addEventListener("click", withUiFeedback(cloneSimulation));
  dom.buttonRecalculateSimulation?.addEventListener("click", withUiFeedback(recalculateSimulation));
  dom.buttonAddHouse?.addEventListener("click", () => {
    if (!state.activeId && !state.activeDetail?.id) {
      setHouseCreateStatus("Primero selecciona una simulación guardada.", true);
      setSummary(dom.simSummary, "Selecciona una simulacion antes de agregar casas.");
      return;
    }

    setHouseCreateStatus(
      "El backend actual no expone creación de casas nuevas. Solo permite editar casas ya existentes en la simulación.",
      true
    );
    setHouseCreateMode(true);
  });
  dom.houseCreateForm?.addEventListener("submit", withUiFeedback(addHouseFromForm));
  dom.buttonHouseCreateCancel?.addEventListener("click", () => {
    dom.houseCreateForm?.reset();
    if (dom.houseCreateStatus) {
      dom.houseCreateStatus.classList.add("hidden");
      dom.houseCreateStatus.textContent = "";
    }
    setHouseCreateMode(false);
  });

  dom.simulationsList?.addEventListener("click", withUiFeedback(async (event) => {
    const button = event.target.closest("[data-simulation-id]");
    if (!button) {
      return;
    }
    const simulationId = button.getAttribute("data-simulation-id");
    await loadDetail(simulationId);
  }));

  dom.simulationOffersList?.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".js-offer-remove");
    if (!removeButton) {
      return;
    }

    const index = Number(removeButton.getAttribute("data-offer-index") || -1);
    const current = getOffersFromUi(dom, state.activeDetail?.ofertas || []);
    if (!Number.isFinite(index) || index < 0 || index >= current.length) {
      return;
    }

    current.splice(index, 1);
    setOffersToUi(dom, current);
  });

  dom.simulationHousesContainer?.addEventListener("click", withUiFeedback(async (event) => {
    const saveHouseButton = event.target.closest(".js-casa-save");
    if (saveHouseButton) {
      const casaId = saveHouseButton.getAttribute("data-casa-id");
      await saveHouse(casaId);
      return;
    }

    const addItemButton = event.target.closest(".js-add-item");
    if (addItemButton) {
      const casaId = addItemButton.getAttribute("data-casa-id");
      await addItem(casaId);
      return;
    }

    const addGastoButton = event.target.closest(".js-add-gasto");
    if (addGastoButton) {
      const casaId = addGastoButton.getAttribute("data-casa-id");
      await addGasto(casaId);
      return;
    }

    const itemEditButton = event.target.closest(".js-item-edit");
    if (itemEditButton) {
      const casaId = itemEditButton.getAttribute("data-casa-id");
      const itemId = itemEditButton.getAttribute("data-item-id");
      await editItem(casaId, itemId);
      return;
    }

    const addMaterialButton = event.target.closest(".js-material-add");
    if (addMaterialButton) {
      const casaId = addMaterialButton.getAttribute("data-casa-id");
      const itemId = addMaterialButton.getAttribute("data-item-id");
      await addMaterial(casaId, itemId);
      return;
    }

    const materialEditButton = event.target.closest(".js-material-edit");
    if (materialEditButton) {
      const casaId = materialEditButton.getAttribute("data-casa-id");
      const itemId = materialEditButton.getAttribute("data-item-id");
      const materialId = materialEditButton.getAttribute("data-material-id");
      await editMaterial(casaId, itemId, materialId);
      return;
    }

    const materialDeliveryButton = event.target.closest(".js-material-delivery");
    if (materialDeliveryButton) {
      const casaId = materialDeliveryButton.getAttribute("data-casa-id");
      const itemId = materialDeliveryButton.getAttribute("data-item-id");
      const materialId = materialDeliveryButton.getAttribute("data-material-id");
      await registerMaterialDelivery(casaId, itemId, materialId);
      return;
    }

    const gastoEditButton = event.target.closest(".js-gasto-edit");
    if (gastoEditButton) {
      const casaId = gastoEditButton.getAttribute("data-casa-id");
      const gastoId = gastoEditButton.getAttribute("data-gasto-id");
      await editGasto(casaId, gastoId);
      return;
    }

    const gastoDeleteButton = event.target.closest(".js-gasto-delete");
    if (gastoDeleteButton) {
      const casaId = gastoDeleteButton.getAttribute("data-casa-id");
      const gastoId = gastoDeleteButton.getAttribute("data-gasto-id");
      await deleteGasto(casaId, gastoId, gastoDeleteButton);
      return;
    }
  }));

  return {
    refreshList,
    loadDetail
  };
}
