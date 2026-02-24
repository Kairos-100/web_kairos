import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { MetricEntry, Essay } from '../constants';
import { motion } from 'framer-motion';

interface MetricsViewProps {
    metrics: MetricEntry[];
    essays: Essay[];
}

const COLORS = {
    cv: '#F59E0B', // Yellow/Gold
    lp: '#3B82F6', // Blue (Learning Points)
    cp: '#EF4444', // Red (Community Points)
    sharing: '#8B5CF6', // Purple
    revenue: '#10B981', // Green
    profit: '#059669', // Emerald
};

export const MetricsView: React.FC<MetricsViewProps> = ({ metrics, essays }) => {
    // 1. Summary Stats
    const totals = useMemo(() => {
        const metricTotals = metrics.reduce((acc, m) => ({
            cv: acc.cv + (m.cv || 0),
            cp: acc.cp + (m.cp || 0),
            sharing: acc.sharing + (m.sharing || 0),
            revenue: acc.revenue + (m.revenue || 0),
            profit: acc.profit + (m.profit || 0),
        }), { cv: 0, cp: 0, sharing: 0, revenue: 0, profit: 0 });

        const lpTotal = essays.reduce((acc, e) => acc + (e.points || 0), 0);

        return {
            ...metricTotals,
            lp: lpTotal
        };
    }, [metrics, essays]);

    // 2. Evolution Data
    const evolutionData = useMemo(() => {
        const grouped: Record<string, any> = {};

        // Metrics day aggregation
        metrics.forEach(m => {
            if (!grouped[m.date]) grouped[m.date] = { date: m.date, cv: 0, lp: 0, cp: 0, sharing: 0 };
            grouped[m.date].cv += m.cv || 0;
            grouped[m.date].cp += m.cp || 0;
            grouped[m.date].sharing += m.sharing || 0;
        });

        // Essays day aggregation (Learning Points)
        essays.forEach(e => {
            if (!grouped[e.date]) grouped[e.date] = { date: e.date, cv: 0, lp: 0, cp: 0, sharing: 0 };
            grouped[e.date].lp += e.points || 0;
        });

        return Object.values(grouped).sort((a: any, b: any) => {
            const [d1, m1, y1] = a.date.split('/').map(Number);
            const [d2, m2, y2] = b.date.split('/').map(Number);
            return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
        });
    }, [metrics, essays]);

    // 3. User Contribution Data
    const userData = useMemo(() => {
        const grouped: Record<string, any> = {};

        // Metrics user aggregation
        metrics.forEach(m => {
            const user = m.user_email.split('@')[0];
            if (!grouped[user]) {
                grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, cv_pdf_url: null, sharing_pdf_url: null };
            }
            grouped[user].cv += m.cv || 0;
            grouped[user].cp += m.cp || 0;
            grouped[user].sharing += m.sharing || 0;
            grouped[user].revenue += m.revenue || 0;
            grouped[user].profit += m.profit || 0;
            if (m.cv_pdf_url) grouped[user].cv_pdf_url = m.cv_pdf_url;
            if (m.sharing_pdf_url) grouped[user].sharing_pdf_url = m.sharing_pdf_url;
        });

        // Essays user aggregation (Learning Points)
        essays.forEach(e => {
            const user = e.author.split('@')[0];
            if (!grouped[user]) {
                grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, cv_pdf_url: null, sharing_pdf_url: null };
            }
            grouped[user].lp += e.points || 0;
        });

        return Object.values(grouped).sort((a: any, b: any) => (b.lp + b.cp) - (a.lp + b.cp));
    }, [metrics, essays]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'NUMERO CV', value: totals.cv, color: 'text-amber-500' },
                    { label: 'LEARNING POINTS (LP)', value: totals.lp, color: 'text-blue-500' },
                    { label: 'COMMUNITY POINTS (CP)', value: totals.cp, color: 'text-red-500' },
                    { label: 'NUMERO SHARING', value: totals.sharing, color: 'text-purple-500' },
                    { label: 'FACTURACIÓN', value: formatCurrency(totals.revenue) + '€', color: 'text-green-600' },
                    { label: 'BENEFICIO', value: formatCurrency(totals.profit) + '€', color: 'text-emerald-700' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="card p-4 flex flex-col items-center text-center justify-center hover:scale-105 transition-transform"
                    >
                        <p className={`text-3xl font-heading font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[9px] uppercase tracking-tighter font-bold text-gray-400 mt-1">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-heading font-bold text-kairos-navy">¿Cómo estamos evolucionando?</h3>
                            <p className="text-xs text-gray-400">Nuestra gloriosa trayectoria.</p>
                        </div>
                        <TrendingUp size={20} className="text-gray-300" />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend iconType="circle" />
                                <Line type="monotone" dataKey="cv" name="NUMERO CV" stroke={COLORS.cv} strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="lp" name="LEARNING POINTS" stroke={COLORS.lp} strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="cp" name="COMMUNITY POINTS" stroke={COLORS.cp} strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="sharing" name="NUMERO SHARING" stroke={COLORS.sharing} strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-heading font-bold text-kairos-navy">Contribución por usuario</h3>
                            <p className="text-xs text-gray-400">Distribución de actividad (LP: Conocimiento | CP: Comercial).</p>
                        </div>
                        <Users size={20} className="text-gray-300" />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="user" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend iconType="rect" />
                                <Bar dataKey="lp" name="LEARNING POINTS (LP)" stackId="a" fill={COLORS.lp} />
                                <Bar dataKey="cp" name="COMMUNITY POINTS (CP)" stackId="a" fill={COLORS.cp} />
                                <Bar dataKey="cv" name="NUMERO CV" stackId="a" fill={COLORS.cv} />
                                <Bar dataKey="sharing" name="NUMERO SHARING" stackId="a" fill={COLORS.sharing} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-kairos-navy text-white">
                    <div>
                        <h3 className="text-xl font-heading font-bold">Total por Kairense</h3>
                        <p className="text-xs opacity-50 italic">Humilde pero trabajado</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-kairos-navy text-white text-[10px] uppercase font-bold tracking-widest">
                                <th className="p-4 pl-8">#</th>
                                <th className="p-4">Dirección de co...</th>
                                <th className="p-4 text-center">CV</th>
                                <th className="p-4 text-center">LP (TESIS)</th>
                                <th className="p-4 text-center">CP (COMERCIAL)</th>
                                <th className="p-4 text-center">SHAR...</th>
                                <th className="p-4 text-right">FACTU...</th>
                                <th className="p-4 text-right pr-8">BENEF...</th>
                                <th className="p-4 text-center">JUSTIFICANTES</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {userData.map((user, idx) => (
                                <tr key={user.user} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="p-4 pl-8 text-xs font-bold text-gray-400">{idx + 1}.</td>
                                    <td className="p-4 text-xs font-bold text-kairos-navy">{user.user}@alumni...</td>

                                    {/* CV */}
                                    <td className="p-0">
                                        <div className="h-full flex items-center justify-center font-bold text-xs py-4 transition-all" style={{ backgroundColor: `rgba(245, 158, 11, ${Math.min(0.9, user.cv / 150)})`, color: user.cv > 70 ? 'white' : '#0F1D42' }}>{user.cv || '0'}</div>
                                    </td>

                                    {/* LP */}
                                    <td className="p-0">
                                        <div className="h-full flex items-center justify-center font-bold text-xs py-4 transition-all" style={{ backgroundColor: `rgba(59, 130, 246, ${Math.min(0.9, user.lp / 100)})`, color: user.lp > 50 ? 'white' : '#0F1D42' }}>{user.lp || '0'}</div>
                                    </td>

                                    {/* CP */}
                                    <td className="p-0">
                                        <div className="h-full flex items-center justify-center font-bold text-xs py-4 transition-all" style={{ backgroundColor: `rgba(239, 68, 68, ${Math.min(0.9, user.cp / 100)})`, color: user.cp > 50 ? 'white' : '#0F1D42' }}>{user.cp || '0'}</div>
                                    </td>

                                    <td className="p-4 text-center text-xs font-bold text-gray-500">{user.sharing || '0'}</td>
                                    <td className="p-4 text-right text-xs font-bold text-kairos-navy">{formatCurrency(user.revenue)}</td>
                                    <td className="p-4 text-right font-mono text-xs font-bold text-emerald-600 pr-8">{user.profit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            {user.cv_pdf_url && <a href={user.cv_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Justificante CV"><FileText size={16} /></a>}
                                            {user.sharing_pdf_url && <a href={user.sharing_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors" title="Justificante Sharing"><FileText size={16} /></a>}
                                            {!user.cv_pdf_url && !user.sharing_pdf_url && <span className="text-gray-200">-</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};
