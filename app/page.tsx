'use client';
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_CUANTI_API_URL || "http://localhost:8000";

// ============================================================
// CODEBOOK
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
  VOTO25: { label: "Voto legislativas 2025", opciones: { 1: "LLA", 2: "Fuerza Patria", 3: "Prov. Unidas", 4: "FIT", 5: "Otro", 99: "No votó / NsNc" } },
  RESP: { label: "Responsable crisis", opciones: { 1: "Gestión Milei", 2: "Gestión anterior", 3: "NsNc" } },
  ECONOMIA: { label: "Milei y la economía", opciones: { 1: "Resuelve", 2: "Necesita tiempo", 3: "No sabe resolver", 4: "NsNc" } },
};

const DEMO_VARS = ["SEXO", "EDAD_A", "nse_sim", "REGION", "AREA", "estado", "NED2", "c_medica"];
const ACTITUD_VARS = ["GRALES23", "BALLO23", "VOTO25", "RESP", "ECONOMIA"];

type Resultado = { categoria: string; porcentaje: number };

const COLORS = ["#7c3aed", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#6366f1", "#f97316", "#10b981", "#ec4899", "#06b6d4"];

// ============================================================
// PERFILES PREDEFINIDOS PARA ANÁLISIS RÁPIDO
// ============================================================

const PERFILES_RAPIDOS = [
  { nombre: "Votante LLA 2025 con dudas", desc: "Votó LLA en 2025, cree que necesita tiempo", perfil: { VOTO25: 1, ECONOMIA: 2 } },
  { nombre: "Votante LLA convencido", desc: "Votó LLA, cree que resuelve", perfil: { VOTO25: 1, ECONOMIA: 1 } },
  { nombre: "Votante FP crítico de Milei", desc: "Votó FP en 2025, culpa a gestión Milei", perfil: { VOTO25: 2, RESP: 1 } },
  { nombre: "Indeciso joven AMBA", desc: "16-29, AMBA, no votó en 2025", perfil: { EDAD_A: 1, AREA: 2, VOTO25: 99 } },
  { nombre: "Indecisa mujer +50 interior", desc: "Mujer, 50-65, interior, votó FP", perfil: { SEXO: 1, EDAD_A: 3, AREA: 1, VOTO25: 2 } },
  { nombre: "Ex-Milei a indeciso", desc: "Votó Milei ballotage, no votó/NsNc en 2025", perfil: { BALLO23: 1, VOTO25: 99 } },
  { nombre: "Clase baja GBA votante FP", desc: "D1, GBA, votó FP", perfil: { nse_sim: 4, REGION: 0, VOTO25: 2 } },
  { nombre: "Profesional CABA votante LLA", desc: "ABC1, CABA, votó LLA", perfil: { nse_sim: 1, REGION: 2, VOTO25: 1 } },
];

// ============================================================
// COMPONENTS
// ============================================================

function BarH({ label, pct, maxPct, color, subtitle }: { label: string; pct: number; maxPct: number; color: string; subtitle?: string }) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-baseline mb-0.5">
        <div>
          <span className="text-sm text-slate-700 font-medium">{label}</span>
          {subtitle && <span className="text-xs text-slate-400 ml-2">{subtitle}</span>}
        </div>
        <span className="text-base font-bold text-slate-900 tabular-nums">{pct}%</span>
      </div>
      <div className="h-4 bg-slate-100 rounded-md overflow-hidden">
        <div className="h-full rounded-md transition-all duration-500" style={{ width: `${(pct / (maxPct || 1)) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function FiltroPerfil({ perfil, onChange, varsToShow }: { perfil: Record<string, number | undefined>; onChange: (k: string, v: string) => void; varsToShow: string[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {varsToShow.map(key => {
        const cfg = FILTROS[key];
        if (!cfg) return null;
        return (
          <select key={key} value={perfil[key] ?? ""} onChange={e => onChange(key, e.target.value)}
            className={`w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${perfil[key] !== undefined ? "bg-violet-50 border-violet-300 text-violet-800 font-medium" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
            <option value="">— {cfg.label} —</option>
            {Object.entries(cfg.opciones).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
        );
      })}
    </div>
  );
}

