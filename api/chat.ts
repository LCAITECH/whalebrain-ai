export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const body = await req.json();
        const { messages, systemInstruction, isJson, model = "gpt-4o-mini" } = body;

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return new Response('Missing OPENAI_API_KEY', { status: 500 });
        }

        // Preparar el array de mensajes para OpenAI
        const finalMessages = [];
        if (systemInstruction) {
            // Si hay requerimiento JSON estricto, inyectamos refuerzo en el system
            const jsonReinforcement = isJson ? " RESPONDE SOLO CON UN JSON VÁLIDO. NO ESCRIBAS NADA MÁS." : "";
            finalMessages.push({ role: "system", content: systemInstruction + jsonReinforcement });
        }

        if (Array.isArray(messages)) {
            finalMessages.push(...messages);
        }

        // Payload de OpenAI
        const openAiReqBody: any = {
            model: model,
            messages: finalMessages,
            temperature: 0.8
        };

        if (isJson) {
            // Usamos response_format universal json_object soportado por gpt-4o-mini
            openAiReqBody.response_format = { type: "json_object" };
        }

        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(openAiReqBody)
        });

        if (!openAiRes.ok) {
            const errorText = await openAiRes.text();
            throw new Error(`OpenAI API Error: ${openAiRes.status} ${errorText}`);
        }

        const data = await openAiRes.json();
        const textContent = data.choices[0].message.content;

        return new Response(JSON.stringify({ text: textContent }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Chat AI Proxy error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
