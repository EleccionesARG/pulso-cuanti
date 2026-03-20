'use client';
import { useState, useRef, useEffect } from "react";

interface Estimacion { categoria: string; porcentaje: number; rango?: string }
interface SegmentoClave { segmento: string; posicion: string; nota: string }
interface Respuesta {
  pregunta_interpretada: string;
  estimacion: Estimacion[];
  confianza: string;
  razonamiento: string;
  segmentos_clave: SegmentoClave[];
  variable_proxy: string;
  advertencia?: string;
}

interface Consulta {
  pregunta: string;
  respuesta?: Respuesta;
  loading?: boolean;
  error?: string;
}

const PREGUNTAS_EJEMPLO = [
  "¿Qué porcentaje apoyaría una suba de retenciones al campo?",
  "¿Cuánto mediría hoy un frente Bullrich-Macri?",
  "¿Cómo reaccionaría la opinión pública a una devaluación del 30%?",
  "Si Milei cierra el CONICET, ¿cuántos lo aprobarían?",
  "¿Qué porcentaje apoyaría volver al FMI por un nuevo préstamo?",
  "¿CFK tiene chances reales de ganar una elección hoy?",
  "¿Cuántos argentinos apoyarían eliminar los subsidios a la energía?",
  "Si la inflación vuelve al 10% mensual, ¿cuánto cae la aprobación de Milei?",
];

const COLORS = ["#7c3aed", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#6366f1", "#f97316", "#10b981"];

const confianzaConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  alta: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Confianza alta — pregunta similar a la encuesta" },
  media: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Confianza media — inferencia a partir de variables proxy" },
  baja: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Confianza baja — estimación especulativa, usar con cautela" },
};

function ResultadoCard({ resp }: { resp: Respuesta }) {
  const maxPct = Math.max(...resp.estimacion.map(e => e.porcentaje), 1);
  const conf = confianzaConfig[resp.confianza] || confianzaConfig.media;

  return (
    <div className="space-y-4">
      {/* Interpretación */}
      <p className="text-sm text-slate-500 italic">{resp.pregunta_interpretada}</p>

      {/* Confianza badge */}
      <div className={`${conf.bg} ${conf.border} border rounded-lg px-3 py-2`}>
        <span className={`text-xs font-semibold ${conf.text}`}>{conf.label}</span>
      </div>

      {/* Distribución principal */}
      <div className="space-y-3">
        {resp.estimacion.map((e, i) => (
          <div key={i}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-medium text-slate-700">{e.categoria}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900 tabular-nums">{e.porcentaje}%</span>
                {e.rango && <span className="text-xs text-slate-400">({e.rango})</span>}
              </div>
            </div>
            <div className="h-5 bg-slate-100 rounded-md overflow-hidden">
              <div className="h-full rounded-md transition-all duration-700" style={{ width: `${(e.porcentaje / maxPct) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        ))}
      </div>

      {/* Razonamiento */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Razonamiento</h4>
        <p className="text-sm text-slate-700 leading-relaxed">{resp.razonamiento}</p>
      </div>

      {/* Segmentos clave */}
      {resp.segmentos_clave && resp.segmentos_clave.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cómo se distribuye por segmento</h4>
          <div className="space-y-1.5">
            {resp.segmentos_clave.map((s, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="font-medium text-slate-700 min-w-[140px]">{s.segmento}</span>
                <span className="text-violet-700 font-semibold min-w-[120px]">{s.posicion}</span>
                <span className="text-slate-400">{s.nota}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variable proxy */}
      {resp.variable_proxy && (
        <div className="text-xs text-slate-400">
          <span className="font-semibold">Variable proxy usada:</span> {resp.variable_proxy}
        </div>
      )}

      {/* Advertencia */}
      {resp.advertencia && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-700">{resp.advertencia}</p>
        </div>
      )}
    </div>
  );
}

export default function PulsoCuanti() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [consultas]);

  const preguntar = async (pregunta: string) => {
    if (!pregunta.trim() || isLoading) return;
    setInput("");
    setIsLoading(true);
    setConsultas(prev => [...prev, { pregunta, loading: true }]);

    try {
      const res = await fetch("/api/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta }),
      });

      if (!res.ok) throw new Error("Error en la API");
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setConsultas(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { pregunta, respuesta: data };
        return updated;
      });
    } catch (err) {
      setConsultas(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { pregunta, error: "Error al procesar la consulta. Intentá de nuevo." };
        return updated;
      });
      console.error(err);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`body { font-family: 'Inter', system-ui, sans-serif; }`}</style>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">Panel Pulso <span className="text-violet-600">Cuanti</span></h1>
              <p className="text-xs text-slate-400">Pronóstico de opinión pública · 10,385 encuestas + ML + IA</p>
            </div>
            <span className="text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">v4.2</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Empty state */}
          {consultas.length === 0 && (
            <div className="mt-8 mb-12">
              <h2 className="text-2xl font-bold text-slate-800 text-center tracking-tight">Hacé una pregunta sobre opinión pública</h2>
              <p className="text-sm text-slate-400 text-center mt-2 max-w-lg mx-auto leading-relaxed">
                El sistema combina modelos de Machine Learning entrenados con 10,385 encuestas reales
                con razonamiento de IA para estimar respuestas a preguntas que no están directamente en la encuesta.
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-2">
                {PREGUNTAS_EJEMPLO.map((q, i) => (
                  <button key={i} onClick={() => preguntar(q)} disabled={isLoading}
                    className="text-left px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-violet-300 hover:bg-violet-50 transition leading-snug">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Consultas */}
          {consultas.map((c, i) => (
            <div key={i} className="mb-8">
              {/* Pregunta */}
              <div className="flex justify-end mb-3">
                <div className="bg-violet-600 text-white px-4 py-2.5 rounded-2xl rounded-br-sm max-w-[85%] text-sm leading-relaxed">
                  {c.pregunta}
                </div>
              </div>

              {/* Respuesta */}
              {c.loading ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm flex-shrink-0">📊</div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(d => (
                        <div key={d} className="w-2 h-2 rounded-full bg-violet-400" style={{ animation: `pulse 1s ease-in-out ${d * 0.15}s infinite` }} />
                      ))}
                    </div>
                    <span className="text-sm text-slate-400">Consultando modelos ML y analizando...</span>
                  </div>
                  <style>{`@keyframes pulse { 0%,100% { opacity:0.3; transform:scale(0.8) } 50% { opacity:1; transform:scale(1.1) } }`}</style>
                </div>
              ) : c.error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{c.error}</div>
              ) : c.respuesta ? (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm flex-shrink-0 mt-1">📊</div>
                  <div className="flex-1 border border-slate-200 rounded-xl p-5 bg-white">
                    <ResultadoCard resp={c.respuesta} />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </main>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white sticky bottom-0">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex gap-2">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && preguntar(input)}
              placeholder="¿Qué querés saber sobre la opinión pública argentina?"
              disabled={isLoading}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:bg-slate-50" />
            <button onClick={() => preguntar(input)} disabled={isLoading || !input.trim()}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition ${isLoading || !input.trim() ? "bg-slate-100 text-slate-400" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
              Consultar
            </button>
          </div>
          <p className="text-center text-xs text-slate-300 mt-2">ML sobre 10,385 encuestas reales (Pulso Research, NOV 2025 — MAR 2026) + razonamiento IA</p>
        </div>
      </div>
    </div>
  );
}
