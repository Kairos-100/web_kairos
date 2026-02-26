import React, { useState } from 'react';
import { FileText, Send, Download, CheckCircle2, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MetricEntry, Essay } from '../constants';
import { WHITELIST } from '../constants';
import type { ClockifyUserTime } from '../lib/clockify';
import { aggregateDataForRange, generatePDF } from '../lib/reports';
import { notifyReport } from '../lib/notifications';

interface ReportPanelProps {
    metrics: MetricEntry[];
    essays: Essay[];
    clockifyUsers: ClockifyUserTime[];
}

export const ReportPanel: React.FC<ReportPanelProps> = ({ metrics, essays, clockifyUsers }) => {
    const [isSending, setIsSending] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState<string | null>(null);

    const handleSendReports = async (type: 'Semanal' | 'Mensual') => {
        setIsSending(type);

        const now = new Date();
        let start = new Date();
        let period = '';

        if (type === 'Semanal') {
            // Last 7 days
            start.setDate(now.getDate() - 7);
            period = `${start.toLocaleDateString('es-ES')} - ${now.toLocaleDateString('es-ES')}`;
        } else {
            // This month
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            period = `${start.toLocaleString('es-ES', { month: 'long' })} ${now.getFullYear()}`;
        }

        const aggregated = aggregateDataForRange(metrics, essays, clockifyUsers, start, now);

        try {
            for (const email of WHITELIST) {
                const userKey = email.split('@')[0];
                const userData = aggregated[userKey];

                if (userData) {
                    const pdf = generatePDF(`Reporte Individual ${type}`, period, [userData]);
                    const pdfBase64 = pdf.output('datauristring').split(',')[1];
                    await notifyReport(email, `Individual ${type}`, pdfBase64, period);
                }
            }
            setShowSuccess(type);
            setTimeout(() => setShowSuccess(null), 5000);
        } catch (error: any) {
            console.error('Error sending reports:', error);
            alert(`Error enviando reportes: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsSending(null);
        }
    };

    const handleDownloadQuarterly = () => {
        const now = new Date();
        const q = Math.floor(now.getMonth() / 3) + 1;
        const startMonth = (q - 1) * 3;
        const start = new Date(now.getFullYear(), startMonth, 1);
        const period = `Q${q} ${now.getFullYear()} (${start.toLocaleDateString('es-ES')} - ${now.toLocaleDateString('es-ES')})`;

        const aggregated = aggregateDataForRange(metrics, essays, clockifyUsers, start, now);
        const dataArray = Object.values(aggregated);

        const pdf = generatePDF(`Reporte Corporativo Trimestral Q${q}`, period, dataArray, true);
        pdf.save(`Kairos_Trimestral_Q${q}_${now.getFullYear()}.pdf`);
    };

    return (
        <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center space-x-3 mb-1">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <FileText size={24} />
                        </div>
                        <h3 className="text-2xl font-heading font-black text-kairos-navy">Centro de Reportes</h3>
                    </div>
                    <p className="text-sm text-gray-500">Genera y envía resúmenes de actividad al equipo</p>
                </div>

                <div className="hidden md:flex items-center space-x-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
                    <Info size={14} />
                    <span>Los reportes individuales se envían por email a cada miembro</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    {
                        title: 'Reporte Semanal',
                        desc: 'Últimos 7 días de actividad',
                        icon: Send,
                        action: () => handleSendReports('Semanal'),
                        type: 'Semanal',
                        color: 'blue'
                    },
                    {
                        title: 'Reporte Mensual',
                        desc: 'Resumen del mes en curso',
                        icon: Send,
                        action: () => handleSendReports('Mensual'),
                        type: 'Mensual',
                        color: 'indigo'
                    },
                    {
                        title: 'Reporte Trimestral (Empresa)',
                        desc: 'Consolidado corporativo Q actual',
                        icon: Download,
                        action: handleDownloadQuarterly,
                        type: 'Trimestral',
                        color: 'emerald',
                        download: true
                    }
                ].map((item, i) => (
                    <button
                        key={i}
                        onClick={item.action}
                        disabled={!!isSending}
                        className={`group relative p-6 rounded-[32px] border-2 border-transparent bg-gray-50 hover:bg-white hover:border-${item.color}-200 hover:shadow-xl transition-all text-left overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <div className={`w-12 h-12 rounded-2xl bg-${item.color}-100 text-${item.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            {isSending === item.type ? <Loader2 size={24} className="animate-spin" /> : <item.icon size={24} />}
                        </div>

                        <h4 className="text-lg font-black text-kairos-navy mb-1">{item.title}</h4>
                        <p className="text-xs text-gray-400 font-bold">{item.desc}</p>

                        <AnimatePresence>
                            {showSuccess === item.type && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center"
                                >
                                    <CheckCircle2 size={40} className={`text-${item.color}-500 mb-2`} />
                                    <p className={`text-sm font-black text-${item.color}-600 uppercase tracking-widest`}>¡Enviado!</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                ))}
            </div>
        </div>
    );
};
