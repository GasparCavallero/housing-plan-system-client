from enum import Enum

from pydantic import BaseModel, Field


class EstadoAdherente(str, Enum):
    ACTIVO = "activo"
    EN_CONSTRUCCION = "en_construccion"
    ADJUDICADO = "adjudicado"


class AdherenteBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)


class AdherenteCreate(AdherenteBase):
    pass


class Adherente(AdherenteBase):
    id: int
    estado: EstadoAdherente = EstadoAdherente.ACTIVO
    cuotas_pagadas: int = 0
    cuotas_bonificadas_por_licitacion: int = 0


class OfertaLicitacion(BaseModel):
    adherente_id: int
    porcentaje_cuotas_restantes: float = Field(gt=0, le=100)
