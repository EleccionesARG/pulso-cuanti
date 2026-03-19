import { useState } from "react";

// CHANGE THIS to your Railway/Render URL after deploy
const API_URL = process.env.NEXT_PUBLIC_CUANTI_API_URL || "http://localhost:8000";

// ============================================================
// CODEBOOK
// ============================================================

const VARIABLES = {
  SEXO: { label: "Sexo", opciones: { 1: "Femenino", 2: "Masculino" } },
  EDAD_A: { label: "Edad", opciones: { 1: "16-29", 2: "30-49", 3: "50-65", 4: "+65" } },
  nse_sim: { label: "NSE", opciones: { 1: "ABC1", 2: "C2", 3: "C3", 4: "D1", 5: "D2E" } },
  REGION: { label: "Región", opciones: { 0: "GBA", 1: "PBA Interior", 2: "CABA", 3: "Cuyo", 4: "NOA", 5: "NEA", 6: "Pampeana", 7: "Patagonia" } },
  AREA: { label: "AMBA vs Interior", opciones: { 1: "Interior", 2: "AMBA" } },
  c_medica: { label: "Cobertura médica", opciones: { 1: "Tiene", 2: "No tiene" } },
  estado: { label: "Ocupación", opciones: { 1: "Trabaja", 2: "Desocupado", 3: "Jubilado", 4: "Inactivo" } },
  NED2: { label: "Educación", opciones: { 1: "Primario", 2: "Secundario", 3: "Superior" } },
  GRALES23: { label: "Voto Generales 2023", opciones: { 1: "Milei (LLA)", 2: "Bullrich (JxC)", 4: "Massa (UxP)", 7: "Bregman (FIT)", 99: "No votó / NsNc" } },
  BALLO23: { label: "Voto Ballotage 2023", opciones: { 1: "Milei", 4: "Massa", 99: "No votó / NsNc" } },
  RESP: { label: "Responsable crisis", opciones: { 1: "Gestión Milei", 2: "Gestión anterior", 3: "NsNc" } },
  ECONOMIA: { label: "Milei y la economía", opciones: { 1: "Resuelve los problemas", 2: "Sabe pero necesita tiempo", 3: "No sabe resolver", 4: "NsNc" } },
};

const TARGETS = {
  VOTO25: "Intención de voto",
  VOTO25_A: "Intención de voto (solo demográficas)",
  GESNAC: "Gestión Milei",
  MILEI2: "Imagen Milei",
  CFK2: "Imagen CFK",
  MM2: "Imagen Macri",
  PBULL2: "Imagen Bullrich",
  KICI2: "Imagen Kicillof",
  ECOHOY: "Percepción económica hoy",
  ECOPROSPE: "Prospectiva económica",
  RUMBO: "Rumbo del gobierno",
  SENTIMIENTO: "Sentimiento sobre el futuro",
};

type Resultado = { categoria: string; codigo: number; porcentaje: number };
type Prediccion = { modelo: string; descripcion: string; resultados: Resultado[]; accuracy_modelo: number; familia_features: string };
type DeltaRow = { categoria: string; baseline: number; escenario: number; delta_pp: number };

const BAR_COLORS = [
  "#7c3aed", "#0ea5e9", "#14b8a6", "#f59e0b",
  "#ef4444", "#6366f1", "#f97316", "#10b981",
  "#ec4899", "#06b6d4",
];

