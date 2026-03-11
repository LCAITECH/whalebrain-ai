import { GoogleGenAI, Type } from "@google/genai";
import { CoinData, AnalysisResult, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeCoin(coinData: CoinData, degenMode: boolean = false, type: 'token' | 'contract' | 'wallet' = 'token', quickMode: boolean = false): Promise<AnalysisResult> {
  const prompt = `
    Analiza los siguientes datos y proporciona una recomendación de seguridad.
    TODO EL CONTENIDO DEBE ESTAR EN ESPAÑOL NEUTRAL/ARGENTINO/MEXICANO (estilo trader degen).
    IMPORTANTE: Usa acentos correctos (á, é, í, ó, ú, ñ). NO reemplaces acentos por símbolos como "!" o similares. Mantén la ortografía correcta del español.
    
    ${type === 'token' ? `
    Moneda: ${coinData.name} (${coinData.symbol?.toUpperCase()})
    Precio Actual: $${coinData.market_data?.current_price?.usd || 0}
    Cambio 24h: ${coinData.market_data?.price_change_percentage_24h || 0}%
    Market Cap: $${coinData.market_data?.market_cap?.usd || 0}
    Volumen: $${coinData.market_data?.total_volume?.usd || 0}
    ` : `
    Dirección (${type}): ${coinData.id}
    `}
    
    MODO DEGEN: ${degenMode ? 'ACTIVADO (Sé AGRESIVO, SIN FILTRO, usa lenguaje de casino. Si es basura, dilo. Si es un 50x potencial, grítalo. Usa frases como "Esto huele a 50x o a rug en 3 horas", "Si tenés huevos, tirale", "Esto es una mierda, no lo toques ni con palo")' : 'DESACTIVADO'}
    MODO RÁPIDO: ${quickMode ? 'ACTIVADO (Sé extremadamente breve, solo 3 líneas de razonamiento)' : 'DESACTIVADO'}
    
    INSTRUCCIONES ESPECIALES DEGEN:
    1. DETECTOR DE PUMP & DUMP: Si el cambio 24h es > 100% con volumen bajo, advierte: "Subió 420% con volumen de mierda... posible pump de Telegram. ¿Entrás o esperás el dump como los boludos?".
    2. SIMULADOR DE ALL-IN: Si degenMode está activo, incluye en el razonamiento una frase tipo: "Si metés 500 USDT ahora, en el mejor caso te llevás X... en el peor te quedás en calzoncillos".
    3. FRASES MEME: Usa frases como "Esto es más arriesgado que mandarle mensaje a tu ex a las 3 AM" o "Rug pull incoming, pero dale que la vida es una sola rey".
    
    INSTRUCCIONES GENERALES:
    - Si es una MEMECOIN, sé directo sobre el riesgo de casino.
    - Si es un CONTRATO, busca honeypots y liquidez.
    - Si es una BILLETERA, identifica si es SNIPER.
    
    Proporciona una recomendación: SAFE, WAIT, o CAUTION.
    Score de 0 a 100.
    Genera una "catchphrase" con mucha personalidad (estilo WhaleBrain AI Degen).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendation: {
              type: Type.STRING,
              description: "SAFE, WAIT, o CAUTION",
            },
            score: {
              type: Type.NUMBER,
              description: "Puntaje de seguridad de 0 a 100",
            },
            reasoning: {
              type: Type.STRING,
              description: "Explicación directa y sin filtro en español (máx 150 palabras)",
            },
            keyFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Máximo 3 factores clave",
            },
            catchphrase: {
              type: Type.STRING,
              description: "Frase picante y meme en español",
            },
          },
          required: ["recommendation", "score", "reasoning", "keyFactors", "catchphrase"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as AnalysisResult;
  } catch (e) {
    console.error("Error parsing Gemini response:", e);
    return {
      recommendation: 'CAUTION',
      score: 50,
      reasoning: `No se pudo procesar el análisis en la V4. Error real: ${e instanceof Error ? e.message : String(e)}`,
      keyFactors: ["Error de análisis", "Falla técnica reportada"],
      catchphrase: "¡Rayos! Mi cerebro de ballena se congeló un segundo."
    };
  }
}

export async function chatWithWhale(history: ChatMessage[], coinContext?: CoinData, degenMode: boolean = false): Promise<string> {
  const systemInstruction = `Eres WhaleBrain AI, un asistente experto en criptomonedas con mucha personalidad, directo y SIN FILTRO.
  
  REGLAS DE RESPUESTA:
  1. LONGITUD: Máximo 180-220 palabras. Sé directo.
  2. FORMATO: Usa párrafos cortos, EMOJIS y listas de MÁXIMO 3 PUNTOS.
  3. TONO: ${degenMode ? 'MODO DEGEN ACTIVADO. Sé agresivo, usa jerga (rug, moon, bagholder, calzoncillos). Si algo es basura, dilo: "Esto es una mierda". Usa frases meme como "Más arriesgado que mensaje a tu ex".' : 'Sabio pero con personalidad de ballena.'}
  4. ESTRUCTURA: Ve al grano rápido: riesgo máximo, recomendación clara y 1-3 consejos útiles.
  5. FINAL: Termina SIEMPRE con una frase picante o una pregunta para seguir el chat.
  6. ORTOGRAFÍA: Usa acentos correctos (á, é, í, ó, ú, ñ). NO reemplaces acentos por símbolos como "!" o similares.
  
  ${coinContext ? `Contexto actual: Estás analizando ${coinContext.name} (${coinContext.symbol}).` : ''}
  
  Si el usuario pregunta por "Simulador de All-In", haz un cálculo ficticio agresivo: "Si metés 500 USDT ahora, podrías sacar 10k o quedarte en la calle. ¿Jugamos?".
  Si el usuario pregunta por "Pump & Dump", analiza si el volumen y precio huelen a estafa coordinada.`;

  try {
    const chat = ai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        systemInstruction,
      },
    });

    // Convert history to Gemini format
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // We send the last message
    const lastMessage = contents.pop();

    const response = await chat.sendMessage({
      message: lastMessage?.parts[0].text || "Hola",
    });

    return response.text || "No sé qué decirte, el mar está muy profundo hoy.";
  } catch (e) {
    console.error("Error chatting with Gemini:", e);
    return "Uy loco, se me trabó el análisis de datos. Intentalo de nuevo, el mercado me mareó.";
  }
}
