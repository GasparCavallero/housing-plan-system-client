export function getConfig(form) {
  const data = new FormData(form);

  const porcentajeMediaCuota = Number(data.get("porcentajeMediaCuota"));
  const porcentajeCuotaCompleta = Number(data.get("porcentajeCuotaCompleta"));
  const mesesMediaCuotaInicial = Number(data.get("mesesMediaCuotaInicial"));

  return {
    cantidad_cuotas: Number(data.get("cantidadCuotas")),
    cantidad_de_adherentes: Number(data.get("cantidadAdherentes")),
    metros_cuadrados_vivienda: Number(data.get("metrosCuadrados")),
    valor_por_m2: Number(data.get("valorPorM2")),
    duracion_construccion_meses: Number(data.get("duracionConstruccionMeses")),
    tipo_cambio: Number(data.get("tipoCambio")),
    porcentaje_media_cuota: Number.isFinite(porcentajeMediaCuota) && porcentajeMediaCuota > 0 ? porcentajeMediaCuota : 0.5,
    porcentaje_cuota_completa: Number.isFinite(porcentajeCuotaCompleta) && porcentajeCuotaCompleta > 0 ? porcentajeCuotaCompleta : 1,
    meses_media_cuota_inicial: Number.isFinite(mesesMediaCuotaInicial) && mesesMediaCuotaInicial > 0 ? Math.trunc(mesesMediaCuotaInicial) : 7
  };
}

export function setConfigToForm(form, config) {
  form.elements.cantidadCuotas.value = config.cantidad_cuotas;
  form.elements.cantidadAdherentes.value = config.cantidad_de_adherentes;
  form.elements.metrosCuadrados.value = config.metros_cuadrados_vivienda;
  form.elements.valorPorM2.value = config.valor_por_m2;
  form.elements.duracionConstruccionMeses.value = config.duracion_construccion_meses;
  form.elements.tipoCambio.value = config.tipo_cambio;
  form.elements.porcentajeMediaCuota.value = config.porcentaje_media_cuota ?? 0.5;
  form.elements.porcentajeCuotaCompleta.value = config.porcentaje_cuota_completa ?? 1;
  form.elements.mesesMediaCuotaInicial.value = config.meses_media_cuota_inicial ?? 7;
}

export function getCuotasFromForm(form) {
  const data = new FormData(form);
  const metrosCuadrados = Number(data.get("metrosCuadrados"));
  const valorPorM2 = Number(data.get("valorPorM2"));
  const porcentajeMediaCuota = Number(data.get("porcentajeMediaCuota"));
  const porcentajeCuotaCompleta = Number(data.get("porcentajeCuotaCompleta"));
  const valorTotalVivienda = metrosCuadrados * valorPorM2;

  return {
    mediaCuota: valorTotalVivienda * (porcentajeMediaCuota / 100),
    cuotaCompleta: valorTotalVivienda * (porcentajeCuotaCompleta / 100)
  };
}
