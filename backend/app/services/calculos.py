from app.models.adherente import Adherente, EstadoAdherente
from app.models.plan import ConfiguracionPlan, ResumenFinanciero


def calcular_valor_vivienda(config: ConfiguracionPlan) -> float:
    return config.valor_total_vivienda


def convertir_ars_a_usd(monto_ars: float, tipo_cambio: float) -> float:
    if tipo_cambio <= 0:
        raise ValueError("El tipo de cambio debe ser mayor a 0")
    return monto_ars / tipo_cambio


def monto_cuota_por_adherente(adherente: Adherente, config: ConfiguracionPlan) -> float:
    if adherente.estado in (EstadoAdherente.ACTIVO, EstadoAdherente.EN_CONSTRUCCION):
        return config.media_cuota
    return config.cuota_completa


def calcular_ingreso_mensual(
    adherentes: list[Adherente], config: ConfiguracionPlan
) -> float:
    return sum(monto_cuota_por_adherente(adherente, config) for adherente in adherentes)


def construir_resumen_financiero(
    fondo_ars: float, adherentes: list[Adherente], config: ConfiguracionPlan
) -> ResumenFinanciero:
    valor_vivienda_ars = calcular_valor_vivienda(config)
    ingreso = calcular_ingreso_mensual(adherentes, config)
    return ResumenFinanciero(
        fondo_ars=fondo_ars,
        fondo_usd=convertir_ars_a_usd(fondo_ars, config.tipo_cambio),
        ingreso_mensual_ars=ingreso,
        valor_vivienda_ars=valor_vivienda_ars,
        valor_vivienda_usd=convertir_ars_a_usd(valor_vivienda_ars, config.tipo_cambio),
    )
