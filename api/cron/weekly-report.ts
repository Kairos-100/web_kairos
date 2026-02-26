import { Resend } from 'resend';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

// Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const CLOCKIFY_API_KEY = process.env.VITE_CLOCKIFY_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

// Constants (Copied for independence)
const WHITELIST = [
    "jaime.gonzalez@alumni.mondragon.edu",
    "carlos.ortas@alumni.mondragon.edu",
    "claudia.pinna@alumni.mondragon.edu",
    "paula.gascon@alumni.mondragon.edu",
    "angela.cuevas@alumni.mondragon.edu",
    "carlos.pereza@alumni.mondragon.edu",
    "marc.cano@alumni.mondragon.edu",
    "jimena.gonzalez-tarr@alumni.mondragon.edu",
    "guillermo.haya@alumni.mondragon.edu"
];

const CLOCKIFY_USER_MAP: Record<string, string> = {
    "guillermo.haya": "Guillermo Haya",
    "jaime.gonzalez": "Jaimegmesa03",
    "jimena.gonzalez-tarr": "Jimenagtleinn",
    "claudia.pinna": "Claudia Pinna Jurado",
    "marc.cano": "Marc Cano",
    "paula.gascon": "Paula Gascón Escobedo",
    "angela.cuevas": "Angela",
    "carlos.ortas": "Caorpa"
};

export default async function handler(req: Request) {
    // Vercel Cron Security
    if (CRON_SECRET) {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }
    }

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_KEY || !CLOCKIFY_API_KEY) {
        return new Response('Environment missing', { status: 500 });
    }

    try {
        const now = new Date();
        // Calculate Previous Monday to Previous Sunday
        const day = now.getDay(); // 0 Sun, 1 Mon...
        // We are at Monday morning (hopefully)
        // If today is Monday (1), diffToLastMonday is 7 days ago.
        const diffToLastMonday = (day === 0 ? 6 : day - 1) + 7;
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - diffToLastMonday);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        const periodStr = `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;

        // 1. Fetch Data
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Metrics
        const { data: metrics } = await supabase
            .from('metrics')
            .select('*')
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString());

        // Essays
        const { data: essays } = await supabase
            .from('essays')
            .select('*')
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString());

        // Clockify
        let clockifyUsers: any[] = [];
        const wsResponse = await fetch('https://api.clockify.me/api/v1/workspaces', {
            headers: { 'X-Api-Key': CLOCKIFY_API_KEY }
        });
        const workspaces = await wsResponse.json();
        const workspaceId = workspaces?.[0]?.id;

        if (workspaceId) {
            const clockifyUrl = `https://api.clockify.me/api/v1/workspaces/${workspaceId}/reports/summary`;
            const reportRes = await fetch(clockifyUrl, {
                method: 'POST',
                headers: {
                    'X-Api-Key': CLOCKIFY_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dateRangeStart: startDate.toISOString(),
                    dateRangeEnd: endDate.toISOString(),
                    summaryFilter: { groups: ["USER"] }
                })
            });
            const reportData = await reportRes.json();
            clockifyUsers = reportData.groupOne || [];
        }

        // 2. Aggregate
        const grouped: any = {};
        WHITELIST.forEach(email => {
            const user = email.split('@')[0];
            grouped[user] = { user, email, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, time: 0 };
        });

        metrics?.forEach(m => {
            const user = m.user_email.split('@')[0];
            if (grouped[user]) {
                grouped[user].cv += Number(m.cv) || 0;
                grouped[user].cp += Number(m.cp) || 0;
                grouped[user].sharing += Number(m.sharing) || 0;
                grouped[user].revenue += Number(m.revenue) || 0;
                grouped[user].profit += Number(m.profit) || 0;
            }
        });

        essays?.forEach(e => {
            const user = e.author.split('@')[0];
            if (grouped[user]) {
                grouped[user].lp += Number(e.points) || 0;
            }
        });

        clockifyUsers.forEach(u => {
            const uName = (u.name || '').toLowerCase();
            const uEmail = (u.email || '').toLowerCase();
            const matchedKey = Object.keys(grouped).find(target => {
                const clockifyName = (CLOCKIFY_USER_MAP[target] || '').toLowerCase();
                if (clockifyName) return uName.includes(clockifyName) || clockifyName.includes(uName);
                return uName.includes(target.toLowerCase());
            });
            if (matchedKey) grouped[matchedKey].time += u.duration || 0;
        });

        // 3. Generate & Send
        const resend = new Resend(RESEND_API_KEY);
        const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

        for (const userKey of Object.keys(grouped)) {
            const data = grouped[userKey];
            const doc = new jsPDF();

            // Header
            doc.setFontSize(22);
            doc.setTextColor(15, 29, 66);
            doc.text('KAIROS', 105, 20, { align: 'center' });
            doc.setFontSize(16);
            doc.text('Reporte Semanal Automático', 105, 30, { align: 'center' });
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Periodo: ${periodStr}`, 105, 38, { align: 'center' });

            // Basic Data Row (Simple Manual Table to Avoid AutoTable Node dependency issues)
            doc.setFontSize(12);
            doc.setTextColor(0);
            const startY = 50;
            doc.text(`Miembro: ${userKey}`, 14, startY);
            doc.text(`Visitas (CV): ${data.cv}`, 14, startY + 10);
            doc.text(`Facturación: ${data.revenue}€`, 14, startY + 20);
            doc.text(`Beneficio: ${data.profit}€`, 14, startY + 30);
            doc.text(`Formación (LP): ${data.lp}`, 14, startY + 40);
            doc.text(`Comunidad (CP): ${data.cp}`, 14, startY + 50);
            doc.text(`Tiempo: ${Math.floor(data.time / 3600)}h ${Math.floor((data.time % 3600) / 60)}m`, 14, startY + 60);

            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Generado automáticamente por Kairos Web`, 105, 285, { align: 'center' });

            const pdfBase64 = doc.output('datauristring').split(',')[1];

            await resend.emails.send({
                from: 'Kairos Team <notificaciones@kairoscompany.es>',
                to: [data.email],
                subject: `📊 Reporte Semanal Kairos: ${periodStr}`,
                html: `<p>Hola ${userKey},</p><p>Adjunto encontrarás tu reporte semanal de actividad de <b>${periodStr}</b>.</p><p>Buen lunes,</p><p>El equipo de Kairos</p>`,
                attachments: [{
                    filename: `Reporte_Kairos_${userKey}.pdf`,
                    content: pdfBase64
                }]
            });

            await sleep(700);
        }

        return new Response(JSON.stringify({ success: true, count: Object.keys(grouped).length }), { status: 200 });
    } catch (err: any) {
        console.error('Cron Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
