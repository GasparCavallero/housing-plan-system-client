from pydantic import BaseModel


class CuotaAdherente(BaseModel):
    adherente_id: int
    estado: str
    monto_ars: float
    mes: int
