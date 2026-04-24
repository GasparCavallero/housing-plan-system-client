const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

function KpiBox({ label, value }) {
  return (
    <div className="sim-kpi-box">
      <p className="sim-kpi-label">{label}</p>
      <p className="sim-kpi-value">{value}</p>
    </div>
  );
}

function ProgressBar({ pct }) {
  const safe = Math.min(100, Math.max(0, Number(pct ?? 0)));
  return (
    <div className="progress-wrap">
      <div className="sim-progress-bar" style={{ width: `${safe}%` }} />
      <p className="sim-progress-label">Uso de fondo: {safe.toFixed(2)}%</p>
    </div>
  );
}

function SectionCard({ title, desc, onClick }) {
  return (
    <button className="sim-section-card" onClick={onClick}>
      <p className="sim-section-label">SECCIÓN</p>
      <p className="sim-section-title">{title}</p>
      <p className="sim-section-desc">{desc}</p>
      <span className="sim-card-arrow">›</span>
    </button>
  );
}

function CasaDetalle({ casa, onVolver }) {
  const nombre       = casa.adherente_nombre ?? casa.descripcion ?? `Casa #${casa.id}`;
  const planillas    = casa.items?.length ?? 0;
  const items        = casa.items?.length ?? 0;
  const gastos       = casa.gastos?.length ?? 0;
  const completada   = casa.completada ? "Completada" : "En curso";
  const avance       = casa.avance_financiero_pct ?? 0;

  const fondoDisponible  = casa.precio_ars ?? 0;
  const comprometido     = casa.total_casa_ars ?? 0;
  const totalMaterial    = casa.cantidad_material_total ?? 0;
  const totalRetirado    = casa.cantidad_material_retirada ?? 0;
  const enConstruccion   = casa.cantidad_material_en_construccion ?? 0;
  const saldoDisponible  = casa.saldo_ars ?? 0;

  return (
    <div>
      <div className="sim-breadcrumb" style={{ marginBottom: "1rem" }}>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Plan simulado</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item clickable" onClick={onVolver}>Casas</span>
        <span className="sim-breadcrumb-sep"> / </span>
        <span className="sim-breadcrumb-item">{nombre}</span>
      </div>

      <div className="sim-section-header">
        <h3>Casa seleccionada</h3>
        <button className="btn btn-ghost" onClick={onVolver}>Volver a casas</button>
      </div>

      <p style={{ marginBottom: "1rem", color: "var(--muted)", fontSize: "0.9rem" }}>{nombre}</p>

      {/* Tarjeta principal de la casa */}
      <div className="sim-casa-card">
        <div className="sim-casa-card-header">
          <div>
            <p className="sim-section-label">CASA #{casa.id}</p>
            <p className="sim-section-title">{nombre}</p>
            <p className="sim-section-desc">
              Saldo {fmt(saldoDisponible)} | Materiales {fmt(casa.total_materiales_ars)} | Gastos {fmt(casa.total_gastos_ars)} | Mano de obra {fmt(0)}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <span className="sim-badge">{planillas} planillas</span>
            <span className="sim-badge">{completada}</span>
            <span className="sim-badge">{avance.toFixed(2)}%</span>
          </div>
        </div>

        <button className="btn btn-ghost" style={{ marginBottom: "1rem", alignSelf: "flex-end" }} disabled>
          Editar casa
        </button>

        <div className="house-finance-grid">
          <KpiBox label="Fondo disponible" value={fmt(fondoDisponible)} />
          <KpiBox label="Comprometido"     value={fmt(comprometido)} />
          <KpiBox label="Total material"   value={totalMaterial} />
          <KpiBox label="Total retirado"   value={totalRetirado} />
          <KpiBox label="En construcción"  value={enConstruccion} />
          <KpiBox label="Saldo disponible" value={fmt(saldoDisponible)} />
        </div>

        <ProgressBar pct={avance} />
      </div>

      {/* Secciones */}
      <div className="sim-sections-list" style={{ marginTop: "1.5rem" }}>
        <SectionCard
          title="Planillas"
          desc={`${planillas} planillas registradas`}
          onClick={() => {}}
        />
        <SectionCard
          title="Items"
          desc={`${items} items registrados`}
          onClick={() => {}}
        />
        <SectionCard
          title="Materiales"
          desc="Vista consolidada de todos los materiales"
          onClick={() => {}}
        />
        <SectionCard
          title="Gastos"
          desc={`${gastos} gastos registrados`}
          onClick={() => {}}
        />
        <SectionCard
          title="Mano de obra"
          desc="Registros de mano de obra"
          onClick={() => {}}
        />
      </div>
    </div>
  );
}

export default CasaDetalle;
