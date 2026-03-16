from enum import Enum

from pydantic import BaseModel, Field


class MetodoAdjudicacion(str, Enum):
    SORTEO = "sorteo"
    LICITACION = "licitacion"


class ConfiguracionPlan(BaseModel):
    cantidad_cuotas: int = Field(default=120, ge=1)
    cantidad_de_adherentes: int = Field(default=100, ge=1)
    metros_cuadrados_vivienda: float = Field(default=60.0, gt=0)
    valor_por_m2: float = Field(default=900000.0, gt=0)
    duracion_construccion_meses: int = Field(default=6, ge=1)
    tipo_cambio: float = Field(default=1100.0, gt=0)

    @property
    def valor_total_vivienda(self) -> float:
        return self.metros_cuadrados_vivienda * self.valor_por_m2

    @property
    def cuota_completa(self) -> float:
        return self.valor_total_vivienda / self.cantidad_cuotas

    @property
    def media_cuota(self) -> float:
        return self.cuota_completa / 2


class ViviendaEnConstruccion(BaseModel):
    adherente_id: int
    mes_inicio: int
    mes_fin: int
    metodo: MetodoAdjudicacion


class EstadoPlan(BaseModel):
    mes_actual: int = 0
    fondo_ars: float = 0.0
    casas_iniciadas: int = 0
    casas_entregadas: int = 0
    construcciones: list[ViviendaEnConstruccion] = Field(default_factory=list)


class ResumenFinanciero(BaseModel):
    fondo_ars: float
    fondo_usd: float
    ingreso_mensual_ars: float
    valor_vivienda_ars: float
    valor_vivienda_usd: float
