'use client';
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_CUANTI_API_URL || "http://localhost:8000";

// ============================================================
// DATOS NACIONALES REALES PONDERADOS (base: 10,385 casos)
// ============================================================

const DATOS_NACIONALES: Record<string, { label: string; datos: { cat: string; pct: number }[] }> = {
  VOTO25: { label: "Intención de voto 2025", datos: [
    { cat: "LLA", pct: 26.2 }, { cat: "Fuerza Patria", pct: 21.8 }, { cat: "Prov. Unidas", pct: 5.3 },
    { cat: "FIT", pct: 2.5 }, { cat: "Otro", pct: 7.9 }, { cat: "NsNc / Indecisos", pct: 36.3 },
  ]},
  GESNAC: { label: "Evaluación gestión Milei", datos: [
    { cat: "Muy bien", pct: 16.3 }, { cat: "Bien", pct: 20.8 }, { cat: "Mal", pct: 14.7 },
    { cat: "Muy mal", pct: 40.2 }, { cat: "NsNc", pct: 8.0 },
  ]},
  MILEI2: { label: "Imagen de Milei", datos: [
    { cat: "Positiva", pct: 41.2 }, { cat: "Negativa", pct: 55.5 }, { cat: "NsNc", pct: 3.3 },
  ]},
  CFK2: { label: "Imagen de CFK", datos: [
    { cat: "Positiva", pct: 39.9 }, { cat: "Negativa", pct: 57.6 }, { cat: "NsNc", pct: 2.6 },
  ]},
  MM2: { label: "Imagen de Macri", datos: [
    { cat: "Positiva", pct: 35.8 }, { cat: "Negativa", pct: 60.9 }, { cat: "NsNc", pct: 3.2 },
  ]},
  PBULL2: { label: "Imagen de Bullrich", datos: [
    { cat: "Positiva", pct: 41.4 }, { cat: "Negativa", pct: 54.3 }, { cat: "NsNc", pct: 4.2 },
  ]},
  KICI2: { label: "Imagen de Kicillof", datos: [
    { cat: "Positiva", pct: 40.6 }, { cat: "Negativa", pct: 51.0 }, { cat: "NsNc", pct: 8.4 },
  ]},
  ECOHOY: { label: "Percepción económica hoy", datos: [
    { cat: "Muy buena", pct: 2.9 }, { cat: "Buena", pct: 22.3 }, { cat: "Mala", pct: 27.2 },
    { cat: "Muy mala", pct: 44.8 }, { cat: "NsNc", pct: 2.7 },
  ]},
  ECOPROSPE: { label: "Prospectiva económica", datos: [
    { cat: "Mejor", pct: 31.9 }, { cat: "Igual", pct: 12.9 }, { cat: "Peor", pct: 47.6 }, { cat: "NsNc", pct: 7.6 },
  ]},
  RUMBO: { label: "Rumbo del gobierno", datos: [
    { cat: "Correcto", pct: 36.4 }, { cat: "Incorrecto", pct: 51.6 }, { cat: "NsNc", pct: 12.0 },
  ]},
  SENTIMIENTO: { label: "Sentimiento sobre el futuro", datos: [
    { cat: "Esperanza", pct: 33.2 }, { cat: "Incertidumbre", pct: 20.4 }, { cat: "Enojo", pct: 13.4 },
    { cat: "Angustia", pct: 10.2 }, { cat: "Tristeza", pct: 7.8 }, { cat: "Desilusión", pct: 7.6 },
    { cat: "Miedo", pct: 4.7 }, { cat: "Otro", pct: 2.7 },
  ]},
};

// ============================================================
// VARIABLES DE CRUCE
// ============================================================