function ScoreBar({ label, pct, color, maxPct }: { label: string; pct: number; color: string; maxPct: number }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-baseline mb-0.5">
        <span className="text-sm text-slate-700 font-medium">{label}</span>
        <span className="text-lg font-bold text-slate-900 tabular-nums">{pct}%</span>
      </div>
      <div className="h-4 bg-slate-100 rounded-md overflow-hidden">
        <div className="h-full rounded-md transition-all duration-700" style={{ width: `${(pct / (maxPct || 1)) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ResultPanel({ pred, title }: { pred: Prediccion; title?: string }) {
  const maxPct = Math.max(...pred.resultados.map(r => r.porcentaje), 1);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">{title || pred.descripcion}</h3>
          <span className="text-xs text-slate-400">Modelo: {pred.modelo} · Accuracy: {pred.accuracy_modelo ? (pred.accuracy_modelo * 100).toFixed(1) + "%" : "—"} · Features: Familia {pred.familia_features}</span>
        </div>
      </div>
      {pred.resultados.map((r, i) => (
        <ScoreBar key={i} label={r.categoria} pct={r.porcentaje} color={BAR_COLORS[i % BAR_COLORS.length]} maxPct={maxPct} />
      ))}
    </div>
  );
}

function DeltaTable({ delta, cambio }: { delta: DeltaRow[]; cambio: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
      <h3 className="text-base font-bold text-slate-800 mb-1">Impacto del cambio</h3>
      <p className="text-sm text-slate-500 mb-4">{cambio}</p>
      <div className="space-y-2">
        {delta.map((d, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="w-32 text-slate-700 font-medium">{d.categoria}</span>
            <span className="w-16 text-right text-slate-400 tabular-nums">{d.baseline}%</span>
            <span className="text-slate-300">→</span>
            <span className="w-16 text-right text-slate-700 tabular-nums font-medium">{d.escenario}%</span>
            <span className={`w-20 text-right tabular-nums font-bold ${d.delta_pp > 0 ? "text-emerald-600" : d.delta_pp < 0 ? "text-red-600" : "text-slate-400"}`}>
              {d.delta_pp > 0 ? "+" : ""}{d.delta_pp}pp
            </span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              {d.delta_pp !== 0 && (
                <div
                  className={`h-full rounded-full ${d.delta_pp > 0 ? "bg-emerald-400" : "bg-red-400"}`}
                  style={{ width: `${Math.min(Math.abs(d.delta_pp) * 3, 100)}%`, marginLeft: d.delta_pp > 0 ? "50%" : `${50 - Math.min(Math.abs(d.delta_pp) * 3, 50)}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PulsoCuanti() {
  const [tab, setTab] = useState<"perfil" | "escenario">("perfil");
  const [perfil, setPerfil] = useState<Record<string, number | undefined>>({});
  const [selectedTargets, setSelectedTargets] = useState<string[]>(["VOTO25", "GESNAC", "MILEI2", "SENTIMIENTO"]);
  const [results, setResults] = useState<Record<string, Prediccion> | null>(null);
  const [perfilDesc, setPerfilDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scenario state
  const [scenVariable, setScenVariable] = useState("ECONOMIA");
  const [scenNewVal, setScenNewVal] = useState<number>(2);
  const [scenTarget, setScenTarget] = useState("VOTO25");
  const [scenResult, setScenResult] = useState<{ delta: DeltaRow[]; cambio: string; baseline: Prediccion; escenario: Prediccion } | null>(null);

  const updatePerfil = (key: string, val: string) => {
    setPerfil(prev => {
      const next = { ...prev };
      if (val === "") { delete next[key]; } else { next[key] = parseInt(val); }
      return next;
    });
  };

  const toggleTarget = (t: string) => {
    setSelectedTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const consultar = async () => {
    setLoading(true); setError(null); setResults(null);
    try {
      const body = { ...perfil, targets: selectedTargets };
      const res = await fetch(`${API_URL}/predict/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error en la API");
      const data = await res.json();
      setResults(data.predicciones);
      setPerfilDesc(data.perfil);
    } catch (err) {
      setError("Error al consultar la API. Verificá que el backend esté corriendo.");
      console.error(err);
    } finally { setLoading(false); }
  };

  const consultarEscenario = async () => {
    setLoading(true); setError(null); setScenResult(null);
    try {
      const body = {
        perfil: { ...perfil },
        variable: scenVariable,
        valor_nuevo: scenNewVal,
        target: scenTarget,
      };
      const res = await fetch(`${API_URL}/predict/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error en la API");
      const data = await res.json();
      setScenResult({ delta: data.delta, cambio: data.cambio, baseline: data.baseline, escenario: data.escenario });
    } catch (err) {
      setError("Error al consultar la API.");
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`body { font-family: 'Inter', system-ui, sans-serif; }`}</style>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              Panel Pulso <span className="text-violet-600">Cuanti</span>
            </h1>
            <p className="text-xs text-slate-400">12 modelos ML · 10,385 casos · NOV 2025 → MAR 2026</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setTab("perfil")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === "perfil" ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}>
              Consulta por perfil
            </button>
            <button onClick={() => setTab("escenario")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === "escenario" ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}>
              Escenario contrafactual
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Profile builder */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Definí el perfil a consultar <span className="font-normal text-slate-400">(dejá en blanco lo que no sepas)</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(VARIABLES).map(([key, cfg]) => (
              <div key={key}>
                <label className="block text-xs text-slate-500 mb-1">{cfg.label}</label>
                <select
                  value={perfil[key] ?? ""}
                  onChange={e => updatePerfil(key, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                >
                  <option value="">— Sin definir —</option>
                  {Object.entries(cfg.opciones).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {tab === "perfil" && (
          <>
            {/* Target selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">¿Qué querés estimar?</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TARGETS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => toggleTarget(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      selectedTargets.includes(key)
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={consultar}
                disabled={loading || selectedTargets.length === 0}
                className={`mt-4 w-full py-2.5 rounded-lg font-semibold text-sm transition ${
                  loading || selectedTargets.length === 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-violet-600 text-white hover:bg-violet-700"
                }`}
              >
                {loading ? "Consultando modelos..." : "Consultar"}
              </button>
            </div>

            {/* Results */}
            {results && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-slate-800">Resultados</h2>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{perfilDesc}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(results).map(([key, pred]) => (
                    <ResultPanel key={key} pred={pred} title={TARGETS[key as keyof typeof TARGETS] || key} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === "escenario" && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Definí el escenario contrafactual</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Variable a modificar</label>
                  <select value={scenVariable} onChange={e => setScenVariable(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                    {Object.entries(VARIABLES).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nuevo valor</label>
                  <select value={scenNewVal} onChange={e => setScenNewVal(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                    {VARIABLES[scenVariable as keyof typeof VARIABLES] &&
                      Object.entries(VARIABLES[scenVariable as keyof typeof VARIABLES].opciones).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Target a medir</label>
                  <select value={scenTarget} onChange={e => setScenTarget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                    {Object.entries(TARGETS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={consultarEscenario} disabled={loading}
                className={`mt-4 w-full py-2.5 rounded-lg font-semibold text-sm transition ${loading ? "bg-slate-200 text-slate-400" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
                {loading ? "Calculando escenario..." : "Simular escenario"}
              </button>
            </div>

            {scenResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <ResultPanel pred={scenResult.baseline} title="Baseline (perfil actual)" />
                <ResultPanel pred={scenResult.escenario} title="Escenario (modificado)" />
                <div className="md:col-span-2">
                  <DeltaTable delta={scenResult.delta} cambio={scenResult.cambio} />
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">{error}</div>
        )}
      </main>

      <footer className="border-t border-slate-200 mt-8 py-4 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-slate-400">
          <p>Panel Pulso Cuanti v4.0 · 12 modelos ML (Random Forest + Logistic Regression)</p>
          <p className="mt-1">10,385 casos ponderados (Pulso Research, NOV 2025 — MAR 2026)</p>
        </div>
      </footer>
    </div>
  );
}
