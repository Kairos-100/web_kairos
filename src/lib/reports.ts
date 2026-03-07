import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MetricEntry, Essay } from '../constants.js';
import { WHITELIST, CLOCKIFY_USER_MAP } from '../constants.js';
import type { ClockifyUserTime } from './clockify.js';
import { parseDate } from './dates.js';

export interface ReportData {
    user: string;
    cv: number;
    lp: number;
    cp: number;
    sharing: number;
    revenue: number;
    profit: number;
    time: number; // in seconds
    projects: {
        name: string,
        duration: number,
        entries?: { description: string, duration: number, date: string, tags?: string[] }[]
    }[];
    tags: {
        name: string,
        duration: number
    }[];
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
        grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, time: 0, projects: [], tags: [] };
    });


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
            if (u.projects) {
                u.projects.forEach((p) => {
                    const existing = grouped[matchedUser].projects.find(ep => ep.name === p.projectName);
                    const formattedEntries = (p.detailedEntries || []).map(de => ({
                        description: de.description,
                        duration: de.time,
                        date: de.date,
                        tags: de.tags
                    }));

                    if (existing) {
                        existing.duration += p.time || 0;
                        if (formattedEntries.length > 0) {
                            existing.entries = [...(existing.entries || []), ...formattedEntries];
                        }
                    } else {
                        grouped[matchedUser].projects.push({
                            name: p.projectName,
                            duration: p.time || 0,
                            entries: formattedEntries
                        });
                    }

                    // Aggregate tags for the user
                    formattedEntries.forEach(entry => {
                        if (entry.tags) {
                            entry.tags.forEach(tagName => {
                                const existingTag = grouped[matchedUser].tags.find(t => t.name === tagName);
                                if (existingTag) {
                                    existingTag.duration += entry.duration;
                                } else {
                                    grouped[matchedUser].tags.push({ name: tagName, duration: entry.duration });
                                }
                            });
                        }
                    });
                });
            }
        }
    });

    return grouped;
}

export interface ReportOptions {
    includeTable?: boolean;
    includeDistributions?: boolean;
    includeCorporate?: boolean;
    includeDetails?: boolean; // New option to control granular task logs
    highlightUserKey?: string;
}

