export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const body = await req.json();
        const text = body.text;
        const tg_id = body.tg_id; // Identidad delegada desde el App

        // Environment variables in Edge Runtime on Vercel
        const apiKey = process.env.OPENAI_API_KEY;
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
        const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Missing OpenAI API Key" }), { status: 400 });
        }
        if (!text) {
            return new Response(JSON.stringify({ error: "Text is required" }), { status: 400 });
        }

        // --- INYECCIÓN ANTI-BOTS (SUPABASE RATE LIMITING) ---
        if (SUPABASE_URL && SUPABASE_ANON_KEY && tg_id) {
            const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${tg_id}&select=id,daily_credits`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            const userData = await userRes.json();

            if (userData && userData.length > 0) {
                const credits = userData[0].daily_credits;
                if (credits <= 0) {
                    return new Response("LIMITE DIARIO EXCEDIDO. GASTASTE TU ENERGÍA, GORDO. VOLVÉ MAÑANA O ACTIVÁ EL PRO.", { status: 429 });
                }

                // Restar 1 crédito asíncronamente
                fetch(`${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${tg_id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ daily_credits: credits - 1 })
                }).catch(e => console.error('Fallo descontando creditos', e));
            }
        }
        // ----------------------------------------------------

        // Llamada a la API de OpenAI TTS (Mucho más barato, rápido y con voces crudas)
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "tts-1",
                voice: "onyx", // ideal para degen/arquitectura ruda
                input: text
            })
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ error: `OpenAI API Error: ${response.statusText}` }), { status: response.status });
        }

        // Devolver el ArrayBuffer como stream literal para reproducción HTML <audio>
        return new Response(response.body, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: `Internal Server Error: ${e instanceof Error ? e.message : String(e)}` }), { status: 500 });
    }
}
