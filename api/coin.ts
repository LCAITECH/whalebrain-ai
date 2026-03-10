export function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const apiKey = process.env.COINGECKO_API_KEY;

    if (!id) {
        return new Response(JSON.stringify({ error: "id parameter is missing" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`;

    return fetch(url, {
        headers: apiKey ? { "x-cg-demo-api-key": apiKey } : {},
    })
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to fetch data from CoinGecko");
            }
            return res.json();
        })
        .then(data => new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }))
        .catch(error => {
            console.error("Error fetching coin data:", error);
            return new Response(JSON.stringify({ error: "Internal server error" }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        });
}
