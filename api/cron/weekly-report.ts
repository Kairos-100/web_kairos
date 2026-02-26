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
        docTeam.setFontSize(22); docTeam.setTextColor(15, 29, 66); docTeam.text('KAIROS', 105, 20, { align: 'center' });
        docTeam.setFontSize(14); docTeam.text('2. RESUMEN CONJUNTO DEL EQUIPO', 105, 35, { align: 'center' });
        docTeam.setFontSize(10); docTeam.setTextColor(100); docTeam.text(`Semana: ${periodStr}`, 105, 42, { align: 'center' });
        docTeam.setFontSize(12); docTeam.setTextColor(0); let teamY = 65;
        docTeam.text(`Total CV: ${teamTotals.cv}`, 20, teamY); teamY += 10;
        docTeam.text(`Total LP: ${teamTotals.lp}`, 20, teamY); teamY += 10;
        docTeam.text(`Total CP: ${teamTotals.cp}`, 20, teamY); teamY += 10;
        docTeam.text(`Total Sharing: ${teamTotals.sharing}`, 20, teamY); teamY += 10;
        docTeam.text(`Facturación Equipo: ${teamTotals.revenue}€`, 20, teamY); teamY += 10;
        docTeam.text(`Beneficio Equipo: ${teamTotals.profit}€`, 20, teamY); teamY += 10;
        docTeam.text(`Tiempo Equipo: ${Math.floor(teamTotals.time / 3600)}h`, 20, teamY);

        const pdfTeamBatch = Buffer.from(docTeam.output('arraybuffer')).toString('base64');

        // 4. Generate Individual Reports & Send
        for (const userKey of Object.keys(usersData)) {
            const data = usersData[userKey];

            // 4.1 Personal Indicators PDF
            const docIndiv = new jsPDF();
            docIndiv.setFontSize(22); docIndiv.setTextColor(15, 29, 66); docIndiv.text('KAIROS', 105, 20, { align: 'center' });
            docIndiv.setFontSize(14); docIndiv.text('1. TUS INDICADORES INDIVIDUALES', 105, 35, { align: 'center' });
            docIndiv.setFontSize(10); docIndiv.setTextColor(100); docIndiv.text(`Semana: ${periodStr}`, 105, 42, { align: 'center' });
            docIndiv.text(`Miembro: ${data.user}`, 105, 48, { align: 'center' });

            let iy = 65;
            docIndiv.setFontSize(11); docIndiv.setTextColor(0);
            docIndiv.text(`Customer Visits (CV): ${data.cv}`, 20, iy); iy += 10;
            docIndiv.text(`Learning Points (LP): ${data.lp}`, 20, iy); iy += 10;
            docIndiv.text(`Community Points (CP): ${data.cp}`, 20, iy); iy += 10;
            docIndiv.text(`Sharing: ${data.sharing}`, 20, iy); iy += 10;
            docIndiv.text(`Facturación: ${data.revenue}€`, 20, iy); iy += 10;
            docIndiv.text(`Beneficio (Profit): ${data.profit}€`, 20, iy); iy += 10;
            docIndiv.text(`Tiempo Total: ${Math.floor(data.time / 3600)}h ${Math.floor((data.time % 3600) / 60)}m`, 20, iy);

            const pdfIndivBase64 = Buffer.from(docIndiv.output('arraybuffer')).toString('base64');

            // 4.2 Clockify Distribution PDF
            const docClock = new jsPDF();
            docClock.setFontSize(22); docClock.setTextColor(15, 29, 66); docClock.text('KAIROS', 105, 20, { align: 'center' });
            docClock.setFontSize(14); docClock.text('3. DISTRIBUCIÓN DE TIEMPO (CLOCKIFY)', 105, 35, { align: 'center' });
            docClock.setFontSize(10); docClock.setTextColor(100); docClock.text(`Semana: ${periodStr}`, 105, 42, { align: 'center' });

            let cy = 60;
            if (data.projects.length === 0) {
                docClock.text('No se encontraron registros de tiempo esta semana.', 20, cy);
            } else {
                docClock.setFont('helvetica', 'bold');
                docClock.text('Proyecto', 20, cy); docClock.text('Horas', 120, cy); docClock.text('% Dedicación', 160, cy);
                docClock.line(20, cy + 2, 190, cy + 2);
                cy += 10; docClock.setFont('helvetica', 'normal');

                data.projects.forEach((p: any) => {
                    const hours = Math.floor(p.duration / 3600);
                    const mins = Math.floor((p.duration % 3600) / 60);
                    const percentage = data.time > 0 ? ((p.duration / data.time) * 100).toFixed(1) : '0';
                    docClock.text(p.name, 20, cy);
                    docClock.text(`${hours}h ${mins}m`, 120, cy);
                    docClock.text(`${percentage}%`, 160, cy);
                    cy += 8;
                    if (cy > 270) { docClock.addPage(); cy = 20; }
                });
            }

            const pdfClockBase64 = Buffer.from(docClock.output('arraybuffer')).toString('base64');

            console.log(`Sending email to ${data.email} with 3 attachments...`);

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
                    { filename: `1_Indicadores_Individuales_${data.user}.pdf`, content: pdfIndivBase64 },
                    { filename: `2_Resumen_Conjunto_Equipo.pdf`, content: pdfTeamBatch },
                    { filename: `3_Distribucion_Tiempo_${data.user}.pdf`, content: pdfClockBase64 }
                ]
            });

            if (resendError) {
                console.error(`Error sending individual report to ${data.email}:`, resendError);
            } else {
                console.log(`Report sent successfully to ${data.email}. ID: ${resendData?.id}`);
            }
        }

        // 5. Also send the Global Table ONLY to admins for oversight
        const globalDoc = new jsPDF();
        globalDoc.text('TABLA GLOBAL DE CONTROL (SOLO ADMIN)', 105, 20, { align: 'center' });
        let gy = 40;
        globalDoc.setFontSize(8);
        globalDoc.text('Miembro', 14, gy); globalDoc.text('CV', 60, gy); globalDoc.text('LP', 80, gy); globalDoc.text('Profit', 100, gy); globalDoc.text('Tiempo', 130, gy);
        gy += 5;
        Object.values(usersData).forEach((d: any) => {
            globalDoc.text(d.user, 14, gy); globalDoc.text(String(d.cv), 60, gy); globalDoc.text(String(d.lp), 80, gy); globalDoc.text(`${d.profit}€`, 100, gy); globalDoc.text(`${Math.floor(d.time / 3600)}h`, 130, gy);
            gy += 6;
        });
        const globalPdfBase64 = Buffer.from(globalDoc.output('arraybuffer')).toString('base64');

        await resend.emails.send({
            from: 'Kairos Admin <notificaciones@kairoscompany.es>',
            to: ADMIN_RECIPIENTS,
            subject: `🌎 CONTROL GLOBAL KAIROS: ${periodStr}`,
            html: `<p>Resumen global de control para administradores.</p>`,
            attachments: [{ filename: 'Control_Global_Cuentas.pdf', content: globalPdfBase64 }]
        });

        return new Response(JSON.stringify({ success: true, recipients: WHITELIST.length }), { status: 200 });
    } catch (err: any) {
        console.error('Cron Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
