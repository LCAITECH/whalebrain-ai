export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    // Hacemos scraping de la preview pública de Telegram del canal NeuralGuruNews
    // Esto funciona gracias a que Telegram expone un iframe público: https://t.me/s/[canal]
    const tgChannelUrl = 'https://t.me/s/NeuralGuruNews';
    const response = await fetch(tgChannelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
        throw new Error(`Telegram Web Preview returned status ${response.status}`);
    }

    const html = await response.text();

    // Buscar todos los bloques de texto de mensaje usando Regex
    // <div class="tgme_widget_message_text[^>]*>...</div>
    const regex = /<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/gi;
    let match;
    let lastMessageHtml = '';
    
    // Iteramos hasta el final para quedarnos con el último mensaje posteado
    while ((match = regex.exec(html)) !== null) {
      lastMessageHtml = match[1];
    }

    let topNews = [];

    if (lastMessageHtml) {
      // Limpiar etiquetas HTML básicas y adaptarlo a texto puro
      let cleanText = lastMessageHtml
        .replace(/<br\s*\/?>/gi, '\n') // saltos de línea
        .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1') // remover links pero dejar texto
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '$1') // remover negrita
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '$1') // remover cursiva o íconos vacíos
        .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1') // spans
        .replace(/&#34;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/&amp;/gi, '&')
        .replace(/<[^>]*>/g, '') // Eliminar cualquier tag HTML sobrante
        .replace(/\n\s*\n/g, '\n\n') // Reducir espacios múltiples
        .trim();

      // Si el mensaje es muy largo, lo truncamos para el titulo/burbuja y enviamos completo en description (por si acaso)
      // Como a veces envían enlaces, fotos o links repetitivos "powered by @invitIA_Studio", los sacamos:
      cleanText = cleanText.split('\npowered by')[0].trim();
      cleanText = cleanText.split('powered by @invitIA_Studio')[0].trim();

      const shortTitle = cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText;

      topNews.push({
        title: shortTitle, // Titular corto para la burbuja
        body: cleanText,   // El contenido completo
        source: 'Telegram @NeuralGuruNews'
      });
    }

    return new Response(JSON.stringify({ news: topNews }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error fetching Telegram news:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
