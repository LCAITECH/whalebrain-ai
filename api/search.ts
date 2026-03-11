export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (!query) {
        return new Response(JSON.stringify({ error: "query parameter is missing" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const url = `https://api.dexscreener.com/latest/dex/search?q=${query}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to search coins on DexScreener");
        const data = await res.json();
        const pairs = data.pairs || [];

        // DexScreener puede devolver el mismo token en varios pares (distintos DEX o Pools)
        // Agrupamos por baseToken.address para no repetir la moneda visualmente
        const uniqueTokens = [];
        const seenAddresses = new Set();

        for (const pair of pairs) {
            // Ignorar basura sin liquidity
            if (!pair.liquidity || pair.liquidity.usd < 100) continue;

            const address = pair.baseToken.address;
            if (!seenAddresses.has(address)) {
                seenAddresses.add(address);
                uniqueTokens.push({
                    id: address,
                    name: pair.baseToken.name,
                    api_symbol: pair.baseToken.symbol,
                    symbol: pair.baseToken.symbol,
                    market_cap_rank: pair.fdv || pair.liquidity.usd || 0, // Usamos FDV para ordernar luego
                    thumb: pair.info?.imageUrl || "https://dd.dexscreener.com/ds-data/tokens/default.png",
                    large: pair.info?.imageUrl || "https://dd.dexscreener.com/ds-data/tokens/default.png",
                });
            }
        }

        // Ordenar los resultados por FDV o Liquidez (los más grandes primero)
        uniqueTokens.sort((a, b) => b.market_cap_rank - a.market_cap_rank);

        return new Response(JSON.stringify({ coins: uniqueTokens.slice(0, 15) }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error("Error searching coins:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
