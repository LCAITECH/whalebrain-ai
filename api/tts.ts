export async function POST(req: Request) {
    const { text } = await req.json().catch(() => ({ text: null }));
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
        return new Response(JSON.stringify({ error: "ElevenLabs credentials missing" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    if (!text) {
        return new Response(JSON.stringify({ error: "Text is required" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs API Error: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return new Response(arrayBuffer, {
            status: 200,
            headers: { 'Content-Type': 'audio/mpeg' },
        });
    } catch (error) {
        console.error("Error generating TTS:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
