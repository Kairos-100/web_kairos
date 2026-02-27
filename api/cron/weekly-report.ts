import { Resend } from 'resend';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

// Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const CLOCKIFY_API_KEY = process.env.VITE_CLOCKIFY_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

// Constants
const WHITELIST = [
    "jaime.gonzalez@alumni.mondragon.edu",
    "carlos.ortas@alumni.mondragon.edu",
    "claudia.pinna@alumni.mondragon.edu",
    "paula.gascon@alumni.mondragon.edu",
    "angela.cuevas@alumni.mondragon.edu",
    "carlos.pereza@alumni.mondragon.edu",
    "marc.cano@alumni.mondragon.edu",
    "jimena.gonzalez-tarr@alumni.mondragon.edu",
    "guillermo.haya@alumni.mondragon.edu",
    "eider.viela@alumni.mondragon.edu"
];

const ADMIN_RECIPIENTS = [
    "guillermo.haya@alumni.mondragon.edu",
    "eider.viela@alumni.mondragon.edu"
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

        // Helpers
        const parseDate = (str: string) => {
            if (!str) return new Date(0);
            if (str.includes('-')) {
                const d = new Date(str);
                d.setHours(0, 0, 0, 0);
                return d;
            }
            const [d, m, y] = str.split('/').map(Number);
            const date = new Date(y, m - 1, d);
            date.setHours(0, 0, 0, 0);
            return date;
        };

        // 1. Fetch Data
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data: rawMetrics } = await supabase.from('metrics').select('*');
        const { data: rawEssays } = await supabase.from('essays').select('*');

        const metrics = (rawMetrics || []).filter(m => {
            const d = parseDate(m.date);
            return d >= startDate && d <= endDate;
        });

        const essays = (rawEssays || []).filter(e => {
            const d = parseDate(e.date);
            return d >= startDate && d <= endDate;
        });

        // 1.1 Fetch Clockify Project Data
        let clockifyEntries: any[] = [];
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
                    summaryFilter: { groups: ["USER", "PROJECT"] } // Granular!
                })
            });
            const reportData = await reportRes.json();
            clockifyEntries = reportData.groupOne || [];
        }

        // 2. Aggregate
        const usersData: Record<string, any> = {};
        WHITELIST.forEach(email => {
            const user = email.split('@')[0];
            usersData[user] = {
                user, email,
                cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, time: 0,
                projects: [] as { name: string, duration: number }[]
            };
        });

        metrics.forEach(m => {
            const mEmail = (m.user_email || '').toLowerCase();
            const user = mEmail.split('@')[0];
            const targetKey = Object.keys(usersData).find(k => k.toLowerCase() === user || mEmail.includes(k.toLowerCase()));
            if (targetKey) {
                usersData[targetKey].cv += Number(m.cv) || 0;
                usersData[targetKey].cp += Number(m.cp) || 0;
                usersData[targetKey].sharing += Number(m.sharing) || 0;
                usersData[targetKey].revenue += Number(m.revenue) || 0;
                usersData[targetKey].profit += Number(m.profit) || 0;
            }
        });

        essays.forEach(e => {
            const aEmail = (e.author || '').toLowerCase();
            const user = aEmail.split('@')[0];
            const targetKey = Object.keys(usersData).find(k => k.toLowerCase() === user || aEmail.includes(k.toLowerCase()));
            if (targetKey) {
                usersData[targetKey].lp += Number(e.points) || 0;
            }
        });

        clockifyEntries.forEach(u => {
            const uName = (u.name || '').toLowerCase();
            const uEmail = (u.email || '').toLowerCase();
            const matchedKey = Object.keys(usersData).find(target => {
                const clockifyName = (CLOCKIFY_USER_MAP[target] || '').toLowerCase();
                if (clockifyName) return uName === clockifyName || uName.includes(clockifyName) || clockifyName.includes(uName);
                return uName.includes(target.toLowerCase()) || uEmail.includes(target.toLowerCase());
            });
            if (matchedKey) {
                const totalUserDuration = u.duration || 0;
                usersData[matchedKey].time += totalUserDuration;
                if (u.children) {
                    u.children.forEach((p: any) => {
                        usersData[matchedKey].projects.push({ name: p.name, duration: p.duration });
                    });
                }
            }
        });

        // Team Totals
        const teamTotals = {
            cv: Object.values(usersData).reduce((a, b) => a + b.cv, 0),
            lp: Object.values(usersData).reduce((a, b) => a + b.lp, 0),
            cp: Object.values(usersData).reduce((a, b) => a + b.cp, 0),
            sharing: Object.values(usersData).reduce((a, b) => a + b.sharing, 0),
            revenue: Object.values(usersData).reduce((a, b) => a + b.revenue, 0),
            profit: Object.values(usersData).reduce((a, b) => a + b.profit, 0),
            time: Object.values(usersData).reduce((a, b) => a + b.time, 0)
        };

        const resend = new Resend(RESEND_API_KEY);

        // 3. Generate Common Team Report Once
        const docTeam = new jsPDF();
        docTeam.setFontSize(26); docTeam.setTextColor(15, 29, 66); docTeam.setFont('helvetica', 'bold');
        docTeam.text('KAIROS', 105, 25, { align: 'center' });
        docTeam.setDrawColor(15, 29, 66); docTeam.setLineWidth(0.5); docTeam.line(20, 30, 190, 30);

        docTeam.setFontSize(16); docTeam.text('RESUMEN CONJUNTO DEL EQUIPO', 105, 45, { align: 'center' });
        docTeam.setFontSize(11); docTeam.setTextColor(100); docTeam.setFont('helvetica', 'normal');
        docTeam.text(`Periodo: ${periodStr}`, 105, 52, { align: 'center' });

        let teamY = 75;
        const renderMetric = (doc: any, label: string, value: string, y: number) => {
            doc.setFontSize(12); doc.setTextColor(80); doc.text(label, 25, y);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 29, 66); doc.text(value, 120, y);
            doc.setFont('helvetica', 'normal');
            doc.setDrawColor(230); doc.setLineWidth(0.1); doc.line(25, y + 2, 185, y + 2);
            return y + 12;
        };

        teamY = renderMetric(docTeam, 'Total Customer Visits (CV):', String(teamTotals.cv), teamY);
        teamY = renderMetric(docTeam, 'Total Learning Points (LP):', String(teamTotals.lp), teamY);
        teamY = renderMetric(docTeam, 'Total Community Points (CP):', String(teamTotals.cp), teamY);
        teamY = renderMetric(docTeam, 'Total Content Sharing:', String(teamTotals.sharing), teamY);
        teamY = renderMetric(docTeam, 'Facturación Total Equipo:', `${teamTotals.revenue.toLocaleString('es-ES')}€`, teamY);
        teamY = renderMetric(docTeam, 'Beneficio Neto Equipo:', `${teamTotals.profit.toLocaleString('es-ES')}€`, teamY);
        teamY = renderMetric(docTeam, 'Tiempo Total Imputado:', `${Math.floor(teamTotals.time / 3600)}h`, teamY);

        const pdfTeamBatch = Buffer.from(docTeam.output('arraybuffer'));

        // 4. Generate Individual Reports & Send
        const emailPromises = Object.keys(usersData).map(async (userKey) => {
            try {
                const data = usersData[userKey];

                // 4.1 Personal Indicators PDF
                const docIndiv = new jsPDF();
                docIndiv.setFontSize(26); docIndiv.setTextColor(15, 29, 66); docIndiv.setFont('helvetica', 'bold');
                docIndiv.text('KAIROS', 105, 25, { align: 'center' });
                docIndiv.setDrawColor(15, 29, 66); docIndiv.setLineWidth(0.5); docIndiv.line(20, 30, 190, 30);

                docIndiv.setFontSize(16); docIndiv.text('TUS INDICADORES INDIVIDUALES', 105, 45, { align: 'center' });
                docIndiv.setFontSize(11); docIndiv.setTextColor(100); docIndiv.setFont('helvetica', 'normal');
                docIndiv.text(`Semana: ${periodStr}`, 105, 52, { align: 'center' });
                docIndiv.setFont('helvetica', 'bold'); docIndiv.setTextColor(40, 80, 200);
                docIndiv.text(`Miembro: ${data.user}`, 105, 60, { align: 'center' });

                let iy = 80;
                iy = renderMetric(docIndiv, 'Customer Visits (CV):', String(data.cv), iy);
                iy = renderMetric(docIndiv, 'Learning Points (LP):', String(data.lp), iy);
                iy = renderMetric(docIndiv, 'Community Points (CP):', String(data.cp), iy);
                iy = renderMetric(docIndiv, 'Content Sharing:', String(data.sharing), iy);
                iy = renderMetric(docIndiv, 'Tu Facturación:', `${data.revenue.toLocaleString('es-ES')}€`, iy);
                iy = renderMetric(docIndiv, 'Tu Beneficio (Profit):', `${data.profit.toLocaleString('es-ES')}€`, iy);
                iy = renderMetric(docIndiv, 'Tu Tiempo Total:', `${Math.floor(data.time / 3600)}h ${Math.floor((data.time % 3600) / 60)}m`, iy);

                const pdfIndivBuffer = Buffer.from(docIndiv.output('arraybuffer'));

                // 4.2 Clockify Distribution PDF
                const docClock = new jsPDF();
                docClock.setFontSize(26); docClock.setTextColor(15, 29, 66); docClock.setFont('helvetica', 'bold');
                docClock.text('KAIROS', 105, 25, { align: 'center' });
                docClock.setDrawColor(15, 29, 66); docClock.setLineWidth(0.5); docClock.line(20, 30, 190, 30);

                docClock.setFontSize(16); docClock.text('DISTRIBUCIÓN DE TIEMPO (CLOCKIFY)', 105, 45, { align: 'center' });
                docClock.setFontSize(11); docClock.setTextColor(100); docClock.setFont('helvetica', 'normal');
                docClock.text(`Semana: ${periodStr} | Usuario: ${data.user}`, 105, 52, { align: 'center' });

                let cy = 70;
                if (data.projects.length === 0) {
                    docClock.setTextColor(150);
                    docClock.text('No se encontraron registros de tiempo esta semana.', 105, cy, { align: 'center' });
                } else {
                    docClock.setFillColor(245, 247, 250);
                    docClock.rect(20, cy, 170, 10, 'F');
                    docClock.setFont('helvetica', 'bold'); docClock.setTextColor(15, 29, 66); docClock.setFontSize(10);
                    docClock.text('PROYECTO', 25, cy + 7); docClock.text('HORAS', 120, cy + 7); docClock.text('% DEDICACIÓN', 155, cy + 7);
                    cy += 15; docClock.setFont('helvetica', 'normal'); docClock.setTextColor(0);

                    data.projects.forEach((p: any) => {
                        const hours = Math.floor(p.duration / 3600);
                        const mins = Math.floor((p.duration % 3600) / 60);
                        const percentage = data.time > 0 ? ((p.duration / data.time) * 100).toFixed(1) : '0';

                        docClock.setFontSize(10);
                        docClock.text(p.name, 25, cy);
                        docClock.text(`${hours}h ${mins}m`, 120, cy);
                        docClock.text(`${percentage}%`, 160, cy);

                        docClock.setDrawColor(240); docClock.line(20, cy + 2, 190, cy + 2);
                        cy += 10;
                        if (cy > 270) { docClock.addPage(); cy = 25; }
                    });
                }

                const pdfClockBuffer = Buffer.from(docClock.output('arraybuffer'));

                console.log(`[Batch] Sending email to ${data.email}...`);

                // Send to User
                const { data: resendData, error: resendError } = await resend.emails.send({
                    from: 'Kairos Team <notificaciones@kairoscompany.es>',
                    to: [data.email],
                    subject: `📊 Informes Semanales Kairos: ${periodStr}`,
                    html: `
                        <p>Hola ${data.user},</p>
                        <p>Adjuntamos tus 3 informes correspondientes a la semana pasada:</p>
                        <ol>
                            <li><b>Indicadores Individuales</b></li>
                            <li><b>Resumen Conjunto del Equipo</b></li>
                            <li><b>Distribución de Tiempo (Clockify)</b></li>
                        </ol>
                        <p>Cualquier duda, puedes ver los detalles en la <a href="https://web-kairos.vercel.app">web de Kairos</a>.</p>
                        <p>¡Buen inicio de semana!</p>
                    `,
                    attachments: [
                        { filename: `1_Indicadores_Individuales_${data.user}.pdf`, content: pdfIndivBuffer },
                        { filename: `2_Resumen_Conjunto_Equipo.pdf`, content: pdfTeamBatch },
                        { filename: `3_Distribucion_Tiempo_${data.user}.pdf`, content: pdfClockBuffer }
                    ]
                });

                if (resendError) {
                    console.error(`[Error] Failed for ${data.email}:`, resendError);
                } else {
                    console.log(`[Success] Sent to ${data.email}. ID: ${resendData?.id}`);
                }
            } catch (err) {
                console.error(`[Fatal] Unexpected error processing ${userKey}:`, err);
            }
        });

        await Promise.all(emailPromises);

        // 5. Also send the Global Table ONLY to admins for oversight
        const globalDoc = new jsPDF();
        globalDoc.setFontSize(22); globalDoc.setTextColor(15, 29, 66); globalDoc.setFont('helvetica', 'bold');
        globalDoc.text('CONTROL GLOBAL KAIROS', 105, 20, { align: 'center' });
        globalDoc.setDrawColor(15, 29, 66); globalDoc.line(20, 25, 190, 25);

        let gy = 40;
        globalDoc.setFillColor(245, 247, 250);
        globalDoc.rect(14, gy - 5, 182, 7, 'F');
        globalDoc.setFontSize(8); globalDoc.setTextColor(100);
        globalDoc.text('MIEMBRO', 16, gy); globalDoc.text('CV', 60, gy); globalDoc.text('LP', 80, gy); globalDoc.text('PROFIT', 100, gy); globalDoc.text('TIEMPO', 130, gy);
        gy += 7;

        globalDoc.setTextColor(0); globalDoc.setFont('helvetica', 'normal');
        Object.values(usersData).forEach((d: any) => {
            globalDoc.text(d.user, 16, gy);
            globalDoc.text(String(d.cv), 60, gy);
            globalDoc.text(String(d.lp), 80, gy);
            globalDoc.text(`${d.profit}€`, 100, gy);
            globalDoc.text(`${Math.floor(d.time / 3600)}h`, 130, gy);

            globalDoc.setDrawColor(240); globalDoc.line(14, gy + 2, 196, gy + 2);
            gy += 6;
            if (gy > 280) { globalDoc.addPage(); gy = 20; }
        });
        const globalPdfBuffer = Buffer.from(globalDoc.output('arraybuffer'));

        await resend.emails.send({
            from: 'Kairos Admin <notificaciones@kairoscompany.es>',
            to: ADMIN_RECIPIENTS,
            subject: `🌎 CONTROL GLOBAL KAIROS: ${periodStr}`,
            html: `<p>Resumen global de control para administradores.</p>`,
            attachments: [{ filename: 'Control_Global_Cuentas.pdf', content: globalPdfBuffer }]
        });

        return new Response(JSON.stringify({ success: true, recipients: WHITELIST.length }), { status: 200 });
    } catch (err: any) {
        console.error('Cron Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
