export function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const apiKey = process.env.COINGECKO_API_KEY;

    if (!query) {
        return new Response(JSON.stringify({ error: "query parameter is missing" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const url = `https://api.coingecko.com/api/v3/search?query=${query}`;

    return fetch(url, {
        headers: apiKey ? { "x-cg-demo-api-key": apiKey } : {},
    })
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to search coins");
            }
            return res.json();
        })
        .then(data => new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }))
        .catch(error => {
            console.error("Error searching coins:", error);
            return new Response(JSON.stringify({ error: "Internal server error" }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        });
}
