export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const body = await req.json();
        const text = body.text;

        // Environment variables in Edge Runtime on Vercel
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const voiceId = process.env.ELEVENLABS_VOICE_ID;

        if (!apiKey || !voiceId) {
            return new Response(JSON.stringify({ error: "Missing ElevenLabs credentials" }), { status: 400 });
        }
        if (!text) {
            return new Response(JSON.stringify({ error: "Text is required" }), { status: 400 });
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_turbo_v2_5", // Ultra-fast model
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ error: `ElevenLabs API Error: ${response.statusText}` }), { status: response.status });
        }

        // Return the raw byte stream directly to the client without buffering it in memory
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
