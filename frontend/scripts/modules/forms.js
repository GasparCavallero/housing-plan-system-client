export function getConfig(form) {
  const data = new FormData(form);

  return {
    metodologia_plan: String(data.get("metodologiaPlan") || "dinamico"),
    cronograma_adjudicaciones_anual: String(data.get("cronogramaAdjudicacionesAnual") || "").trim() || null,
    cantidad_cuotas: Number(data.get("cantidadCuotas")),
    cantidad_de_adherentes: Number(data.get("cantidadAdherentes")),
    metros_cuadrados_vivienda: Number(data.get("metrosCuadrados")),
    valor_por_m2: Number(data.get("valorPorM2")),
    porcentaje_cuota_completa: Number(data.get("porcentajeCuotaCompleta")),
    porcentaje_media_cuota: Number(data.get("porcentajeMediaCuota")),
    meses_media_cuota_inicial: Number(data.get("mesesMediaCuotaInicial")),
    duracion_construccion_meses: Number(data.get("duracionConstruccionMeses")),
    tipo_cambio: Number(data.get("tipoCambio"))
  };
}

export function setConfigToForm(form, config) {
  form.elements.metodologiaPlan.value = config.metodologia_plan ?? config.metodologiaPlan ?? "dinamico";
  form.elements.cronogramaAdjudicacionesAnual.value = config.cronograma_adjudicaciones_anual ?? config.cronogramaAdjudicacionesAnual ?? "";
  form.elements.cantidadCuotas.value = config.cantidad_cuotas;
  form.elements.cantidadAdherentes.value = config.cantidad_de_adherentes;
  form.elements.metrosCuadrados.value = config.metros_cuadrados_vivienda;
  form.elements.valorPorM2.value = config.valor_por_m2;
  form.elements.porcentajeCuotaCompleta.value = config.porcentaje_cuota_completa ?? config.porcentajeCuotaCompleta;
  form.elements.porcentajeMediaCuota.value = config.porcentaje_media_cuota ?? config.porcentajeMediaCuota;
  form.elements.mesesMediaCuotaInicial.value = config.meses_media_cuota_inicial ?? config.mesesMediaCuotaInicial ?? 7;
  form.elements.duracionConstruccionMeses.value = config.duracion_construccion_meses;
  form.elements.tipoCambio.value = config.tipo_cambio;
}