export const generatePDF = (
    title: string,
    period: string,
    data: ReportData[],
    options: ReportOptions = { includeTable: true, includeDistributions: true, includeDetails: true }
): jsPDF => {
    const doc = new jsPDF({
        compress: true // Enable automatic PDF compression
    });
    const autotableFunc = (autoTable as any).default || autoTable;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 29, 66); // Kairos Navy
    doc.text('KAIROS', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text(title, 105, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${period}`, 105, 38, { align: 'center' });

    let currentY = 45;

    if (options.includeTable) {
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

        autotableFunc(doc, {
            startY: currentY,
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
            },
            didParseCell: (dataCell: any) => {
                if (options.highlightUserKey && dataCell.section === 'body') {
                    const rowUser = data.map(r => r.user.split('@')[0])[dataCell.row.index];
                    if (rowUser === options.highlightUserKey) {
                        dataCell.cell.styles.fillColor = [240, 247, 255]; // Light blue highlight
                        dataCell.cell.styles.textColor = [15, 29, 66];
                        dataCell.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- Add Clockify Breakdown Page if requested ---
    if (options.includeDistributions && data.length > 0) {
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(15, 29, 66);
        doc.text('Distribución de Tiempo (Clockify)', 105, 20, { align: 'center' });

        currentY = 35;

        // --- 1. Team Total Section ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL EQUIPO', 14, currentY);
        currentY += 7;

        const teamProjects: Record<string, number> = {};
        let totalTeamTime = 0;
        data.forEach(u => {
            totalTeamTime += u.time;
            u.projects.forEach(p => {
                teamProjects[p.name] = (teamProjects[p.name] || 0) + p.duration;
            });
        });

        const sortedTeamProjects = Object.entries(teamProjects)
            .sort((a, b) => b[1] - a[1])
            .map(([name, duration]) => [
                name,
                `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`,
                totalTeamTime > 0 ? `${((duration / totalTeamTime) * 100).toFixed(1)}%` : '0%'
            ]);

        autotableFunc(doc, {
            startY: currentY,
            head: [['Proyecto (Equipo)', 'Tiempo Total', '%']],
            body: sortedTeamProjects,
            theme: 'striped',
            headStyles: { fillColor: [40, 80, 200], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
            columnStyles: {
                0: { cellWidth: 90 },
                1: { halign: 'right', cellWidth: 35 },
                2: { halign: 'right', cellWidth: 25 }
            }
        });

        // --- 1b. Team Tags Section ---
        const teamTags: Record<string, number> = {};
        data.forEach(u => {
            u.tags.forEach(t => {
                teamTags[t.name] = (teamTags[t.name] || 0) + t.duration;
            });
        });

        if (Object.keys(teamTags).length > 0) {
            currentY = (doc as any).lastAutoTable.finalY + 10;
            if (currentY > 230) { doc.addPage(); currentY = 20; }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('DISTRIBUCIÓN POR TAGS (EQUIPO)', 14, currentY);
            currentY += 7;

            const sortedTeamTags = Object.entries(teamTags)
                .sort((a, b) => b[1] - a[1])
                .map(([name, duration]) => [
                    name,
                    `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`,
                    totalTeamTime > 0 ? `${((duration / totalTeamTime) * 100).toFixed(1)}%` : '0%'
                ]);

            autotableFunc(doc, {
                startY: currentY,
                head: [['Tag (Equipo)', 'Tiempo Total', '%']],
                body: sortedTeamTags,
                theme: 'striped',
                headStyles: { fillColor: [80, 160, 120], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
                columnStyles: {
                    0: { cellWidth: 90 },
                    1: { halign: 'right', cellWidth: 35 },
                    2: { halign: 'right', cellWidth: 25 }
                }
            });

            currentY = (doc as any).lastAutoTable.finalY + 15;
        } else {
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        // --- 2. Individual Breakdowns ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('DESGLOSE POR MIEMBRO', 14, currentY);
        currentY += 8;

        data.forEach(user => {
            if (user.projects.length > 0) {
                if (currentY > 240) { doc.addPage(); currentY = 20; }
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(60, 60, 60);
                doc.text(user.user.toUpperCase(), 14, currentY);
                currentY += 5;

                const projectData = user.projects
                    .sort((a, b) => b.duration - a.duration)
                    .map(p => [
                        p.name,
                        `${Math.floor(p.duration / 3600)}h ${Math.floor((p.duration % 3600) / 60)}m`,
                        user.time > 0 ? `${((p.duration / user.time) * 100).toFixed(1)}%` : '0%'
                    ]);

                autotableFunc(doc, {
                    startY: currentY,
                    head: [['Proyecto', 'Tiempo', '%']],
                    body: projectData,
                    theme: 'plain',
                    headStyles: { fillColor: [245, 247, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
                    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
                    margin: { left: 20 },
                    columnStyles: {
                        0: { cellWidth: 80 },
                        1: { halign: 'right', cellWidth: 25 },
                        2: { halign: 'right', cellWidth: 25 }
                    }
                });

                currentY = (doc as any).lastAutoTable.finalY + 5;

                // --- Individual Tags Section ---
                if (user.tags.length > 0) {
                    if (currentY > 260) { doc.addPage(); currentY = 20; }
                    const individualTags = user.tags
                        .sort((a, b) => b.duration - a.duration)
                        .map(t => [
                            t.name,
                            `${Math.floor(t.duration / 3600)}h ${Math.floor((t.duration % 3600) / 60)}m`,
                            user.time > 0 ? `${((t.duration / user.time) * 100).toFixed(1)}%` : '0%'
                        ]);

                    autotableFunc(doc, {
                        startY: currentY,
                        head: [['Tag', 'Tiempo', '%']],
                        body: individualTags,
                        theme: 'plain',
                        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
                        styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' },
                        margin: { left: 30 },
                        columnStyles: {
                            0: { cellWidth: 70 },
                            1: { halign: 'right', cellWidth: 20 },
                            2: { halign: 'right', cellWidth: 20 }
                        }
                    });
                    currentY = (doc as any).lastAutoTable.finalY + 5;
                }

                // --- Detailed Entries Sub-section (SKIP if includeDetails is false) ---
                if (options.includeDetails !== false) {
                    user.projects
                        .filter(p => p.entries && p.entries.length > 0)
                        .forEach(p => {
                            if (currentY > 260) { doc.addPage(); currentY = 20; }

                            const entryData = p.entries!.map(e => [
                                `  - ${e.description}${e.tags && e.tags.length > 0 ? ` [${e.tags.join(', ')}]` : ''}`,
                                `${Math.floor(e.duration / 3600)}h ${Math.floor((e.duration % 3600) / 60)}m`,
                                new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                            ]);

                            doc.setFontSize(6);
                            doc.setFont('helvetica', 'normal');
                            doc.setTextColor(120, 120, 120);
                            doc.text(`Tareas: ${p.name}`, 25, currentY + 4);
                            currentY += 6;

                            autotableFunc(doc, {
                                startY: currentY,
                                body: entryData,
                                theme: 'plain',
                                styles: { fontSize: 6, cellPadding: 1, textColor: [100, 100, 100], overflow: 'linebreak' },
                                margin: { left: 30 },
                                columnStyles: {
                                    0: { cellWidth: 80 },
                                    1: { halign: 'right', cellWidth: 20 },
                                    2: { halign: 'right', cellWidth: 20 }
                                }
                            });
                            currentY = (doc as any).lastAutoTable.finalY + 4;
                        });
                }

                currentY += 5;
            }
        });
    }

    if (options.includeCorporate) {
        const totals = data.reduce((acc, curr) => ({
            cv: acc.cv + curr.cv,
            rev: acc.rev + curr.revenue,
            prof: acc.prof + curr.profit,
            lp: acc.lp + curr.lp,
            time: acc.time + curr.time
        }), { cv: 0, rev: 0, prof: 0, lp: 0, time: 0 });

        let finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : currentY + 10;
        if (finalY > 250) { doc.addPage(); finalY = 20; }

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
