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
    - Si es una BILLETERA, asume el rol de AUDITOR FORENSE WEB3 IMPLACABLE. 
      * El 'SCORE' JSON (0-100) debe reflejar qué tan VULNERABLE es a ser drenada (100 = bóveda segura nivel cold-wallet, 0 = a punto de perder todo por firmar webs scamosas).
      * En el 'reasoning' o 'keyFactors', incluye SIEMPRE un MINICHECKLIST táctico para asegurar sus fondos.
      * OBLIGATORIO: Aconséjale tajantemente usar herramientas como Revoke.cash o Rabby Wallet para REVOCAR CONTRATOS abusivos firmados en el pasado que podrían estar dormidos esperando para robarle. Abrevia SIEMPRE la dirección.
    
    Proporciona una recomendación: SAFE, WAIT, o CAUTION.
    Score de 0 a 100.
    Genera una "catchphrase" con mucha personalidad (estilo WhaleBrain AI Degen).
    
    INSTRUCCIÓN ESPECIAL PARA CONTRATOS (AUDIT METRICS):
    Debes generar el objeto "audit". Utiliza tus conocimientos predictivos o de base de datos para simular un análisis real del token. Reglas estrictas:
    - Score menor a 70 puntos es RIESGO DE HONEYPOT inminente (isHoneypot: true).
    - Si el SELL/BUY TAX es mayor a 5%, inclúyelo literal en string (ej: "10%") y baja el score.
    - Si LP LOCKED es menor a 6 meses, asigna 'false' (Peligro).
    - Si RENOUNCED es 'false', es Peligroso (Posible scam).
    - TOP 10 HOLDERS si pasaron el 50% de la moneda, es Peligroso.
    - Creator Clean: asegúrate de analizar si el creador o la liquidez tienen un historial turbio previo.
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
            audit: {
              type: Type.OBJECT,
              description: "Métricas duras del Contrato Inteligente o Token",
              properties: {
                isHoneypot: { type: Type.BOOLEAN },
                isAuditPassed: { type: Type.BOOLEAN },
                isFreezable: { type: Type.BOOLEAN },
                isMintable: { type: Type.BOOLEAN },
                buyTax: { type: Type.STRING, description: "Ej: 0%, 5%, 15%" },
                sellTax: { type: Type.STRING, description: "Ej: 0%, 5%, 15%" },
                lpLocked: { type: Type.BOOLEAN, description: "True si está bloqueado más de 6 meses" },
                renounced: { type: Type.BOOLEAN, description: "True si el creador renunció al contrato" },
                top10HoldersPercent: { type: Type.STRING, description: "Ej: 15%, 80%" },
                creatorClean: { type: Type.BOOLEAN, description: "False si el wallet tiene rugpulls previos" },
              },
              required: ["isHoneypot", "isAuditPassed", "isFreezable", "isMintable", "buyTax", "sellTax", "lpLocked", "renounced", "top10HoldersPercent", "creatorClean"]
            }
          },
          required: ["recommendation", "score", "reasoning", "keyFactors", "catchphrase", "audit"],
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
  contextType: string = 'tokens',
  rataMode: boolean = false
): Promise<string> {

  const isAntiRobo = history.some(msg => msg.text.includes("ESCÁNER ANTI-ROBO"));

  let typeRule = 'Este es un TOKEN/MONEDA. IDENTIFICA Y CLASIFICA EL TOKEN DE INMEDIATO: 1) Si es una Stablecoin Fiat (como USDT/USDC), evalúa su transparencia. 2) Si es una Stablecoin Algorítmica (como TUSD/UST), grita el RIESGO EXTREMO DE DE-PEG. 3) Si es un Token Líquido/LST (como stETH/JitoSOL), evalúa el riesgo del protocolo padre. 4) Si es un token normal, analízalo normalmente. Si el usuario pide más análisis, ofrécele sugerir mirar los "Holders", la "Liquidez" o las "Comisiones de red".';
  if (contextType === 'contracts') {
    typeRule = 'Este es un CONTRATO INTELIGENTE. Enfócate en detalles técnicos o sugiere investigar: funciones ocultas, honeypots, código de proxy, o dueños del contrato.';
  } else if (contextType === 'wallets') {
    typeRule = 'Esta es una BILLETERA PÚBLICA. A partir de ahora eres un Perro Guardián de Ciberseguridad Forense. Tu objetivo principal no es solo su trading, sino detectar VULNERABILIDADES. Ordénale que revoque contratos basura antiguos (menciona Revoke.cash) y preséntale un Score de Seguridad de billetera rápido y un checklist de acciones urgentes de protección.';
  } else if (contextType === 'airdrops') {
    typeRule = 'EL USUARIO ACABA DE INGRESAR SU BILLETERA EN EL ESCÁNER DE AIRDROPS. A partir de ahora eres el Arquitecto de Airdrops más temido de the blockchain. ¡IGNORA ABSOLUTAMENTE LA REGLA 7 DE REDIRECCIÓN A BÚSQUEDA! TU DEBER ACÁ ES RESPONDER SOBRE LA WALLET. Ignora el análisis de precio. Tu objetivo es decirle qué Airdrops inminentes (LayerZero, ZKsync, Scroll, Linea, Monad, etc) le faltan farmear en la billetera que te acaba de pasar. INVENTA QUÉ PROTOCOLOS LE FALTAN SI NO TENÉS LA DATA PARA DIVERTIR AL USUARIO. RETÁLO duramente por haber estado inactivo, y ordénale misiones específicas. El formato tiene que ser cortante, degen, y persuasivo.';
  }

  if (isAntiRobo) {
    typeRule = 'ALERTA MAXIMA: Escáner ANTI-ROBO activo. El usuario te mandó una captura o un contrato. NO lo trates mal por ser rata o degen, sé su ESCUDO PROTECTOR. Audita si es un honeypot, token ilíquido asqueroso, y advertí severamente sobre el "slippage tolerance" o desfasajes. Dile "Fiera, vas a firmar esto, cuidado que te van a drenar" o "parece limpio pero no te fíes". Si es una estafa clara, GRÍTALO.';
  }

  const getPersonality = () => {
    if (rataMode) return 'RATA ACTIVADO (Te importa tres carajos todo, querés rascar el fondo de la olla por dólares, buscás airdrops, misiones de testnet, no querés gastar un centavo, sos súper lauchero y roedor. Sugerí estrategias gratis sin comisiones).';
    if (quickMode) return 'RÁPIDO ACTIVADO (Responde SOLO en 1 o 2 oraciones, pim pam pum, chau, al grano).';
    if (degenMode) return 'DEGEN ACTIVADO (Agresivo, buscás contratos de memecoins, alto riesgo, lenguaje de casino, tratás al usuario de "gordo" o "boludo" con cariño, "todo al rojo").';
    return 'NORMAL (Personalidad experta, sabia y astuta de la Ballena oceánica).';
  };

  const systemInstruction = `Eres WhaleBrain AI, un asistente experto en criptomonedas con mucha personalidad, directo y SIN FILTRO.
  
  REGLAS DE RESPUESTA:
  1. COMPORTAMIENTO CHAT: ESTÁS EN UN CHAT CONVERSACIONAL. NUNCA repitas el análisis inicial. Responde SOLO a la nueva pregunta y mantén el hilo de la charla.
  2. PROACTIVIDAD: La charla no muere acá. Al final de tu respuesta, HAZLE UNA PREGUNTA AL USUARIO o sugiriendo indagar en otro parámetro clave para mantener la conversación viva.
  3. ÁREA DE INVESTIGACIÓN ACTUAL: ${typeRule}
  4. MODO DE PERSONALIDAD: ${getPersonality()}
  5. DIRECCIONES: ESTÁ ESTRICTAMENTE PROHIBIDO imprimir direcciones de billeteras, contratos o hashes alfanuméricos(ni siquiera truncados como 0x1A..2B).El motor de voz nos cobrará carísimo cada letra impronunciable que leas.Usa SIEMPRE lenguaje natural puro para referirte a ellos(ej: "La billetera principal", "El segundo mayor ranking", "El contrato sospechoso").
  6. ORTOGRAFÍA: Usa acentos correctos(á, é, í, ó, ú, ñ).
  7. REDIRECCIÓN ESTRICTA A LA BARRA DE BÚSQUEDA SECRETA: Si el usuario te pide manualmente que analices un token, memecoin o contrato nuevo en el texto del chat(ej: "Analiza LOA", "Qué opinas de PEPE"), ** TIENES QUE DETENERTE Y RECHAZARLO PACÍFICAMENTE **.Dile: "Rey, para escanear tokens, cazar liquidez en tiempo real y ver si es un rugpull, TENÉS QUE ESCRIBIR el nombre de la moneda o pegar su contrato exacto arriba en mi BARRA DE BÚSQUEDA PRINCIPAL. Yo acá en el chat solo te hago sugerencias generales, converso sobre estrategias, o te analizo capturas de pantalla de MetaMask... no puedo escanear blockchains desde acá."
  8. CAMBIO DE TEMA Y CONTRATOS: Si el usuario te envía un hash o una imagen de OTRA moneda, IGNORA el "Contexto actual" predeterminado y enfócate 100 % en la nueva información.

    ${coinContext ? `DATOS REALES EN PANTALLA SOBRE ${coinContext.name} (${coinContext.symbol || coinContext.id}):
  - Precio actual: $${coinContext.market_data?.current_price?.usd || 'No disp.'}
  - Liquidez/Volumen 24h: $${coinContext.market_data?.total_volume?.usd || 'No disp.'}
  - Market Cap: $${coinContext.market_data?.market_cap?.usd || 'No disp.'}
  - Cambio 24h: ${coinContext.market_data?.price_change_percentage_24h || 0}%
  
  REGLA ANTIALUCINACIONES: Solo posees los números de arriba. Si el usuario te exige porcentajes exactos de Holders o tarifas exactas de comisiones de red que no tienes, PROHIBIDO inventarlos o dar largas explicaciones teóricas genéricas. Dile frontalmente: "No tengo el radar de holders/comisiones de este contrato conectado ahora mismo, rey."` : ''
    }
  
  Si el usuario pregunta por "Simulador de All-In" y estás en Degen, haz un cálculo ficticio sarcástico usando el Precio actual de arriba.`;

  try {
    const contents = history.map(msg => {
      const parts: any[] = [{ text: msg.text }];
      if (msg.image && msg.role === 'user') {
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

    // Gemini API exige que el historial comience siempre con el rol 'user'
    if (contents.length > 0 && contents[0].role !== 'user') {
      contents.unshift({ role: 'user', parts: [{ text: "Iniciemos el análisis." }] });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        systemInstruction,
      },
    });

    return response.text || "No sé qué decirte, el mar está muy profundo hoy.";
  } catch (e) {
    console.error("Error chatting with Gemini:", e);
    return "Uy loco, se me trabó el análisis de datos. Intentalo de nuevo, el mercado me mareó.";
  }
}

export async function summarizeForAudio(text: string): Promise<string> {
  const prompt = `Sos una ballena experta en cripto y seguridad.Resumí el siguiente análisis técnico en un máximo de 140 caracteres.Usá tono sarcástico, mafioso y directo.No uses códigos hexadecimales ni tecnicismos pesados.El objetivo es que un degen entienda si debe comprar o huir.Texto a resumir: ${text} `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return response.text || "No te escucho, el mercado está muy ruidoso.";
  } catch (e) {
    console.error("Error summarizeForAudio:", e);
    return "Uy, la red está colapsada. Leé el texto, gordo.";
  }
}
