// Cache simple en memoria para no spamear la API pública
let unlocksCache: { data: any, timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora de caché

export async function GET(req: Request) {
    try {
        // Sirve de caché si está fresca
        if (unlocksCache && Date.now() - unlocksCache.timestamp < CACHE_DURATION) {
            return new Response(JSON.stringify(unlocksCache.data), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // Tokenomist API no tiene versión gratutita pública fácil, Dropstab y otros requieren keys.
        // Simularemos los de impacto (siendo en producción reemplazable por la API Pro si el user adquiere la key)
        // Alternativamente usar un scraping de CryptoRank o similar de forma interna
        
        // Devolvemos datos "Mock" super realistas de Unlocks inminentes para el Degen
        // Esta estructura simula la respuesta estándar que se consumiría de Tokenomist / DefiLlama Pro
        const mockUnlocks = [
            {
                id: "arbitrum",
                name: "Arbitrum",
                symbol: "ARB",
                date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // En 3 días
                amount_unlocked: 92650000,
                price_impact_risk: "Alto",
                description: "Gran desbloqueo de tokens para el equipo y los inversores iniciales. Presión de venta severa inminente.",
                thumb: "https://assets.coingecko.com/coins/images/16547/thumb/photo_2023-03-29_21.47.00.jpeg"
            },
            {
                id: "optimism",
                name: "Optimism",
                symbol: "OP",
                date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // En 7 días
                amount_unlocked: 31340000,
                price_impact_risk: "Medio",
                description: "Desbloqueo lineal mensual de Core Contributors.",
                thumb: "https://assets.coingecko.com/coins/images/25244/thumb/Optimism.png"
            },
            {
                id: "starknet",
                name: "Starknet",
                symbol: "STRK",
                date: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(), // En 12 hs
                amount_unlocked: 64000000,
                price_impact_risk: "Extremo",
                description: "¡Atención Degen! Desbloqueo masivo en pocas horas correspondientes a Early Contributors.",
                thumb: "https://assets.coingecko.com/coins/images/28087/thumb/starknet_logo.png"
            },
            {
                id: "dydx",
                name: "dYdX",
                symbol: "DYDX",
                date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(),
                amount_unlocked: 1250000,
                price_impact_risk: "Bajo",
                description: "Desbloqueo de Liquidity Providers ordinario.",
                thumb: "https://assets.coingecko.com/coins/images/17500/thumb/dydx.png"
            },
            {
                id: "aptos",
                name: "Aptos",
                symbol: "APT",
                date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
                amount_unlocked: 11310000,
                price_impact_risk: "Alto",
                description: "Desbloqueo de Fundación y Core Contributors. Estar atentos a short squeeze.",
                thumb: "https://assets.coingecko.com/coins/images/26455/thumb/aptos_round.png"
            }
        ];

        const responseData = { unlocks: mockUnlocks };
        
        // Guardar en caché
        unlocksCache = {
            data: responseData,
            timestamp: Date.now()
        };

        return new Response(JSON.stringify(responseData), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error("Error fetching token unlocks:", error);
        return new Response(JSON.stringify({ error: "Internal server error reading Unlocks" }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}
