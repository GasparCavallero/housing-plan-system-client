from datetime import datetime

from pydantic import BaseModel, Field


class PagoCreate(BaseModel):
    adherente_id: int
    monto_ars: float = Field(gt=0)
    mes: int = Field(ge=1)


class Pago(BaseModel):
    id: int
    adherente_id: int
    monto_ars: float
    mes: int
    fecha: datetime
