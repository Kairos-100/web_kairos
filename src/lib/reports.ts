import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MetricEntry, Essay } from '../constants';
import { WHITELIST, CLOCKIFY_USER_MAP } from '../constants';
import type { ClockifyUserTime } from './clockify';

export interface ReportData {
    user: string;
    cv: number;
    lp: number;
    cp: number;
    sharing: number;
    revenue: number;
    profit: number;
    time: number; // in seconds
}

export function aggregateDataForRange(
    metrics: MetricEntry[],
    essays: Essay[],
    clockifyUsers: ClockifyUserTime[],
    start: Date,
    end: Date
): Record<string, ReportData> {
    const grouped: Record<string, ReportData> = {};

    // Normalize range boundaries to start/end of day
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e_range = new Date(end);
    e_range.setHours(23, 59, 59, 999);

    // Initialize with all whitelist users
    WHITELIST.forEach(email => {
        const user = email.split('@')[0];
        grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, time: 0 };
    });

    const parseDate = (str: string) => {
        if (!str) return new Date(0);
        let d: Date;
        if (str.includes('-')) {
            d = new Date(str);
        } else {
            const [day, m, y] = str.split('/').map(Number);
            d = new Date(y, m - 1, day);
        }
        d.setHours(0, 0, 0, 0);
        return d;
    };

    metrics.forEach(m => {
        const d = parseDate(m.date);
        if (d >= s && d <= e_range) {
            const mEmail = (m.user_email || '').toLowerCase();
            const user = mEmail.split('@')[0];
            const targetKey = Object.keys(grouped).find(k => k.toLowerCase() === user || mEmail.includes(k.toLowerCase()));

            if (targetKey) {
                grouped[targetKey].cv += Number(m.cv) || 0;
                grouped[targetKey].cp += Number(m.cp) || 0;
                grouped[targetKey].sharing += Number(m.sharing) || 0;
                grouped[targetKey].revenue += Number(m.revenue) || 0;
                grouped[targetKey].profit += Number(m.profit) || 0;
            }
        }
    });

    essays.forEach(item => {
        const d = parseDate(item.date);
        if (d >= s && d <= e_range) {
            const aEmail = (item.author || '').toLowerCase();
            const user = aEmail.split('@')[0];
            const targetKey = Object.keys(grouped).find(k => k.toLowerCase() === user || aEmail.includes(k.toLowerCase()));

            if (targetKey) {
                grouped[targetKey].lp += Number(item.points) || 0;
            }
        }
    });

    clockifyUsers.forEach(u => {
        // Find which whitelist user this Clockify user belongs to
        const matchedUser = Object.keys(grouped).find(target => {
            const expectedClockifyName = CLOCKIFY_USER_MAP[target];
            const uName = (u.userName || '').toLowerCase();
            const uEmail = (u.email || '').toLowerCase();

            if (expectedClockifyName) {
                const expected = expectedClockifyName.toLowerCase();
                return uName === expected || uName.includes(expected) || expected.includes(uName) || uEmail.includes(expected);
            }

            const normalizedTarget = target.toLowerCase();
            return uName.includes(normalizedTarget) || normalizedTarget.includes(uName) || uEmail.includes(normalizedTarget);
        });

        if (matchedUser && grouped[matchedUser]) {
            grouped[matchedUser].time += u.totalTime || 0;
        }
    });

    return grouped;
}

export function generatePDF(
    title: string,
    period: string,
    data: ReportData[],
    isCompanyReport: boolean = false
): jsPDF {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 29, 66); // Kairos Navy
    doc.text('KAIROS', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text(title, 105, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${period}`, 105, 38, { align: 'center' });

    const tableData = data.map((row, idx) => [
        idx + 1,
        row.user,
        row.cv,
        `${row.revenue.toLocaleString('es-ES')}€`,
        `${row.profit.toLocaleString('es-ES')}€`,
        row.lp,
        row.cp,
        row.sharing,
        `${Math.floor(row.time / 3600)}h ${Math.floor((row.time % 3600) / 60)}m`
    ]);

    autoTable(doc, {
        startY: 45,
        head: [['#', 'Miembro', 'CV', 'Fact.', 'Benef.', 'LP', 'CP', 'SH', 'Tiempo']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 29, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 35 },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'center' },
            6: { halign: 'center' },
            7: { halign: 'center' },
            8: { halign: 'right' }
        }
    });

    if (isCompanyReport) {
        const totals = data.reduce((acc, curr) => ({
            cv: acc.cv + curr.cv,
            rev: acc.rev + curr.revenue,
            prof: acc.prof + curr.profit,
            lp: acc.lp + curr.lp,
            time: acc.time + curr.time
        }), { cv: 0, rev: 0, prof: 0, lp: 0, time: 0 });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(15, 29, 66);
        doc.text('Resumen Ejecutivo Corporativo', 14, finalY);

        doc.setFontSize(10);
        doc.text(`Total Facturación: ${totals.rev.toLocaleString('es-ES')}€`, 14, finalY + 7);
        doc.text(`Total Beneficio: ${totals.prof.toLocaleString('es-ES')}€`, 14, finalY + 12);
        doc.text(`Total Visitas (CV): ${totals.cv}`, 14, finalY + 17);
        doc.text(`Total Formación (LP): ${totals.lp}`, 14, finalY + 22);
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado por Kairos Web - ${new Date().toLocaleDateString('es-ES')}`, 105, 285, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
    }

    return doc;
}
