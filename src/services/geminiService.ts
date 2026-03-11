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
    - Si es un CONTRATO, busca honeypots y liquidez. NUNCA escribas el contrato completo en tu respuesta, abrevíalo SIEMPRE a formato corto (ej: 0x12...3456) para que el lector de voz (TTS) no lo deletree y arruine el audio.
    - Si es una BILLETERA, identifica si es SNIPER. Abrevia SIEMPRE la dirección.
    
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

export async function chatWithWhale(
  history: ChatMessage[],
  coinContext?: CoinData,
  degenMode: boolean = false,
  quickMode: boolean = false,
  contextType: string = 'tokens'
): Promise<string> {

  let typeRule = 'Este es un TOKEN/MONEDA. Si el usuario pide más análisis, ofrécele sugerir mirar los "Holders", la "Liquidez" o las "Comisiones de red" que requieren revisar a fondo su contrato.';
  if (contextType === 'contracts') {
    typeRule = 'Este es un CONTRATO INTELIGENTE. Enfócate en detalles técnicos o sugiere investigar: funciones ocultas, honeypots, código de proxy, o dueños del contrato.';
  } else if (contextType === 'wallets') {
    typeRule = 'Esta es una BILLETERA (Wallet). Tu objetivo sugerido es clasificar su perfil de actividad: ¿Es una Gran Ballena (Whale), un francotirador (Sniper), un usuario ordinario, o un Scammer/Fantasma? Basate en su historial o sugierelo.';
  }

  const systemInstruction = `Eres WhaleBrain AI, un asistente experto en criptomonedas con mucha personalidad, directo y SIN FILTRO.
  
  REGLAS DE RESPUESTA:
  1. COMPORTAMIENTO CHAT: ESTÁS EN UN CHAT CONVERSACIONAL. NUNCA repitas el análisis inicial. Responde SOLO a la nueva pregunta y mantén el hilo de la charla.
  2. PROACTIVIDAD: La charla no muere acá. Al final de tu respuesta, HAZLE UNA PREGUNTA AL USUARIO o sugiriendo indagar en otro parámetro clave para mantener la conversación viva.
  3. ÁREA DE INVESTIGACIÓN ACTUAL: ${typeRule}
  4. MODO DE PERSONALIDAD: ${quickMode ? 'RÁPIDO ACTIVADO (Responde SOLO en 1 o 2 oraciones, extremadamente cortante y rápido).' : (degenMode ? 'DEGEN ACTIVADO (Lenguaje de casino agresivo, jerga cripto: rug, moon, holdear, scam. Tratálos de "degenerados" o "boludos" con cariño).' : 'NORMAL (Personalidad experta, sabia y astuta de la Ballena oceánica).')}
  5. DIRECCIONES: NUNCA escribas una dirección o ID completo. Trúncalo SIEMPRE a 0x1A..2B para cuidar el motor de voz TTS.
  6. ORTOGRAFÍA: Usa acentos correctos (á, é, í, ó, ú, ñ).
  
  ${coinContext ? `Contexto actual en pantalla: Estás analizando ${coinContext.name} (${coinContext.symbol || coinContext.id}).` : ''}
  
  Si el usuario pregunta por "Simulador de All-In" y estás en Degen, haz un cálculo ficticio sarcástico.`;

  try {
    const chat = ai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        systemInstruction,
      },
    });

    // Convert history to Gemini format
    const contents = history.map(msg => {
      const parts: any[] = [{ text: msg.text }];
      if (msg.image) {
        const [meta, data] = msg.image.split(',');
        const mimeType = meta.split(':')[1].split(';')[0];
        parts.push({
          inlineData: { data, mimeType }
        });
      }
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts
      };
    });

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
