import random

from app.models.adherente import Adherente, EstadoAdherente, OfertaLicitacion


def obtener_elegibles(adherentes: list[Adherente]) -> list[Adherente]:
    return [
        adherente
        for adherente in adherentes
        if adherente.estado == EstadoAdherente.ACTIVO
    ]


def adjudicar_por_sorteo(adherentes: list[Adherente]) -> Adherente | None:
    elegibles = obtener_elegibles(adherentes)
    if not elegibles:
        return None
    return random.choice(elegibles)


def adjudicar_por_licitacion(
    adherentes: list[Adherente], ofertas: list[OfertaLicitacion]
) -> tuple[Adherente | None, OfertaLicitacion | None]:
    elegibles = {a.id: a for a in obtener_elegibles(adherentes)}
    ofertas_validas = [oferta for oferta in ofertas if oferta.adherente_id in elegibles]
    if not ofertas_validas:
        return None, None

    oferta_ganadora = max(
        ofertas_validas, key=lambda item: item.porcentaje_cuotas_restantes
    )
    return elegibles[oferta_ganadora.adherente_id], oferta_ganadora
