export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    // Usamos la API de CryptoCompare que es publica y gratuita para noticias top
    const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
    if (!response.ok) {
      throw new Error('News API response was not OK');
    }
    const data = await response.json();
    
    // Obtenemos las ultimas 5 noticias
    const topNews = data.Data?.slice(0, 5).map((article: any) => ({
      title: article.title,
      body: article.body,
      source: article.source_info?.name || 'Crypto News'
    })) || [];

    return new Response(JSON.stringify({ news: topNews }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
