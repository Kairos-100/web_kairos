import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { MetricEntry } from '../constants';
import { motion } from 'framer-motion';
import { TrendingUp, Users } from 'lucide-react';

interface MetricsViewProps {
    metrics: MetricEntry[];
}

const COLORS = {
    cv: '#F59E0B', // Yellow/Gold
    bp: '#3B82F6', // Blue
    cp: '#EF4444', // Red
    sharing: '#8B5CF6', // Purple
    revenue: '#10B981', // Green
    profit: '#059669', // Emerald
};

export const MetricsView: React.FC<MetricsViewProps> = ({ metrics }) => {
    // 1. Summary Stats
    const totals = useMemo(() => metrics.reduce((acc, m) => ({
        cv: acc.cv + (m.cv || 0),
        bp: acc.bp + (m.bp || 0),
        cp: acc.cp + (m.cp || 0),
        sharing: acc.sharing + (m.sharing || 0),
        revenue: acc.revenue + (m.revenue || 0),
        profit: acc.profit + (m.profit || 0),
    }), { cv: 0, bp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0 }), [metrics]);

    // 2. Evolution Data (Line Chart)
    const evolutionData = useMemo(() => {
        const grouped = metrics.reduce((acc: Record<string, any>, m) => {
            const date = m.date;
            if (!acc[date]) {
                acc[date] = { date, cv: 0, bp: 0, cp: 0, sharing: 0 };
            }
            acc[date].cv += m.cv || 0;
            acc[date].bp += m.bp || 0;
            acc[date].cp += m.cp || 0;
            acc[date].sharing += m.sharing || 0;
            return acc;
        }, {});

        return Object.values(grouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [metrics]);

    // 3. User Contribution Data (Bar Chart)
    const userData = useMemo(() => {
        const grouped = metrics.reduce((acc: Record<string, any>, m) => {
            const user = m.user_email.split('@')[0];
            if (!acc[user]) {
                acc[user] = { user, cv: 0, bp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0 };
            }
            acc[user].cv += m.cv || 0;
            acc[user].bp += m.bp || 0;
            acc[user].cp += m.cp || 0;
            acc[user].sharing += m.sharing || 0;
            acc[user].revenue += m.revenue || 0;
            acc[user].profit += m.profit || 0;
            return acc;
        }, {});

        return Object.values(grouped).sort((a: any, b: any) => b.cv - a.cv); // Sort by CV descending
    }, [metrics]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Top Score Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                    { label: 'NUMERO DE BP', value: totals.bp, color: 'text-blue-500' },
                    { label: 'NUMERO CV', value: totals.cv, color: 'text-amber-500' },
                    { label: 'NUMERO DE CP', value: totals.cp, color: 'text-red-500' },
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
                {/* Evolution Chart */}
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
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend iconType="circle" />
                                <Line type="monotone" dataKey="bp" name="NUMERO DE BP" stroke={COLORS.bp} strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="cv" name="NUMERO CV" stroke={COLORS.cv} strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="cp" name="NUMERO DE CP" stroke={COLORS.cp} strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="sharing" name="NUMERO SHARING" stroke={COLORS.sharing} strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Contribution by User */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-heading font-bold text-kairos-navy">Contribución por usuario</h3>
                            <p className="text-xs text-gray-400">Distribución de actividad comercial.</p>
                        </div>
                        <Users size={20} className="text-gray-300" />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="user" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend iconType="rect" />
                                <Bar dataKey="sharing" name="NUMERO SHARING" stackId="a" fill={COLORS.sharing} />
                                <Bar dataKey="cv" name="NUMERO CV" stackId="a" fill={COLORS.cv} />
                                <Bar dataKey="bp" name="NUMERO DE BP" stackId="a" fill={COLORS.bp} />
                                <Bar dataKey="cp" name="NUMERO DE CP" stackId="a" fill={COLORS.cp} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Detailed Table */}
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
                                <th className="p-4 text-center">NUMERO CV</th>
                                <th className="p-4 text-center">NUMERO DE BP</th>
                                <th className="p-4 text-center">NUMERO DE CP</th>
                                <th className="p-4 text-center">NUMERO SHAR...</th>
                                <th className="p-4 text-right">FACTU...</th>
                                <th className="p-4 text-right pr-8">BENEFI...</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {userData.map((user, idx) => (
                                <tr key={user.user} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="p-4 pl-8 text-xs font-bold text-gray-400">{idx + 1}.</td>
                                    <td className="p-4 text-xs font-bold text-kairos-navy">{user.user}@alumni...</td>

                                    {/* CV */}
                                    <td className="p-0">
                                        <div
                                            className="h-full flex items-center justify-center font-bold text-xs py-4 transition-all"
                                            style={{ backgroundColor: `rgba(16, 185, 129, ${Math.min(0.9, user.cv / 150)})`, color: user.cv > 70 ? 'white' : '#0F1D42' }}
                                        >
                                            {user.cv || 'null'}
                                        </div>
                                    </td>

                                    {/* BP */}
                                    <td className="p-0">
                                        <div
                                            className="h-full flex items-center justify-center font-bold text-xs py-4 transition-all"
                                            style={{ backgroundColor: `rgba(245, 158, 11, ${Math.min(0.9, user.bp / 100)})`, color: user.bp > 50 ? 'white' : '#0F1D42' }}
                                        >
                                            {user.bp || 'null'}
                                        </div>
                                    </td>

                                    {/* CP */}
                                    <td className="p-0">
                                        <div
                                            className="h-full flex items-center justify-center font-bold text-xs py-4 transition-all"
                                            style={{ backgroundColor: `rgba(239, 68, 68, ${Math.min(0.9, user.cp / 100)})`, color: user.cp > 50 ? 'white' : '#0F1D42' }}
                                        >
                                            {user.cp || 'null'}
                                        </div>
                                    </td>

                                    {/* SHARING */}
                                    <td className="p-4 text-center text-xs font-bold text-gray-500">
                                        {user.sharing || 'null'}
                                    </td>

                                    <td className="p-4 text-right text-xs font-bold text-kairos-navy">
                                        {formatCurrency(user.revenue)}
                                    </td>
                                    <td className="p-4 text-right pr-8 text-xs font-bold text-kairos-navy">
                                        {formatCurrency(user.profit)}
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
