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

        // 3. Generate Reports & Send
        // 3. Generate Reports & Send
        for (const userKey of Object.keys(usersData)) {
            const data = usersData[userKey];

            // 3.1 Personal Indicators PDF
            const doc1 = new jsPDF();
            doc1.setFontSize(22); doc1.setTextColor(15, 29, 66); doc1.text('KAIROS', 105, 20, { align: 'center' });
            doc1.setFontSize(14); doc1.text('1. TUS INDICADORES INDIVIDUALES', 105, 35, { align: 'center' });
            doc1.setFontSize(10); doc1.setTextColor(100); doc1.text(`Semana: ${periodStr}`, 105, 42, { align: 'center' });
            doc1.text(`Miembro: ${data.user}`, 105, 48, { align: 'center' });

            let y = 65;
            doc1.setFontSize(11); doc1.setTextColor(0);
            doc1.text(`Customer Visits (CV): ${data.cv}`, 20, y); y += 10;
            doc1.text(`Learning Points (LP): ${data.lp}`, 20, y); y += 10;
            doc1.text(`Community Points (CP): ${data.cp}`, 20, y); y += 10;
            doc1.text(`Sharing: ${data.sharing}`, 20, y); y += 10;
            doc1.text(`Facturación: ${data.revenue}€`, 20, y); y += 10;
            doc1.text(`Beneficio (Profit): ${data.profit}€`, 20, y); y += 10;
            doc1.text(`Tiempo Total: ${Math.floor(data.time / 3600)}h ${Math.floor((data.time % 3600) / 60)}m`, 20, y);

            // 3.2 Team Summary PDF
            const doc2 = new jsPDF();
            doc2.setFontSize(22); doc2.setTextColor(15, 29, 66); doc2.text('KAIROS', 105, 20, { align: 'center' });
            doc2.setFontSize(14); doc2.text('2. RESUMEN CONJUNTO DEL EQUIPO', 105, 35, { align: 'center' });
            doc2.setFontSize(10); doc2.setTextColor(100); doc2.text(`Semana: ${periodStr}`, 105, 42, { align: 'center' });

            doc2.setFontSize(12); doc2.setTextColor(0); let y2 = 65;
            doc2.text(`Total CV: ${teamTotals.cv}`, 20, y2); y2 += 10;
            doc2.text(`Total LP: ${teamTotals.lp}`, 20, y2); y2 += 10;
            doc2.text(`Total CP: ${teamTotals.cp}`, 20, y2); y2 += 10;
            doc2.text(`Total Sharing: ${teamTotals.sharing}`, 20, y2); y2 += 10;
            doc2.text(`Facturación Equipo: ${teamTotals.revenue}€`, 20, y2); y2 += 10;
            doc2.text(`Beneficio Equipo: ${teamTotals.profit}€`, 20, y2); y2 += 10;
            doc2.text(`Tiempo Equipo: ${Math.floor(teamTotals.time / 3600)}h`, 20, y2);

            // 3.3 Clockify Distribution PDF
            const doc3 = new jsPDF();
            doc3.setFontSize(22); doc3.setTextColor(15, 29, 66); doc3.text('KAIROS', 105, 20, { align: 'center' });
            doc3.setFontSize(14); doc3.text('3. DISTRIBUCIÓN DE TIEMPO (CLOCKIFY)', 105, 35, { align: 'center' });
            doc3.setFontSize(10); doc3.setTextColor(100); doc3.text(`Semana: ${periodStr}`, 105, 42, { align: 'center' });

            let y3 = 60;
            if (data.projects.length === 0) {
                doc3.text('No se encontraron registros de tiempo esta semana.', 20, y3);
            } else {
                doc3.setFont('helvetica', 'bold');
                doc3.text('Proyecto', 20, y3); doc3.text('Horas', 120, y3); doc3.text('% Dedicación', 160, y3);
                doc3.line(20, y3 + 2, 190, y3 + 2);
                y3 += 10; doc3.setFont('helvetica', 'normal');

                data.projects.forEach((p: any) => {
                    const hours = Math.floor(p.duration / 3600);
                    const mins = Math.floor((p.duration % 3600) / 60);
                    const percentage = data.time > 0 ? ((p.duration / data.time) * 100).toFixed(1) : '0';
                    doc3.text(p.name, 20, y3);
                    doc3.text(`${hours}h ${mins}m`, 120, y3);
                    doc3.text(`${percentage}%`, 160, y3);
                    y3 += 8;
                    if (y3 > 270) { doc3.addPage(); y3 = 20; }
                });
            }

            // Clean base64 helper
            const cleanBase64 = (uri: string) => uri.replace(/^data:application\/pdf;base64,/, '');

            const pdf1Base64 = cleanBase64(doc1.output('datauristring'));
            const pdf2Base64 = cleanBase64(doc2.output('datauristring'));
            const pdf3Base64 = cleanBase64(doc3.output('datauristring'));

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
                        <li><b>Indicadores Individuales</b>: Tu desempeño en CV, LP, CP y finanzas.</li>
                        <li><b>Resumen Conjunto</b>: Cómo va el equipo a nivel global.</li>
                        <li><b>Distribución de Tiempo</b>: Desglose de tus horas en Clockify con porcentajes por proyecto.</li>
                    </ol>
                    <p>Cualquier duda, puedes ver los detalles en la <a href="https://web-kairos.vercel.app">web de Kairos</a>.</p>
                    <p>¡Buen inicio de semana!</p>
                `,
                attachments: [
                    { filename: `1_Indicadores_Individuales_${data.user}.pdf`, content: pdf1Base64 },
                    { filename: `2_Resumen_Conjunto_Equipo.pdf`, content: pdf2Base64 },
                    { filename: `3_Distribucion_Tiempo_${data.user}.pdf`, content: pdf3Base64 }
                ]
            });

            if (resendError) {
                console.error(`Error sending individual report to ${data.email}:`, resendError);
            } else {
                console.log(`Report sent successfully to ${data.email}. ID: ${resendData?.id}`);
            }
        }

        // 4. Also send the Global Table ONLY to admins for oversight
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
        const globalPdf = globalDoc.output('datauristring').split(',')[1];
        await resend.emails.send({
            from: 'Kairos Admin <notificaciones@kairoscompany.es>',
            to: ADMIN_RECIPIENTS,
            subject: `🌎 CONTROL GLOBAL KAIROS: ${periodStr}`,
            html: `<p>Resumen global de control para administradores.</p>`,
            attachments: [{ filename: 'Control_Global_Cuentas.pdf', content: globalPdf }]
        });

        return new Response(JSON.stringify({ success: true, recipients: WHITELIST.length }), { status: 200 });
    } catch (err: any) {
        console.error('Cron Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