const FILTROS: Record<string, { label: string; opciones: Record<number, string> }> = {
  SEXO: { label: "Sexo", opciones: { 1: "Femenino", 2: "Masculino" } },
  EDAD_A: { label: "Edad", opciones: { 1: "16-29", 2: "30-49", 3: "50-65", 4: "+65" } },
  nse_sim: { label: "NSE", opciones: { 1: "ABC1", 2: "C2", 3: "C3", 4: "D1", 5: "D2E" } },
  REGION: { label: "Región", opciones: { 0: "GBA", 1: "PBA Interior", 2: "CABA", 3: "Cuyo", 4: "NOA", 5: "NEA", 6: "Pampeana", 7: "Patagonia" } },
  AREA: { label: "AMBA vs Interior", opciones: { 1: "Interior", 2: "AMBA" } },
  estado: { label: "Ocupación", opciones: { 1: "Trabaja", 2: "Desocupado", 3: "Jubilado", 4: "Inactivo" } },
  NED2: { label: "Educación", opciones: { 1: "Primario", 2: "Secundario", 3: "Superior" } },
  c_medica: { label: "Cobertura médica", opciones: { 1: "Tiene", 2: "No tiene" } },
  GRALES23: { label: "Voto Generales 2023", opciones: { 1: "Milei (LLA)", 2: "Bullrich (JxC)", 4: "Massa (UxP)", 7: "Bregman (FIT)", 99: "No votó" } },
  BALLO23: { label: "Voto Ballotage 2023", opciones: { 1: "Milei", 4: "Massa", 99: "No votó" } },
  RESP: { label: "Responsable crisis", opciones: { 1: "Gestión Milei", 2: "Gestión anterior", 3: "NsNc" } },
  ECONOMIA: { label: "Milei y la economía", opciones: { 1: "Resuelve", 2: "Necesita tiempo", 3: "No sabe resolver", 4: "NsNc" } },
};

type Resultado = { categoria: string; porcentaje: number };

