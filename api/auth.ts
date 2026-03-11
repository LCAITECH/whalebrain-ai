export const config = {
    runtime: 'edge'
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
        const body = await req.json();
        const { tgUser } = body;

        // Si entra por la Web normal (sin Telegram), le damos un pase libre temporal o bloqueamos.
        // Vamos a darle 5 creditos locales para que pueda testear la web sin romperla.
        if (!tgUser || !tgUser.id) {
            return new Response(JSON.stringify({ credits: 5 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const { id: telegram_id, username = 'Anon', first_name = '' } = tgUser;

        // Validar vars del Edge
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
        const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

        // Si faltan keys (dev local) mockeamos para no romper el front
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('Missing Supabase variables');
            return new Response(JSON.stringify({ telegram_id, credits: 5, warning: 'NO_SUPABASE_KEYS' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 1. Buscar usuario
        const getUserRes = await fetch(`${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${telegram_id}&select=id,daily_credits,last_scan_date`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const userRows = await getUserRes.json();
        let user;

        // Helper: Formato YYYY-MM-DD
        const todayDateStr = new Date().toISOString().split('T')[0];

        if (userRows && userRows.length > 0) {
            user = userRows[0];
            const lastScanDateStr = user.last_scan_date ? user.last_scan_date.split('T')[0] : null;

            // Si cambió el día, le regalamos 5 créditos de nuevo y actualizamos fecha
            if (lastScanDateStr !== todayDateStr) {
                const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${telegram_id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ daily_credits: 5, last_scan_date: todayDateStr })
                });
                const updated = await patchRes.json();
                user = updated?.[0] || { daily_credits: 5 };
            }
        } else {
            // Registrar usuario nuevo porque no existe en la DB
            const display_name = username !== 'Anon' ? username : first_name;
            const postRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    telegram_id,
                    username: display_name,
                    daily_credits: 5,
                    total_scans: 0,
                    last_scan_date: todayDateStr
                })
            });
            const created = await postRes.json();
            user = created?.[0] || { daily_credits: 5 };
        }

        return new Response(JSON.stringify({
            telegram_id,
            credits: user.daily_credits
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Supabase Auth Flow Error:', error);
        // Si rompe algo, fallback a 5 creditos
        return new Response(JSON.stringify({ credits: 5 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
}
