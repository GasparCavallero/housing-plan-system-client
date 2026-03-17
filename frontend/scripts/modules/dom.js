export const dom = {
  form: document.getElementById("config-form"),
  adherenteForm: document.getElementById("adherente-form"),
  pagoForm: document.getElementById("pago-form"),
  tableBody: document.getElementById("sim-table-body"),
  adherentesBody: document.getElementById("adherentes-body"),
  pagosBody: document.getElementById("pagos-body"),
  simSummary: document.getElementById("sim-summary"),
  adherentesSummary: document.getElementById("adherentes-summary"),
  pagosSummary: document.getElementById("pagos-summary"),
  systemLog: document.getElementById("system-log"),
  buttonSimular: document.getElementById("btn-simular"),
  buttonSimularServidor: document.getElementById("btn-simular-servidor"),
  buttonProcesarMes: document.getElementById("btn-procesar-mes"),
  buttonCargarConfig: document.getElementById("btn-cargar-config"),
  buttonGuardarConfig: document.getElementById("btn-guardar-config"),
  buttonListarAdherentes: document.getElementById("btn-listar-adherentes"),
  buttonListarPagos: document.getElementById("btn-listar-pagos"),
  kpi: {
    valorViviendaArs: document.getElementById("kpi-valor-vivienda-ars"),
    valorViviendaUsd: document.getElementById("kpi-valor-vivienda-usd"),
    fondoArs: document.getElementById("kpi-fondo-ars"),
    fondoUsd: document.getElementById("kpi-fondo-usd"),
    viviendasIniciadas: document.getElementById("kpi-viviendas-iniciadas"),
    viviendasFinalizadas: document.getElementById("kpi-viviendas-finalizadas"),
    ingresoMensual: document.getElementById("kpi-ingreso-mensual")
  }
};
