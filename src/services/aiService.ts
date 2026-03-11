import { CoinData, AnalysisResult, ChatMessage } from "../types";

export async function analyzeCoin(coinData: CoinData, degenMode: boolean = false, type: 'token' | 'contract' | 'wallet' = 'token', quickMode: boolean = false): Promise<AnalysisResult> {
  const prompt = `
    Analiza los siguientes datos y proporciona una recomendación de seguridad y análisis técnico.
    
    ${type === 'token' ? `
    Moneda: ${coinData.name} (${coinData.symbol?.toUpperCase()})
    Precio Actual: $${coinData.market_data?.current_price?.usd || 0}
    Cambio 24h: ${coinData.market_data?.price_change_percentage_24h || 0}%
    Market Cap: $${coinData.market_data?.market_cap?.usd || 0}
    Volumen: $${coinData.market_data?.total_volume?.usd || 0}
    ` : `
    Dirección (${type}): ${coinData.id}
    `}
    
    MODO DEGEN: ${degenMode ? 'ACTIVADO (Sé AGRESIVO, SIN FILTRO, usa lenguaje de casino)' : 'DESACTIVADO'}
    MODO RÁPIDO: ${quickMode ? 'ACTIVADO (Sé extremadamente breve, solo 3 líneas de razonamiento)' : 'DESACTIVADO'}
    
    INSTRUCCIONES CLAVE:
    - Evita imprimir direcciones hexadecimales enteras en texto plano (trucalo como 0x...123) para no estropear el texto-a-voz posterior.
    - RESPONDER ESTRICTAMENTE EN FORMATO JSON, con la siguiente estructura exacta:
    {
      "recommendation": "SAFE" | "WAIT" | "CAUTION",
      "score": <number 0-100>,
      "reasoning": "Tu análisis sucinto y con muchísima personalidad en español degen...",
      "keyFactors": ["factor 1", "factor 2", "factor 3"],
      "catchphrase": "Tu frase meme destructiva",
      "audit": {
         "isHoneypot": <boolean>,
         "isAuditPassed": <boolean>,
         "isFreezable": <boolean>,
         "isMintable": <boolean>,
         "buyTax": "<string, ej: 5%>",
         "sellTax": "<string, ej: 10%>",
         "lpLocked": <boolean>,
         "renounced": <boolean>,
         "top10HoldersPercent": "<string>",
         "creatorClean": <boolean>
      }
    }
  `;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isJson: true,
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        systemInstruction: "Eres WhaleBrain AI, el analista on-chain de criptomonedas más picante de Telegram. Responde ÚNICAMENTE con el formato JSON crudo sin comillas invertidas ni markdown."
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    const data = await res.json();
    return JSON.parse(data.text || "{}") as AnalysisResult;
  } catch (e) {
    console.error("Error parsing AI response:", e);
    return {
      recommendation: 'CAUTION',
      score: 50,
      reasoning: `No se pudo procesar el análisis en la red GPT. Error real: ${e instanceof Error ? e.message : String(e)}`,
      keyFactors: ["Error de inteligencia fallida", "Falla técnica de Proxy"],
      catchphrase: "¡Rayos! Mi cerebro se durmió en alta mar."
    };
  }
}

export async function chatWithWhale(
  history: ChatMessage[],
  coinContext?: CoinData,
  degenMode: boolean = false,
  quickMode: boolean = false,
  contextType: string = 'tokens',
  rataMode: boolean = false
): Promise<string> {

  const isAntiRobo = history.some(msg => msg.text.includes("ESCÁNER ANTI-ROBO"));

  let typeRule = 'Este es un TOKEN/MONEDA. IDENTIFICA EL TOKEN Y CLASIFICALO. Evalúa riesgos.';
  if (contextType === 'contracts') {
    typeRule = 'Este es un CONTRATO INTELIGENTE. Enfócate en detalles técnicos o sugiere investigar: funciones ocultas, honeypots, etc.';
  } else if (contextType === 'wallets') {
    typeRule = 'Esta es una BILLETERA PÚBLICA. A partir de ahora eres un Perro Guardián de Ciberseguridad Forense. Tu objetivo principal no es solo su trading, sino detectar VULNERABILIDADES.';
  } else if (contextType === 'airdrops') {
    typeRule = 'EL USUARIO INGRESÓ SU BILLETERA PARA AIRDROPS. Eres el experto en Misiones testnet y airdrops.';
  }

  if (isAntiRobo) typeRule = 'ALERTA MAXIMA: Escáner ANTI-ROBO activo. Audita si es estafa y protege al usuario fuertemente.';

  const getPersonality = () => {
    if (rataMode) return 'RATA ACTIVADO (Súper lauchero y roedor. Sugerí estrategias gratis sin comisiones).';
    if (quickMode) return 'RÁPIDO ACTIVADO (Responde SOLO en 1 o 2 oraciones).';
    if (degenMode) return 'DEGEN ACTIVADO (Agresivo, alto riesgo, lenguaje de casino).';
    return 'NORMAL (Personalidad experta, sabia y astuta).';
  };

  const systemInstruction = `Eres WhaleBrain AI, un asistente degen cripto de élite.
  REGLAS:
  1. NO ABRAS HASHES. Evita imprimir más de 8 caracteres hexadecimales de corrido para no arruinar la voz (abrévialos 0x1B..C8).
  2. COMPORTAMIENTO: ESTÁS EN UN CHAT. NUNCA repitas el análisis inicial. Mantenlo conversacional. No devuelvas bloques de json.
  3. ÁREA ACTUAL: ${typeRule}
  4. MODO: ${getPersonality()}
  5. CONTEXTO DE MERCADO FIJO (No alucines esto): 
  ${coinContext ? `Precio: $${coinContext.market_data?.current_price?.usd || 'No disp.'}. Cambio 24h: ${coinContext.market_data?.price_change_percentage_24h || 0}%` : 'No hay datos de moneda cargados en el visor secundario en este instante.'}`;

  try {
    const formattedMessages = history.map(msg => {
      if (msg.image && msg.role === 'user') {
        return {
          role: 'user',
          content: [
            { type: "text", text: msg.text },
            { type: "image_url", image_url: { url: msg.image } }
          ]
        };
      }
      return {
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      };
    });

    if (formattedMessages.length === 0) {
      formattedMessages.push({ role: "user", content: "Hola loco." });
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isJson: false,
        model: "gpt-4o-mini",
        messages: formattedMessages,
        systemInstruction
      })
    });

    if (!res.ok) throw new Error("Fallo proxy chat");
    const data = await res.json();
    return data.text || "El océano está oscuro y silencioso.";
  } catch (e) {
    console.error("Error chatting with AI:", e);
    return "Uy loco, se me trabó el análisis de datos. Intentalo de nuevo.";
  }
}

export async function summarizeForAudio(text: string): Promise<string> {
  const prompt = `Sos una ballena inteligente y degen. Resumí el siguiente análisis técnico del mercado en MAXIMO 140 caracteres. Usá tono sarcástico o agresivo. Evitá usar direcciones crypto (ej. 0xA) o tecnicismos largos para que suene bien cuando sea pronunciado por una IA de voz. Texto: ${text} `;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isJson: false,
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) throw new Error("Proxy error");
    const data = await res.json();
    return data.text || "Silencio de radio.";
  } catch (e) {
    console.error("Error summarizeForAudio:", e);
    return "La red está caída gordo, leé la pantalla.";
  }
}
