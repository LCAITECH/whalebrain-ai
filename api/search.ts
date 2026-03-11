export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const isDegen = searchParams.get('degen') === 'true';

    if (!query) {
        return new Response(JSON.stringify({ error: "query parameter is missing" }), { status: 400 });
    }

    try {
        if (isDegen) {
            // MODO DEGEN: Escáner de Contratos y Memecoins en DexScreener
            const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error("Failed to search coins on DexScreener");
            const data = await res.json();
            const pairs = data.pairs || [];

            const uniqueTokens: any[] = [];
            const seenAddresses = new Set();

            for (const pair of pairs) {
                if (!pair.liquidity || pair.liquidity.usd < 100) continue;
                const address = pair.baseToken.address;
                if (!seenAddresses.has(address)) {
                    seenAddresses.add(address);
                    uniqueTokens.push({
                        id: address,
                        name: `${pair.baseToken.name} (${pair.chainId?.toUpperCase() || 'DEX'})`,
                        api_symbol: pair.baseToken.symbol,
                        symbol: pair.baseToken.symbol,
                        sort_value: pair.fdv || pair.liquidity.usd || 0,
                        thumb: pair.info?.imageUrl || "https://assets.coingecko.com/coins/images/279/standard/ethereum.png",
                        large: pair.info?.imageUrl || "https://assets.coingecko.com/coins/images/279/standard/ethereum.png",
                    });
                }
            }
            uniqueTokens.sort((a, b) => b.sort_value - a.sort_value);
            const formattedTokens = uniqueTokens.slice(0, 15).map((t, i) => ({
                id: t.id,
                name: t.name,
                api_symbol: t.api_symbol,
                symbol: t.symbol,
                market_cap_rank: i + 1,
                thumb: t.thumb,
                large: t.large
            }));
            return new Response(JSON.stringify({ coins: formattedTokens }), { status: 200, headers: { 'Content-Type': 'application/json' } });

        } else {
            // MODO NORMAL (SAFE): CoinGecko Native Search (Precios top-100 reales, soluciona bug de INJ)
            const cgRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, {
                headers: {
                    'Accept': 'application/json',
                    ...(process.env.COINGECKO_API_KEY && { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY })
                }
            });
            if (!cgRes.ok) throw new Error('CoinGecko API Error');
            const data = await cgRes.json();

            const results = (data.coins || []).slice(0, 15).map((coin: any) => ({
                id: coin.id,
                name: coin.name,
                api_symbol: coin.symbol,
                symbol: coin.symbol,
                thumb: coin.thumb || 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png',
                large: coin.large || 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png',
                market_cap_rank: coin.market_cap_rank || 9999
            }));

            return new Response(JSON.stringify({ coins: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
    } catch (error) {
        console.error("Error searching coins:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
