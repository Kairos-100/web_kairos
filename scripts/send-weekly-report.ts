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

    const now = new Date();
    // Calc range: Monday to Sunday of LAST week
    const day = now.getDay();
    const diffToLastMonday = (day === 0 ? 6 : day - 1) + 7;
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - diffToLastMonday);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const periodStr = `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;

    console.log(`🚀 Generando reporte SEMANAL (${periodStr})...`);

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

    const teamPdf = generatePDF('RESUMEN SEMANAL DE EQUIPO', periodStr, aggregatedArray, { includeTable: true, includeDistributions: false });
    const clockPdf = generatePDF('DISTRIBUCIÓN CLOCKIFY (EQUIPO)', periodStr, aggregatedArray, { includeTable: false, includeDistributions: true });

    const teamBuffer = Buffer.from(teamPdf.output('arraybuffer'));
    const clockBuffer = Buffer.from(clockPdf.output('arraybuffer'));

    const resend = new Resend(RESEND_API_KEY);
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const email of WHITELIST) {
        const userKey = email.split('@')[0];
        const userData = aggregated[userKey];
        if (!userData) continue;

        const indivPdf = generatePDF('TUS INDICADORES SEMANALES', periodStr, [userData], { includeTable: true, includeDistributions: false });
        const indivBuffer = Buffer.from(indivPdf.output('arraybuffer'));

        console.log(`📧 Enviando reporte SEMANAL a: ${email}`);
        await resend.emails.send({
            from: 'Kairos Team <notificaciones@kairoscompany.es>',
            to: [email],
            subject: `📊 Reportes Semanales Kairos: ${periodStr}`,
            html: `
                <p>Hola,</p>
                <p>Adjuntamos tus reportes correspondientes a la semana pasada (${periodStr}):</p>
                <ol>
                    <li><b>Resumen de Equipo:</b> Vista conjunta de indicadores de todos los miembros.</li>
                    <li><b>Tus Indicadores:</b> Tus métricas individuales (CV, LP, CP, etc.).</li>
                    <li><b>Distribución Clockify Equipo:</b> Desglose detallado de las horas de TODO el equipo por proyecto.</li>
                </ol>
                <p>¡Buen inicio de semana!</p>
            `,
            attachments: [
                { filename: `1_Resumen_Equipo_Kairos.pdf`, content: teamBuffer },
                { filename: `2_Tus_Indicadores_${userKey}.pdf`, content: indivBuffer },
                { filename: `3_Distribucion_Clockify_Equipo.pdf`, content: clockBuffer }
            ]
        });
        await sleep(500);
    }

    const corpPdf = generatePDF('REPORTE CORPORATIVO DE GESTIÓN', periodStr, aggregatedArray, { includeTable: true, includeDistributions: true, includeCorporate: true });
    const corpBuffer = Buffer.from(corpPdf.output('arraybuffer'));

    console.log(`📧 Enviando reporte corporativo a admins...`);
    await resend.emails.send({
        from: 'Kairos Admin <notificaciones@kairoscompany.es>',
        to: ADMIN_RECIPIENTS,
        subject: `🌎 CONTROL GLOBAL KAIROS: ${periodStr}`,
        html: `<p>Resumen global de control para administradores.</p>`,
        attachments: [{ filename: 'Control_Global_Cuentas.pdf', content: corpBuffer }]
    });

    console.log('✅ ¡Reporte SEMANAL enviado con éxito!');
}

run().catch(console.error);