const BAR_COLORS = ["#7c3aed", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#6366f1", "#f97316", "#10b981", "#ec4899", "#06b6d4"];

// ============================================================
// COMPONENTS
// ============================================================

function BarChart({ datos, maxPct: maxOverride, colorOffset = 0 }: { datos: { cat: string; pct: number }[]; maxPct?: number; colorOffset?: number }) {
  const maxPct = maxOverride || Math.max(...datos.map(d => d.pct), 1);
  return (
    <div className="space-y-2">
      {datos.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between items-baseline mb-0.5">
            <span className="text-sm text-slate-700">{d.cat}</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">{d.pct}%</span>
          </div>
          <div className="h-4 bg-slate-100 rounded-md overflow-hidden">
            <div className="h-full rounded-md transition-all duration-500" style={{ width: `${(d.pct / maxPct) * 100}%`, backgroundColor: BAR_COLORS[(i + colorOffset) % BAR_COLORS.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterPanel({ filtros, onChange, label }: { filtros: Record<string, number | undefined>; onChange: (key: string, val: string) => void; label?: string }) {
  const activos = Object.entries(filtros).filter(([, v]) => v !== undefined).length;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{label || "Variables de cruce"}</h3>
        {activos > 0 && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">{activos} filtro{activos > 1 ? "s" : ""} activo{activos > 1 ? "s" : ""}</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {Object.entries(FILTROS).map(([key, cfg]) => (
          <select
            key={key}
            value={filtros[key] ?? ""}
            onChange={e => onChange(key, e.target.value)}
            className={`w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${filtros[key] !== undefined ? "bg-violet-50 border-violet-300 text-violet-800 font-medium" : "bg-slate-50 border-slate-200 text-slate-600"}`}
          >
            <option value="">{cfg.label}</option>
            {Object.entries(cfg.opciones).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}

function DescripcionPerfil({ filtros }: { filtros: Record<string, number | undefined> }) {
  const parts = Object.entries(filtros)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      const cfg = FILTROS[k];
      return cfg?.opciones[v as number] || String(v);
    });
  if (parts.length === 0) return <span className="text-slate-400">Total nacional</span>;
  return <span className="text-violet-700 font-medium">{parts.join(" · ")}</span>;
}

// ============================================================
// MAIN APP
// ============================================================

export default function PulsoCuanti() {
  const [tab, setTab] = useState<"consulta" | "comparar">("consulta");

  // Consulta state
  const [target, setTarget] = useState("VOTO25");
  const [filtros, setFiltros] = useState<Record<string, number | undefined>>({});
  const [resultado, setResultado] = useState<Resultado[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [familia, setFamilia] = useState<string | null>(null);

  // Comparar state
  const [compTarget, setCompTarget] = useState("VOTO25");
  const [filtrosA, setFiltrosA] = useState<Record<string, number | undefined>>({});
  const [filtrosB, setFiltrosB] = useState<Record<string, number | undefined>>({});
  const [resultadoA, setResultadoA] = useState<Resultado[] | null>(null);
  const [resultadoB, setResultadoB] = useState<Resultado[] | null>(null);
  const [loadingComp, setLoadingComp] = useState(false);

  const hasFiltros = Object.values(filtros).some(v => v !== undefined);
  const hasFiltrosA = Object.values(filtrosA).some(v => v !== undefined);
  const hasFiltrosB = Object.values(filtrosB).some(v => v !== undefined);

  const updateFiltro = (key: string, val: string) => {
    setFiltros(prev => {
      const next = { ...prev };
      if (val === "") { delete next[key]; } else { next[key] = parseInt(val); }
      return next;
    });
  };

  // Auto-query when target or filters change
  useEffect(() => {
    if (!hasFiltros) {
      setResultado(null);
      setAccuracy(null);
      setFamilia(null);
      return;
    }
    const timer = setTimeout(() => fetchPrediction(), 300);
    return () => clearTimeout(timer);
  }, [target, filtros]);

  const fetchPrediction = async () => {
    setLoading(true); setError(null);
    try {
      const body = { ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined)), targets: [target] };
      const res = await fetch(`${API_URL}/predict/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error en la API");
      const data = await res.json();
      const pred = data.predicciones?.[target];
      if (pred) {
        setResultado(pred.resultados.map((r: { categoria: string; porcentaje: number }) => ({ categoria: r.categoria, porcentaje: r.porcentaje })));
        setAccuracy(pred.accuracy_modelo);
        setFamilia(pred.familia_features);
      }
    } catch (err) {
      setError("Error al consultar el modelo. Verificá que el backend esté corriendo.");
      console.error(err);
    } finally { setLoading(false); }
  };

  const fetchSinglePred = async (perfil: Record<string, number | undefined>, tgt: string) => {
    const body = { ...Object.fromEntries(Object.entries(perfil).filter(([, v]) => v !== undefined)), targets: [tgt] };
    const res = await fetch(`${API_URL}/predict/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Error");
    const data = await res.json();
    const pred = data.predicciones?.[tgt];
    return pred?.resultados.map((r: { categoria: string; porcentaje: number }) => ({ categoria: r.categoria, porcentaje: r.porcentaje })) || null;
  };

  const compararSegmentos = async () => {
    if (!hasFiltrosA && !hasFiltrosB) return;
    setLoadingComp(true); setError(null);
    try {
      const [rA, rB] = await Promise.all([
        hasFiltrosA ? fetchSinglePred(filtrosA, compTarget) : null,
        hasFiltrosB ? fetchSinglePred(filtrosB, compTarget) : null,
      ]);
      setResultadoA(rA);
      setResultadoB(rB);
    } catch (err) {
      setError("Error al comparar segmentos.");
      console.error(err);
    } finally { setLoadingComp(false); }
  };

  const datosNacionales = DATOS_NACIONALES[target]?.datos || [];
  const datosNacComp = DATOS_NACIONALES[compTarget]?.datos || [];

  // For comparison: compute combined max for consistent bar scale
  const allCompPcts = [
    ...(resultadoA?.map(r => r.porcentaje) || []),
    ...(resultadoB?.map(r => r.porcentaje) || []),
    ...datosNacComp.map(d => d.pct),
  ];
  const compMaxPct = Math.max(...allCompPcts, 1);

  return (
    <div className="min-h-screen bg-slate-50">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`body { font-family: 'Inter', system-ui, sans-serif; }`}</style>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Panel Pulso <span className="text-violet-600">Cuanti</span></h1>
            <p className="text-xs text-slate-400">12 modelos ML · 10,385 casos · NOV 2025 → MAR 2026</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setTab("consulta")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === "consulta" ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}>
              Consulta
            </button>
            <button onClick={() => setTab("comparar")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === "comparar" ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}>
              Comparar segmentos
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">{error}</div>}

        {/* ============ TAB: CONSULTA ============ */}
        {tab === "consulta" && (
          <>
            {/* Target selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(DATOS_NACIONALES).map(([key, cfg]) => (
                <button key={key} onClick={() => { setTarget(key); setResultado(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${target === key ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`}>
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <FilterPanel filtros={filtros} onChange={updateFiltro} label="Agregá variables de cruce para filtrar" />

            {/* Results: side by side when filtered */}
            <div className={`grid gap-4 ${hasFiltros ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-xl"}`}>
              {/* Nacional */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{DATOS_NACIONALES[target]?.label}</h3>
                    <span className="text-xs text-slate-400">Total nacional · Datos reales ponderados</span>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">N=10,385</span>
                </div>
                <BarChart datos={datosNacionales} />
              </div>

              {/* Filtrado (ML) */}
              {hasFiltros && (
                <div className="bg-white border border-violet-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-violet-800">{DATOS_NACIONALES[target]?.label}</h3>
                      <span className="text-xs"><DescripcionPerfil filtros={filtros} /></span>
                    </div>
                    <div className="text-right">
                      {loading && <span className="text-xs text-violet-500 animate-pulse">Calculando...</span>}
                      {!loading && accuracy && <span className="text-xs text-slate-400">Accuracy: {(accuracy * 100).toFixed(0)}% · Familia {familia}</span>}
                    </div>
                  </div>
                  {resultado ? (
                    <BarChart datos={resultado.map(r => ({ cat: r.categoria, pct: r.porcentaje }))} colorOffset={0} />
                  ) : (
                    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                      {loading ? "Consultando modelo ML..." : "Seleccioná al menos un filtro"}
                    </div>
                  )}
                </div>
              )}
            </div>

            {hasFiltros && resultado && !loading && (
              <div className="mt-4 bg-violet-50 border border-violet-200 rounded-lg p-3">
                <p className="text-sm text-violet-800">
                  <span className="font-semibold">Diferencias vs. nacional: </span>
                  {resultado.slice(0, 3).map((r, i) => {
                    const nac = datosNacionales.find(d => d.cat === r.categoria);
                    if (!nac) return null;
                    const delta = Math.round((r.porcentaje - nac.pct) * 10) / 10;
                    if (Math.abs(delta) < 0.5) return null;
                    return <span key={i} className="mr-3">{r.categoria} <span className={delta > 0 ? "text-emerald-700 font-bold" : "text-red-700 font-bold"}>{delta > 0 ? "+" : ""}{delta}pp</span></span>;
                  })}
                </p>
              </div>
            )}
          </>
        )}

        {/* ============ TAB: COMPARAR ============ */}
        {tab === "comparar" && (
          <>
            {/* Target */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(DATOS_NACIONALES).map(([key, cfg]) => (
                <button key={key} onClick={() => { setCompTarget(key); setResultadoA(null); setResultadoB(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${compTarget === key ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`}>
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Two filter panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-violet-700 mb-2">Segmento A</h3>
                <FilterPanel filtros={filtrosA} onChange={(k, v) => setFiltrosA(prev => {
                  const next = { ...prev }; if (v === "") delete next[k]; else next[k] = parseInt(v); return next;
                })} label="Variables segmento A" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-sky-700 mb-2">Segmento B</h3>
                <FilterPanel filtros={filtrosB} onChange={(k, v) => setFiltrosB(prev => {
                  const next = { ...prev }; if (v === "") delete next[k]; else next[k] = parseInt(v); return next;
                })} label="Variables segmento B" />
              </div>
            </div>

            <button onClick={compararSegmentos} disabled={loadingComp || (!hasFiltrosA && !hasFiltrosB)}
              className={`w-full py-2.5 rounded-lg font-semibold text-sm mb-6 transition ${loadingComp || (!hasFiltrosA && !hasFiltrosB) ? "bg-slate-200 text-slate-400" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
              {loadingComp ? "Comparando..." : "Comparar segmentos"}
            </button>

            {/* Results: Nacional + A + B */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nacional reference */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-1">{DATOS_NACIONALES[compTarget]?.label}</h3>
                <span className="text-xs text-slate-400 block mb-3">Nacional (referencia)</span>
                <BarChart datos={datosNacComp} maxPct={compMaxPct} />
              </div>

              {/* Segment A */}
              <div className={`border rounded-xl p-4 ${resultadoA ? "bg-violet-50 border-violet-200" : "bg-white border-slate-200"}`}>
                <h3 className="text-sm font-bold text-violet-700 mb-1">Segmento A</h3>
                <span className="text-xs block mb-3"><DescripcionPerfil filtros={filtrosA} /></span>
                {resultadoA ? (
                  <BarChart datos={resultadoA.map(r => ({ cat: r.categoria, pct: r.porcentaje }))} maxPct={compMaxPct} />
                ) : (
                  <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Definí el segmento A</div>
                )}
              </div>

              {/* Segment B */}
              <div className={`border rounded-xl p-4 ${resultadoB ? "bg-sky-50 border-sky-200" : "bg-white border-slate-200"}`}>
                <h3 className="text-sm font-bold text-sky-700 mb-1">Segmento B</h3>
                <span className="text-xs block mb-3"><DescripcionPerfil filtros={filtrosB} /></span>
                {resultadoB ? (
                  <BarChart datos={resultadoB.map(r => ({ cat: r.categoria, pct: r.porcentaje }))} maxPct={compMaxPct} colorOffset={5} />
                ) : (
                  <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Definí el segmento B</div>
                )}
              </div>
            </div>

            {/* Delta table */}
            {resultadoA && resultadoB && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 mt-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Diferencias A vs B</h3>
                <div className="space-y-2">
                  {resultadoA.map((rA, i) => {
                    const rB = resultadoB.find(r => r.categoria === rA.categoria);
                    const delta = Math.round(((rB?.porcentaje || 0) - rA.porcentaje) * 10) / 10;
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="w-28 text-slate-700 font-medium">{rA.categoria}</span>
                        <span className="w-14 text-right text-violet-600 tabular-nums font-medium">{rA.porcentaje}%</span>
                        <span className="text-slate-300">vs</span>
                        <span className="w-14 text-right text-sky-600 tabular-nums font-medium">{rB?.porcentaje || 0}%</span>
                        <span className={`w-16 text-right tabular-nums font-bold ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-slate-400"}`}>
                          {delta > 0 ? "+" : ""}{delta}pp
                        </span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                          <div className="absolute h-full bg-violet-300 rounded-full" style={{ width: `${rA.porcentaje}%`, left: 0 }} />
                          <div className="absolute h-full bg-sky-300 rounded-full opacity-70" style={{ width: `${rB?.porcentaje || 0}%`, left: 0 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 mt-8 py-4 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-slate-400">
          <p>Panel Pulso Cuanti v4.0 · 12 modelos ML (Random Forest + Logistic Regression)</p>
          <p className="mt-1">10,385 casos ponderados · Pulso Research · NOV 2025 — MAR 2026</p>
        </div>
      </footer>
    </div>
  );
}
