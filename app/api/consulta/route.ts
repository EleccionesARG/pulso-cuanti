// ============================================================================
// API Route — Panel Pulso Cuanti v4.2
// /api/consulta/route.ts
// Recibe una pregunta → consulta modelos ML por segmento → Claude razona → respuesta
// ============================================================================

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const ML_API = process.env.NEXT_PUBLIC_CUANTI_API_URL || 'http://localhost:8000';

// Segmentos clave para consultar al ML
const SEGMENTOS_CLAVE = [
  { nombre: "Nacional (sin filtros)", perfil: {} },
  { nombre: "Votante LLA 2025", perfil: { VOTO25: 1 } },
  { nombre: "Votante FP 2025", perfil: { VOTO25: 2 } },
  { nombre: "No votó / Indeciso 2025", perfil: { VOTO25: 99 } },
  { nombre: "Joven 16-29", perfil: { EDAD_A: 1 } },
  { nombre: "Adulto 30-49", perfil: { EDAD_A: 2 } },
  { nombre: "Mayor +50", perfil: { EDAD_A: 3 } },
  { nombre: "AMBA", perfil: { AREA: 2 } },
  { nombre: "Interior", perfil: { AREA: 1 } },
  { nombre: "NSE Alto (ABC1)", perfil: { nse_sim: 1 } },
  { nombre: "NSE Medio (C2-C3)", perfil: { nse_sim: 2 } },
  { nombre: "NSE Bajo (D1-D2E)", perfil: { nse_sim: 4 } },
  { nombre: "Cree que Milei resuelve", perfil: { ECONOMIA: 1 } },
  { nombre: "Cree que necesita tiempo", perfil: { ECONOMIA: 2 } },
  { nombre: "Cree que no sabe resolver", perfil: { ECONOMIA: 3 } },
  { nombre: "Mujer", perfil: { SEXO: 1 } },
  { nombre: "Hombre", perfil: { SEXO: 2 } },
  { nombre: "Jubilado", perfil: { estado: 3 } },
];

async function getMLDistributions(): Promise<string> {
  const targets = ['GESNAC', 'MILEI2', 'CFK2', 'PBULL2', 'KICI2', 'ECOHOY', 'ECOPROSPE', 'RUMBO', 'SENTIMIENTO'];
  
  const results: string[] = [];
  
  for (const seg of SEGMENTOS_CLAVE) {
    try {
      const res = await fetch(`${ML_API}/predict/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...seg.perfil, targets }),
        signal: AbortSignal.timeout(5000),
      });
      
      if (!res.ok) continue;
      const data = await res.json();
      
      let segText = `\n[${seg.nombre}]`;
      for (const [target, pred] of Object.entries(data.predicciones || {})) {
        const p = pred as { resultados: { categoria: string; porcentaje: number }[] };
        const distro = p.resultados.map((r: { categoria: string; porcentaje: number }) => `${r.categoria}=${r.porcentaje}%`).join(', ');
        segText += `\n  ${target}: ${distro}`;
      }
      results.push(segText);
    } catch {
      continue;
    }
  }
  
  return results.join('\n');
}

const SYSTEM_PROMPT = `Sos un analista de opinión pública argentino con 20 años de experiencia. Tenés acceso a modelos de Machine Learning entrenados con 12,185 encuestas reales (Pulso Research, NOV 2025 - ABR 2026) y al contexto político argentino actual.

Tu trabajo es responder preguntas concretas sobre opinión pública argentina estimando distribuciones de probabilidad. Las preguntas pueden ser sobre temas que NO están directamente en la encuesta — en esos casos, razonás a partir de los datos que sí tenés.

DATOS ELECTORALES REALES (ponderados, ola abril 2026, n=1800):
- Voto legislativas 2025: LLA 26.3%, Fuerza Patria 21.7%, Prov.Unidas 5.2%, FIT 2.6%, Otros 7.8%, NsNc 36.4%
- Voto ballotage 2023: Milei 40.3%, Massa 32.1%, No votó/NsNc 27.6%

CONTEXTO POLÍTICO ABRIL 2026:
- Gobierno de Milei lleva 16 meses
- Imagen positiva de Milei: 38.7% (bajó desde marzo)
- Gestión positiva (GESNAC): 33.9%
- 54.5% cree que el rumbo es incorrecto
- 45.9% evalúa la economía como "muy mala" (sube 6pp respecto a marzo)
- El sentimiento predominante es esperanza (30.3%) seguido de incertidumbre (19.5%) y enojo/bronca (14.7%)
- Capacidad económica de Milei: 10.3% cree que está resolviendo, 25.9% que necesita tiempo, 54.6% que no sabe resolver

INSTRUCCIONES:
1. Respondé SIEMPRE con una estimación numérica (distribución de %). No digas "no puedo estimar" — siempre se puede hacer una estimación informada con caveats.
2. Explicá tu razonamiento: qué variables de la encuesta usaste como proxy, qué supuestos hacés.
3. Distinguí entre estimaciones de alta confianza (pregunta similar a la encuesta) y baja confianza (pregunta nueva que requiere inferencia).
4. Sé políticamente neutro. No tomes partido.
5. Usá los datos del ML que te paso para fundamentar los números, no inventes distribuciones.

FORMATO: Respondé SOLO en JSON válido (sin backticks, sin markdown):
{
  "pregunta_interpretada": "Cómo entendí la pregunta",
  "estimacion": [
    {"categoria": "A favor", "porcentaje": 35, "rango": "30-40%"},
    {"categoria": "En contra", "porcentaje": 45, "rango": "40-50%"},
    {"categoria": "Indiferente/NsNc", "porcentaje": 20, "rango": "15-25%"}
  ],
  "confianza": "alta | media | baja",
  "razonamiento": "Explicación de 3-5 oraciones de cómo llegué a estos números. Qué variables usé como proxy, qué supuestos hice, qué segmentos pesan más.",
  "segmentos_clave": [
    {"segmento": "Votantes LLA", "posicion": "A favor (78%)", "nota": "Coherente con aprobación del ajuste"},
    {"segmento": "Votantes FP", "posicion": "En contra (82%)", "nota": "Rechazan todas las medidas del gobierno"},
    {"segmento": "Indecisos", "posicion": "Divididos (45/35/20)", "nota": "El segmento más heterogéneo"}
  ],
  "variable_proxy": "Las variables de la encuesta que más se acercan a esta pregunta",
  "advertencia": "Si hay algún caveat importante sobre la estimación"
}`;

export async function POST(request: Request) {
  try {
    const { pregunta } = await request.json();
    
    if (!pregunta?.trim()) {
      return NextResponse.json({ error: 'Enviá una pregunta' }, { status: 400 });
    }

    // Step 1: Get ML distributions for all key segments
    let mlData = '';
    try {
      mlData = await getMLDistributions();
    } catch {
      mlData = '(No se pudieron obtener datos del ML — usar datos del system prompt)';
    }

    // Step 2: Claude reasons with ML data + political context
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `PREGUNTA DEL USUARIO:
"${pregunta}"

DISTRIBUCIONES DE LOS MODELOS ML POR SEGMENTO (datos reales de 10,385 encuestas):
${mlData}

Basándote en estos datos reales y tu conocimiento del contexto político argentino, estimá la respuesta a la pregunta. Respondé en JSON.`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Respuesta inesperada');

    let jsonText = content.text;
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonText = jsonMatch[0];

    const resultado = JSON.parse(jsonText);
    return NextResponse.json(resultado);

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la consulta. ' + (error instanceof Error ? error.message : '') },
      { status: 500 }
    );
  }
}
