from pydantic import BaseModel, Field

from app.models.adherente import Adherente, EstadoAdherente
from app.models.plan import ConfiguracionPlan
from app.services.calculos import calcular_ingreso_mensual


class EventoCasa(BaseModel):
    casa_numero: int
    mes_inicio: int


class ResultadoSimulacion(BaseModel):
    horizonte_meses: int
    eventos: list[EventoCasa] = Field(default_factory=list)
    fondo_final_ars: float


def simular_evolucion_plan(
    adherentes: list[Adherente],
    config: ConfiguracionPlan,
    fondo_inicial_ars: float,
    horizonte_meses: int,
) -> ResultadoSimulacion:
    fondo = fondo_inicial_ars
    eventos: list[EventoCasa] = []
    casa_nro = 0

    adherentes_sim = [adherente.model_copy(deep=True) for adherente in adherentes]
    valor_vivienda = config.valor_total_vivienda

    for mes in range(1, horizonte_meses + 1):
        fondo += calcular_ingreso_mensual(adherentes_sim, config)

        while fondo >= valor_vivienda:
            elegible = next(
                (a for a in adherentes_sim if a.estado == EstadoAdherente.ACTIVO),
                None,
            )
            if elegible is None:
                break
            elegible.estado = EstadoAdherente.ADJUDICADO
            fondo -= valor_vivienda
            casa_nro += 1
            eventos.append(EventoCasa(casa_numero=casa_nro, mes_inicio=mes))

    return ResultadoSimulacion(
        horizonte_meses=horizonte_meses,
        eventos=eventos,
        fondo_final_ars=fondo,
    )
