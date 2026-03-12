export const config = {
    runtime: 'edge'
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
        const body = await req.json();
        const { telegram_id, creditsToAdd, txHash } = body;

        if (!telegram_id || !creditsToAdd) {
            return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400 });
        }

        const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
        const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

        // TODO: En el futuro, usar la API de TonCenter para verificar "txHash" en la blockchain 
        // y confirmar que el TON llegó a la MASTER_WALLET antes de dar los créditos.
        // Por ahora confiamos en el event client-side.

        // 1. Buscar usuario
        const getUserRes = await fetch(`${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${telegram_id}&select=id,daily_credits`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const userRows = await getUserRes.json();
        if (!userRows || userRows.length === 0) {
            return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404 });
        }

        const currentCredits = userRows[0].daily_credits;
        const newCredits = currentCredits + creditsToAdd;

        // 2. Parchear créditos
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${telegram_id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ daily_credits: newCredits })
        });

        if (!patchRes.ok) {
            throw new Error(`Fallo actualizando supabase: ${patchRes.statusText}`);
        }

        return new Response(JSON.stringify({ success: true, newCredits }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Add Energy Error:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
    }
}
