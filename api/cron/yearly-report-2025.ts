import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { WHITELIST, ADMIN_RECIPIENTS } from '../../src/constants.js';
import { aggregateDataForRange, generatePDF } from '../../src/lib/reports.js';

export const config = {
    runtime: 'edge',
};

// Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const CLOCKIFY_API_KEY = process.env.VITE_CLOCKIFY_API_KEY;

export default async function handler(req: Request) {
    // One-off script, can be triggered manually via browser or curl
    if (req.method !== 'GET' && req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_KEY || !CLOCKIFY_API_KEY) {
        return new Response(`Environment missing. RE: ${!!RESEND_API_KEY}, SU: ${!!SUPABASE_URL}, SK: ${!!SUPABASE_KEY}, CL: ${!!CLOCKIFY_API_KEY}`, { status: 500 });
    }

    try {
        // Define 2025 Range
        const startDate = new Date(2025, 0, 1, 0, 0, 0, 0); // Jan 1, 2025
        const endDate = new Date(2025, 11, 31, 23, 59, 59, 999); // Dec 31, 2025
        const periodStr = "AÑO COMPLETO 2025";

        console.log(`[Manual Report] Starting report for: ${periodStr}`);

        // 1. Fetch Data
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data: rawMetrics } = await supabase.from('metrics').select('*');
        const { data: rawEssays } = await supabase.from('essays').select('*');

        // 1.1 Fetch Clockify Project Data (Full Year 2025)
        let clockifyUsers: any[] = [];
        const wsResponse = await fetch('https://api.clockify.me/api/v1/workspaces', { headers: { 'X-Api-Key': CLOCKIFY_API_KEY } });
        const workspaces = await wsResponse.json();
        const workspaceId = workspaces?.[0]?.id;

        if (workspaceId) {
            const reportRes = await fetch(`https://reports.api.clockify.me/v1/workspaces/${workspaceId}/reports/summary`, {
                method: 'POST',
                headers: { 'X-Api-Key': CLOCKIFY_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dateRangeStart: startDate.toISOString(),
                    dateRangeEnd: endDate.toISOString(),
                    summaryFilter: { groups: ["USER", "PROJECT"] }
                })
            });
            const reportData = await reportRes.json();

            clockifyUsers = (reportData.groupOne || []).map((u: any) => ({
                userName: u.name,
                email: u.email || u.name,
                totalTime: u.duration,
                projects: (u.children || []).map((p: any) => ({
                    projectName: p.name,
                    time: p.duration,
                    color: p.color
                }))
            }));
        }

        // 2. Aggregate
        const aggregated = aggregateDataForRange(rawMetrics || [], rawEssays || [], clockifyUsers, startDate, endDate);
        const aggregatedArray = Object.values(aggregated);

        // 3. Pre-generate shared reports
        const teamPdf = generatePDF('RESUMEN ANUAL DE EQUIPO 2025', periodStr, aggregatedArray, { includeTable: true, includeDistributions: false });
        const clockPdf = generatePDF('DISTRIBUCIÓN CLOCKIFY ANUAL 2025', periodStr, aggregatedArray, { includeTable: false, includeDistributions: true });

        const teamBuffer = new Uint8Array(teamPdf.output('arraybuffer'));
        const clockBuffer = new Uint8Array(clockPdf.output('arraybuffer'));

        const resend = new Resend(RESEND_API_KEY);
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // 4. Send to everyone in WHITELIST
        for (const email of WHITELIST) {
            try {
                const userKey = email.split('@')[0];
                const userData = aggregated[userKey];

                if (!userData) {
                    console.warn(`[Manual Report] No data found for ${email}, skipping...`);
                    continue;
                }

                const indivPdf = generatePDF('TUS INDICADORES SEMANALES', periodStr, [userData], { includeTable: true, includeDistributions: false });
                const indivBuffer = new Uint8Array(indivPdf.output('arraybuffer'));

                console.log(`[Manual Report] Sending to ${email}...`);
                await resend.emails.send({
                    from: 'Kairos Team <notificaciones@kairoscompany.es>',
                    to: [email],
                    subject: `📊 Reporte Especial Kairos: CIERRE ANUAL 2025`,
                    html: `
                        <p>Hola,</p>
                        <p>Adjuntamos el resumen de impacto y conocimiento de todo el año 2025:</p>
                        <ol>
                            <li><b>Resumen Anual de Equipo:</b> Vista consolidada de 2025.</li>
                            <li><b>Tus Indicadores Anuales:</b> Tu resumen personal de impacto (CV, LP, CP).</li>
                            <li><b>Distribución Clockify Anual:</b> Desglose de horas por proyecto durante todo el año.</li>
                        </ol>
                        <p>¡Seguimos haciendo historia!</p>
                    `,
                    attachments: [
                        { filename: `1_Resumen_Anual_Equipo_2025.pdf`, content: teamBuffer },
                        { filename: `2_Tus_Indicadores_Anuales_2025_${userKey}.pdf`, content: indivBuffer },
                        { filename: `3_Distribucion_Clockify_Anual_2025.pdf`, content: clockBuffer }
                    ]
                });
                await sleep(500); // Respect Resend rate limits
            } catch (err) {
                console.error(`[Manual Report] Error for ${email}:`, err);
            }
        }

        // 5. Corporate report to admins
        const corpPdf = generatePDF('REPORTE CORPORATIVO DE GESTIÓN', periodStr, aggregatedArray, { includeTable: true, includeDistributions: true, includeCorporate: true });
        const corpBuffer = new Uint8Array(corpPdf.output('arraybuffer'));

        await resend.emails.send({
            from: 'Kairos Admin <notificaciones@kairoscompany.es>',
            to: ADMIN_RECIPIENTS,
            subject: `🌎 CIERRE GLOBAL KAIROS 2025`,
            html: `<p>Resumen ejecutivo del año 2025 completo para administradores.</p>`,
            attachments: [{ filename: 'Cierre_Global_2025.pdf', content: corpBuffer }]
        });

        return new Response(JSON.stringify({ success: true, message: `Reporte 2025 enviado a ${WHITELIST.length} miembros.` }), { status: 200 });

    } catch (err: any) {
        console.error('Manual Report Fatal Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
