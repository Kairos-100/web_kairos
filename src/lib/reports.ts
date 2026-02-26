import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { MetricEntry, Essay } from '../constants';
import { WHITELIST } from '../constants';
import type { ClockifyUserTime } from './clockify';

// Extend jsPDF for autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

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

    // Initialize with all whitelist users
    WHITELIST.forEach(email => {
        const user = email.split('@')[0];
        grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, time: 0 };
    });

    const parseDate = (str: string) => {
        if (!str) return new Date(0);
        if (str.includes('-')) return new Date(str);
        const [d, m, y] = str.split('/').map(Number);
        return new Date(y, m - 1, d);
    };

    metrics.forEach(m => {
        const d = parseDate(m.date);
        if (d >= start && d <= end) {
            const user = m.user_email.split('@')[0];
            if (grouped[user]) {
                grouped[user].cv += m.cv || 0;
                grouped[user].cp += m.cp || 0;
                grouped[user].sharing += m.sharing || 0;
                grouped[user].revenue += m.revenue || 0;
                grouped[user].profit += m.profit || 0;
            }
        }
    });

    essays.forEach(e => {
        const d = parseDate(e.date);
        if (d >= start && d <= end) {
            const user = e.author.split('@')[0];
            if (grouped[user]) {
                grouped[user].lp += e.points || 0;
            }
        }
    });

    clockifyUsers.forEach(u => {
        const user = u.email.split('@')[0];
        if (grouped[user]) {
            grouped[user].time += u.totalTime || 0;
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

    doc.autoTable({
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
