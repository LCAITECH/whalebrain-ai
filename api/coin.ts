export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const isDegen = searchParams.get('degen') === 'true';

    if (!id) {
        return new Response(JSON.stringify({ error: "id parameter is missing" }), { status: 400 });
    }

    const isContractAddress = id.startsWith('0x');

    try {
        if (isDegen || isContractAddress) {
            // MODO DEGEN o DIRECCIÓN DE CONTRATO (Obligatorio DexScreener)
            const url = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(id)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch data from DexScreener");
            const data = await res.json();

            if (!data.pairs || data.pairs.length === 0) {
                return new Response(JSON.stringify({ error: "Token no encontrado en DEXs" }), { status: 404 });
            }

            // Agarrar el pool con más liquidez legítimo
            data.pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
            const bestPair = data.pairs[0];

            const coinData = {
                id: bestPair.baseToken.address,
                symbol: bestPair.baseToken.symbol,
                name: bestPair.baseToken.name,
                image: {
                    large: bestPair.info?.imageUrl || "https://assets.coingecko.com/coins/images/279/standard/ethereum.png",
                    small: bestPair.info?.imageUrl || "",
                    thumb: bestPair.info?.imageUrl || ""
                },
                market_data: {
                    current_price: { usd: Number(bestPair.priceUsd) || 0 },
                    market_cap: { usd: bestPair.marketCap || bestPair.fdv || 0 },
                    total_volume: { usd: bestPair.volume?.h24 || 0 },
                    price_change_percentage_24h: bestPair.priceChange?.h24 || 0,
                    price_change_percentage_7d: 0,
                    price_change_percentage_30d: 0,
                    ath: { usd: 0 },
                    atl: { usd: 0 },
                    circulating_supply: 0,
                    total_supply: 0,
                    sparkline_7d: { price: [] }
                }
            };
            return new Response(JSON.stringify(coinData), { status: 200, headers: { 'Content-Type': 'application/json' } });

        } else {
            // MODO NORMAL (Safe CoinGecko ID como 'injective', 'bitcoin')
            const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
            const headerObj = {
                'Accept': 'application/json',
                ...(process.env.COINGECKO_API_KEY && { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY })
            };
            const cgRes = await fetch(url, { headers: headerObj });
            if (!cgRes.ok) throw new Error('CoinGecko API Error on Coin fetch');
            const data = await cgRes.json();
            return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
    } catch (error) {
        console.error("Error fetching coin data:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