function PerfilDesc({ perfil }: { perfil: Record<string, number | undefined> }) {
  const parts = Object.entries(perfil).filter(([, v]) => v !== undefined).map(([k, v]) => FILTROS[k]?.opciones[v as number] || String(v));
  return <span className="text-xs text-slate-500">{parts.length > 0 ? parts.join(" · ") : "Sin filtros"}</span>;
}

function updatePerfil(prev: Record<string, number | undefined>, key: string, val: string): Record<string, number | undefined> {
  const next = { ...prev };
  if (val === "") delete next[key]; else next[key] = parseInt(val);
  return next;
}

async function fetchPredict(perfil: Record<string, number | undefined>, targets: string[]): Promise<Record<string, { resultados: Resultado[]; accuracy_modelo: number; familia_features: string }>> {
  const body = { ...Object.fromEntries(Object.entries(perfil).filter(([, v]) => v !== undefined)), targets };
  const res = await fetch(`${API_URL}/predict/profile`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Error en API");
  const data = await res.json();
  return data.predicciones;
}

// ============================================================
// MODULE 1: REDISTRIBUCIÓN DE INDECISOS
// ============================================================

function ModuloIndecisos() {
  const [perfil, setPerfil] = useState<Record<string, number | undefined>>({});
  const [resultado, setResultado] = useState<Resultado[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultar = async (p?: Record<string, number | undefined>) => {
    const perfilToUse = p || perfil;
    setLoading(true); setError(null);
    try {
      const data = await fetchPredict(perfilToUse, ["VOTO25"]);
      const pred = data["VOTO25"];
      if (pred) setResultado(pred.resultados.map(r => ({ categoria: r.categoria, porcentaje: r.porcentaje })));
    } catch { setError("Error al consultar."); } finally { setLoading(false); }
  };

  const nsnc = resultado?.find(r => r.categoria === "NsNc");
  const decididos = resultado?.filter(r => r.categoria !== "NsNc") || [];
  const maxDecidido = Math.max(...decididos.map(r => r.porcentaje), 1);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-bold text-slate-800 mb-1">¿A dónde irían los indecisos de este perfil?</h3>
        <p className="text-sm text-slate-500 mb-4">Seleccioná características demográficas y actitudinales. El modelo estima cómo se redistribuiría el voto.</p>

        <div className="mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Perfiles rápidos</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {PERFILES_RAPIDOS.map((pr, i) => (
              <button key={i} onClick={() => { setPerfil(pr.perfil); consultar(pr.perfil); }}
                className="px-2.5 py-1 rounded-lg text-xs border border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50 transition" title={pr.desc}>
                {pr.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Demográficas</span>
          <div className="mt-1.5">
            <FiltroPerfil perfil={perfil} onChange={(k, v) => setPerfil(prev => updatePerfil(prev, k, v))} varsToShow={DEMO_VARS} />
          </div>
        </div>
        <div className="mb-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actitudinales</span>
          <div className="mt-1.5">
            <FiltroPerfil perfil={perfil} onChange={(k, v) => setPerfil(prev => updatePerfil(prev, k, v))} varsToShow={ACTITUD_VARS} />
          </div>
        </div>
        <button onClick={() => consultar()} disabled={loading}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${loading ? "bg-slate-200 text-slate-400" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
          {loading ? "Estimando..." : "Estimar distribución de voto"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      {resultado && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Probabilidad de indecisión */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col items-center justify-center">
            <span className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Prob. de indecisión</span>
            <span className="text-5xl font-bold text-amber-700 mt-2">{nsnc?.porcentaje || 0}%</span>
            <span className="text-xs text-amber-500 mt-1">de este perfil no sabe a quién votar</span>
          </div>

          {/* Redistribución entre decididos */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 md:col-span-2">
            <h4 className="text-sm font-bold text-slate-700 mb-1">Si este perfil vota, ¿a quién va?</h4>
            <p className="text-xs text-slate-400 mb-3"><PerfilDesc perfil={perfil} /></p>
            {decididos.map((r, i) => (
              <BarH key={i} label={r.categoria} pct={r.porcentaje} maxPct={maxDecidido} color={COLORS[i % COLORS.length]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODULE 2: SEGMENTOS VULNERABLES
// ============================================================

function ModuloVulnerables() {
  const [resultados, setResultados] = useState<{ nombre: string; desc: string; probLLA: number; probFP: number; probNsNc: number; certeza: number }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analizar = async () => {
    setLoading(true); setError(null);
    try {
      const perfilesVotanteMilei = [
        { nombre: "LLA convencido", desc: "Votó LLA 2025, resuelve", perfil: { VOTO25: 1, ECONOMIA: 1 } },
        { nombre: "LLA paciente", desc: "Votó LLA, necesita tiempo", perfil: { VOTO25: 1, ECONOMIA: 2 } },
        { nombre: "LLA joven AMBA", desc: "16-29, AMBA, LLA, necesita tiempo", perfil: { VOTO25: 1, ECONOMIA: 2, EDAD_A: 1, AREA: 2 } },
        { nombre: "LLA +50 interior", desc: "+50, interior, LLA, necesita tiempo", perfil: { VOTO25: 1, ECONOMIA: 2, EDAD_A: 3, AREA: 1 } },
        { nombre: "LLA escéptico", desc: "Votó LLA pero no sabe resolver", perfil: { VOTO25: 1, ECONOMIA: 3 } },
        { nombre: "LLA clase baja", desc: "D1, votó LLA, necesita tiempo", perfil: { VOTO25: 1, ECONOMIA: 2, nse_sim: 4 } },
        { nombre: "LLA mujer", desc: "Mujer, votó LLA, necesita tiempo", perfil: { VOTO25: 1, ECONOMIA: 2, SEXO: 1 } },
        { nombre: "LLA jubilado", desc: "Jubilado, votó LLA, necesita tiempo", perfil: { VOTO25: 1, ECONOMIA: 2, estado: 3 } },
        { nombre: "Ex-Milei → indeciso", desc: "Milei ballotage, no votó 2025", perfil: { BALLO23: 1, VOTO25: 99 } },
        { nombre: "No votante 2025", desc: "No votó en 2025, culpa anteriores", perfil: { VOTO25: 99, RESP: 2 } },
      ];

      const results = await Promise.all(
        perfilesVotanteMilei.map(async (pv) => {
          const data = await fetchPredict(pv.perfil, ["VOTO25"]);
          const pred = data["VOTO25"];
          const r = pred?.resultados || [];
          const lla = r.find(x => x.categoria === "LLA")?.porcentaje || 0;
          const fp = r.find(x => x.categoria === "Fuerza Patria")?.porcentaje || 0;
          const nsnc = r.find(x => x.categoria === "NsNc")?.porcentaje || 0;
          return { nombre: pv.nombre, desc: pv.desc, probLLA: lla, probFP: fp, probNsNc: nsnc, certeza: lla };
        })
      );

      results.sort((a, b) => a.certeza - b.certeza);
      setResultados(results);
    } catch { setError("Error al analizar."); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-bold text-slate-800 mb-1">¿Qué votantes de Milei están en riesgo de migrar?</h3>
        <p className="text-sm text-slate-500 mb-4">Analiza 10 sub-perfiles de votantes de Milei, ordenados por certeza de voto — de menor a mayor. Los que tienen menor certeza son los más vulnerables.</p>
        <button onClick={analizar} disabled={loading}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${loading ? "bg-slate-200 text-slate-400" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
          {loading ? "Analizando 10 perfiles..." : "Analizar segmentos vulnerables"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      {resultados && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-0 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
            <div className="col-span-3">Perfil</div>
            <div className="col-span-2 text-right">LLA</div>
            <div className="col-span-2 text-right">Indeciso</div>
            <div className="col-span-2 text-right">FP</div>
            <div className="col-span-3">Riesgo</div>
          </div>
          {resultados.map((r, i) => {
            const riesgo = r.probLLA < 50 ? "Muy alto" : r.probLLA < 65 ? "Alto" : r.probLLA < 80 ? "Moderado" : "Bajo";
            const riesgoColor = r.probLLA < 50 ? "bg-red-100 text-red-700" : r.probLLA < 65 ? "bg-orange-100 text-orange-700" : r.probLLA < 80 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
            return (
              <div key={i} className={`grid grid-cols-12 gap-0 px-4 py-3 items-center border-b border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <div className="col-span-3">
                  <div className="text-sm font-medium text-slate-800">{r.nombre}</div>
                  <div className="text-xs text-slate-400">{r.desc}</div>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm font-bold text-violet-700 tabular-nums">{r.probLLA}%</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm font-bold text-amber-600 tabular-nums">{r.probNsNc}%</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm font-bold text-sky-600 tabular-nums">{r.probFP}%</span>
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-violet-400" style={{ width: `${r.probLLA}%` }} />
                    <div className="h-full bg-amber-300" style={{ width: `${r.probNsNc}%` }} />
                    <div className="h-full bg-sky-400" style={{ width: `${r.probFP}%` }} />
                  </div>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${riesgoColor} whitespace-nowrap`}>{riesgo}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODULE 3: ESCENARIOS DE OPINIÓN
// ============================================================

function ModuloEscenarios() {
  const [perfilBase, setPerfilBase] = useState<Record<string, number | undefined>>({ VOTO25: 1 });
  const [varCambio, setVarCambio] = useState("ECONOMIA");
  const [valOrigen, setValOrigen] = useState<number>(2);
  const [valDestino, setValDestino] = useState<number>(3);
  const [resultadoBase, setResultadoBase] = useState<Resultado[] | null>(null);
  const [resultadoEsc, setResultadoEsc] = useState<Resultado[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ESCENARIOS_RAPIDOS = [
    { nombre: "\"Necesita tiempo\" → \"No sabe resolver\"", desc: "Votantes LLA 2025 que pierden paciencia", perfil: { VOTO25: 1 }, variable: "ECONOMIA", de: 2, a: 3 },
    { nombre: "\"Gestión anterior\" → \"Gestión Milei\"", desc: "Votantes LLA que dejan de culpar al pasado", perfil: { VOTO25: 1 }, variable: "RESP", de: 2, a: 1 },
    { nombre: "\"No sabe resolver\" → \"Necesita tiempo\"", desc: "Votantes FP que se ablandan", perfil: { VOTO25: 2 }, variable: "ECONOMIA", de: 3, a: 2 },
    { nombre: "\"Resuelve\" → \"Necesita tiempo\"", desc: "Núcleo duro LLA que empieza a dudar", perfil: { VOTO25: 1 }, variable: "ECONOMIA", de: 1, a: 2 },
  ];

  const simular = async (base?: Record<string, number | undefined>, vc?: string, vo?: number, vd?: number) => {
    const b = base || perfilBase;
    const variable = vc || varCambio;
    const origen = vo ?? valOrigen;
    const destino = vd ?? valDestino;

    setLoading(true); setError(null);
    try {
      const perfilOrigen = { ...b, [variable]: origen };
      const perfilDestino = { ...b, [variable]: destino };

      const [dataOrigen, dataDestino] = await Promise.all([
        fetchPredict(perfilOrigen, ["VOTO25"]),
        fetchPredict(perfilDestino, ["VOTO25"]),
      ]);

      setResultadoBase(dataOrigen["VOTO25"]?.resultados.map(r => ({ categoria: r.categoria, porcentaje: r.porcentaje })) || null);
      setResultadoEsc(dataDestino["VOTO25"]?.resultados.map(r => ({ categoria: r.categoria, porcentaje: r.porcentaje })) || null);
    } catch { setError("Error al simular."); } finally { setLoading(false); }
  };

  const allPcts = [...(resultadoBase?.map(r => r.porcentaje) || []), ...(resultadoEsc?.map(r => r.porcentaje) || [])];
  const maxPct = Math.max(...allPcts, 1);

  const varOpciones = FILTROS[varCambio]?.opciones || {};

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-bold text-slate-800 mb-1">¿Qué pasa si cambia una opinión?</h3>
        <p className="text-sm text-slate-500 mb-4">Definí un perfil base, elegí qué variable de opinión cambia y a qué valor. El modelo calcula el impacto sobre la intención de voto.</p>

        <div className="mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Escenarios predefinidos</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {ESCENARIOS_RAPIDOS.map((esc, i) => (
              <button key={i} onClick={() => {
                setPerfilBase(esc.perfil); setVarCambio(esc.variable); setValOrigen(esc.de); setValDestino(esc.a);
                simular(esc.perfil, esc.variable, esc.de, esc.a);
              }}
                className="px-2.5 py-1 rounded-lg text-xs border border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50 transition" title={esc.desc}>
                {esc.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Perfil base (demográfico)</span>
          <div className="mt-1.5">
            <FiltroPerfil perfil={perfilBase} onChange={(k, v) => setPerfilBase(prev => updatePerfil(prev, k, v))} varsToShow={DEMO_VARS} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Variable que cambia</label>
            <select value={varCambio} onChange={e => { setVarCambio(e.target.value); setValOrigen(0); setValDestino(0); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
              {ACTITUD_VARS.map(k => <option key={k} value={k}>{FILTROS[k]?.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Valor actual (antes)</label>
            <select value={valOrigen} onChange={e => setValOrigen(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
              <option value={0}>Elegir...</option>
              {Object.entries(varOpciones).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nuevo valor (después)</label>
            <select value={valDestino} onChange={e => setValDestino(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
              <option value={0}>Elegir...</option>
              {Object.entries(varOpciones).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
            </select>
          </div>
        </div>

        <button onClick={() => simular()} disabled={loading || !valOrigen || !valDestino}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${loading || !valOrigen || !valDestino ? "bg-slate-200 text-slate-400" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
          {loading ? "Simulando..." : "Simular escenario"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      {resultadoBase && resultadoEsc && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="text-sm font-bold text-slate-700 mb-1">Antes</h4>
              <span className="text-xs text-slate-400 block mb-3">{FILTROS[varCambio]?.label} = {varOpciones[valOrigen]}</span>
              {resultadoBase.map((r, i) => <BarH key={i} label={r.categoria} pct={r.porcentaje} maxPct={maxPct} color={COLORS[i % COLORS.length]} />)}
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
              <h4 className="text-sm font-bold text-violet-700 mb-1">Después</h4>
              <span className="text-xs text-violet-400 block mb-3">{FILTROS[varCambio]?.label} = {varOpciones[valDestino]}</span>
              {resultadoEsc.map((r, i) => <BarH key={i} label={r.categoria} pct={r.porcentaje} maxPct={maxPct} color={COLORS[i % COLORS.length]} />)}
            </div>
          </div>

          {/* Delta */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Impacto del cambio</h4>
            {resultadoBase.map((rB, i) => {
              const rE = resultadoEsc.find(r => r.categoria === rB.categoria);
              const delta = Math.round(((rE?.porcentaje || 0) - rB.porcentaje) * 10) / 10;
              if (Math.abs(delta) < 0.3) return null;
              return (
                <div key={i} className="flex items-center gap-3 mb-2 text-sm">
                  <span className="w-28 text-slate-700 font-medium">{rB.categoria}</span>
                  <span className="w-14 text-right tabular-nums text-slate-500">{rB.porcentaje}%</span>
                  <span className="text-slate-300">→</span>
                  <span className="w-14 text-right tabular-nums text-slate-700 font-medium">{rE?.porcentaje || 0}%</span>
                  <span className={`w-16 text-right tabular-nums font-bold ${delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {delta > 0 ? "+" : ""}{delta}pp
                  </span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${delta > 0 ? "bg-emerald-400" : "bg-red-400"}`}
                      style={{ width: `${Math.min(Math.abs(delta) * 2, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function PulsoCuanti() {
  const [tab, setTab] = useState<"indecisos" | "vulnerables" | "escenarios">("indecisos");

  const tabs = [
    { id: "indecisos" as const, label: "Redistribución de indecisos", emoji: "🎯" },
    { id: "vulnerables" as const, label: "Segmentos vulnerables", emoji: "⚠️" },
    { id: "escenarios" as const, label: "Escenarios de opinión", emoji: "🔄" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`body { font-family: 'Inter', system-ui, sans-serif; }`}</style>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">Panel Pulso <span className="text-violet-600">Cuanti</span></h1>
              <p className="text-xs text-slate-400">13 modelos ML · 10,385 casos · NOV 2025 → MAR 2026</p>
            </div>
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">v4.0</span>
          </div>
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${tab === t.id ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}>
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {tab === "indecisos" && <ModuloIndecisos />}
        {tab === "vulnerables" && <ModuloVulnerables />}
        {tab === "escenarios" && <ModuloEscenarios />}
      </main>

      <footer className="border-t border-slate-200 mt-8 py-4 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-slate-400">
          <p>Panel Pulso Cuanti v4.1 · Random Forest + Logistic Regression · 10,385 casos ponderados · Pulso Research</p>
        </div>
      </footer>
    </div>
  );
}
