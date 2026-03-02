import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { WHITELIST, ADMIN_RECIPIENTS } from '../src/constants';
import { aggregateDataForRange, generatePDF } from '../src/lib/reports';

dotenv.config();

const RESEND_API_KEY = process.env.VITE_RESEND_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const CLOCKIFY_API_KEY = process.env.VITE_CLOCKIFY_API_KEY;

async function run() {
    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_KEY || !CLOCKIFY_API_KEY) {
        console.error('Environment variables missing. Check .env');
        return;
    }

    const startDate = new Date(2025, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(2025, 11, 31, 23, 59, 59, 999);
    const periodStr = "AÑO COMPLETO 2025";

    console.log(`🚀 Generando reporte anual 2025...`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: rawMetrics } = await supabase.from('metrics').select('*');
    const { data: rawEssays } = await supabase.from('essays').select('*');

    let clockifyUsers: any[] = [];
    try {
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
    } catch (e) { console.error('Error Clockify:', e); }

    const aggregated = aggregateDataForRange(rawMetrics || [], rawEssays || [], clockifyUsers, startDate, endDate);
    const aggregatedArray = Object.values(aggregated);

    const teamPdf = generatePDF('RESUMEN ANUAL DE EQUIPO 2025', periodStr, aggregatedArray, { includeTable: true, includeDistributions: false });
    const clockPdf = generatePDF('DISTRIBUCIÓN CLOCKIFY ANUAL 2025', periodStr, aggregatedArray, { includeTable: false, includeDistributions: true });

    const teamBuffer = Buffer.from(teamPdf.output('arraybuffer'));
    const clockBuffer = Buffer.from(clockPdf.output('arraybuffer'));

    const resend = new Resend(RESEND_API_KEY);
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const email of WHITELIST) {
        const userKey = email.split('@')[0];
        const userData = aggregated[userKey];
        if (!userData) continue;

        const indivPdf = generatePDF('TUS INDICADORES ANUALES 2025', periodStr, [userData], { includeTable: true, includeDistributions: false });
        const indivBuffer = Buffer.from(indivPdf.output('arraybuffer'));

        console.log(`📧 Enviando reporte a: ${email}`);
        await resend.emails.send({
            from: 'Kairos Team <notificaciones@kairoscompany.es>',
            to: [email],
            subject: `📊 Reporte Especial Kairos: CIERRE ANUAL 2025`,
            html: `<p>Hola,</p><p>Adjuntamos el resumen de impacto y conocimiento de todo el año 2025.</p>`,
            attachments: [
                { filename: `1_Resumen_Anual_Equipo_2025.pdf`, content: teamBuffer },
                { filename: `2_Tus_Indicadores_Anuales_2025_${userKey}.pdf`, content: indivBuffer },
                { filename: `3_Distribucion_Clockify_Anual_2025.pdf`, content: clockBuffer }
            ]
        });
        await sleep(500);
    }

    const corpPdf = generatePDF('REPORTE CORPORATIVO DE GESTIÓN 2025', periodStr, aggregatedArray, { includeTable: true, includeDistributions: true, includeCorporate: true });
    const corpBuffer = Buffer.from(corpPdf.output('arraybuffer'));

    console.log(`📧 Enviando reporte corporativo a admins...`);
    await resend.emails.send({
        from: 'Kairos Admin <notificaciones@kairoscompany.es>',
        to: ADMIN_RECIPIENTS,
        subject: `🌎 CIERRE GLOBAL KAIROS 2025`,
        html: `<p>Resumen ejecutivo del año 2025 completo para administradores.</p>`,
        attachments: [{ filename: 'Cierre_Global_2025.pdf', content: corpBuffer }]
    });

    console.log('✅ ¡Reporte 2025 enviado con éxito!');
}

run().catch(console.error);
