export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return new Response(JSON.stringify({ error: "id parameter is missing" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const url = `https://api.dexscreener.com/latest/dex/tokens/${id}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch data from DexScreener");
        const data = await res.json();

        if (!data.pairs || data.pairs.length === 0) {
            return new Response(JSON.stringify({ error: "Token no encontrado en DEXs" }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Ordenamos los pares por liquidez para agarrar el pool principal
        data.pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
        const bestPair = data.pairs[0];

        // Mapeamos al formato estricto que espera el Frontend y Gemini
        const coinData = {
            id: bestPair.baseToken.address,
            symbol: bestPair.baseToken.symbol,
            name: bestPair.baseToken.name,
            image: {
                large: bestPair.info?.imageUrl || "https://dd.dexscreener.com/ds-data/tokens/default.png",
                small: bestPair.info?.imageUrl || "",
                thumb: bestPair.info?.imageUrl || ""
            },
            market_data: {
                current_price: { usd: Number(bestPair.priceUsd) || 0 },
                market_cap: { usd: bestPair.marketCap || bestPair.fdv || 0 },
                total_volume: { usd: bestPair.volume?.h24 || 0 },
                price_change_percentage_24h: bestPair.priceChange?.h24 || 0,
                // Relleno para satisfacer la interfaz frontend
                price_change_percentage_7d: 0,
                price_change_percentage_30d: 0,
                ath: { usd: 0 },
                atl: { usd: 0 },
                circulating_supply: 0,
                total_supply: 0,
                sparkline_7d: { price: [] }
            }
        };

        return new Response(JSON.stringify(coinData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error fetching coin data:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
