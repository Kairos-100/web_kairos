import React, { useMemo, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, BarChart, Bar,
} from 'recharts';
import type { MetricEntry, Essay } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, FileText, Trophy, Star, Award, ChevronDown, ChevronUp, ExternalLink, Calendar, Target } from 'lucide-react';

interface MetricsViewProps {
    metrics: MetricEntry[];
    essays: Essay[];
}

const COLORS = {
    cv: '#F59E0B',
    lp: '#3B82F6',
    cp: '#EF4444',
    sharing: '#8B5CF6',
    revenue: '#10B981',
    profit: '#059669',
};

export const MetricsView: React.FC<MetricsViewProps> = ({ metrics, essays }) => {
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

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

        metrics.forEach(m => {
            if (!grouped[m.date]) grouped[m.date] = { date: m.date, cv: 0, lp: 0, cp: 0, sharing: 0 };
            grouped[m.date].cv += m.cv || 0;
            grouped[m.date].cp += m.cp || 0;
            grouped[m.date].sharing += m.sharing || 0;
        });

        essays.forEach(e => {
            if (!grouped[e.date]) grouped[e.date] = { date: e.date, cv: 0, lp: 0, cp: 0, sharing: 0 };
            grouped[e.date].lp += e.points || 0;
        });

        return Object.values(grouped).sort((a: any, b: any) => {
            const [d1, m1, y1] = a.date.split('/').map(Number);
            const [d2, m2, y2] = b.date.split('/').map(Number);
            return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
        }).map((item: any) => {
            const [d, m, y] = item.date.split('/').map(Number);
            const dateObj = new Date(y, m - 1, d);
            return {
                ...item,
                chartDate: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
            };
        });
    }, [metrics, essays]);

    // 3. User Aggregated Data & Audit Log
    const { userData, auditLog } = useMemo(() => {
        const grouped: Record<string, any> = {};
        const logs: Record<string, MetricEntry[]> = {};

        metrics.forEach(m => {
            const user = m.user_email.split('@')[0];
            if (!grouped[user]) {
                grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, cv_pdf_url: null, sharing_pdf_url: null, cp_pdf_url: null };
            }
            if (!logs[user]) logs[user] = [];

            grouped[user].cv += m.cv || 0;
            grouped[user].cp += m.cp || 0;
            grouped[user].sharing += m.sharing || 0;
            grouped[user].revenue += m.revenue || 0;
            grouped[user].profit += m.profit || 0;
            if (m.cv_pdf_url) grouped[user].cv_pdf_url = m.cv_pdf_url;
            if (m.sharing_pdf_url) grouped[user].sharing_pdf_url = m.sharing_pdf_url;
            if (m.cp_pdf_url) grouped[user].cp_pdf_url = m.cp_pdf_url;

            logs[user].push(m);
        });

        essays.forEach(e => {
            const user = e.author.split('@')[0];
            if (!grouped[user]) {
                grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, cv_pdf_url: null, sharing_pdf_url: null, cp_pdf_url: null };
            }
            grouped[user].lp += e.points || 0;
        });

        const sortedUsers = Object.values(grouped).sort((a: any, b: any) => (b.lp + b.cp + b.cv) - (a.lp + a.cp + a.cv));

        // Sort each user's log by date descending
        Object.keys(logs).forEach(u => {
            logs[u].sort((a, b) => {
                const [d1, m1, y1] = a.date.split('/').map(Number);
                const [d2, m2, y2] = b.date.split('/').map(Number);
                return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
            });
        });

        return { userData: sortedUsers, auditLog: logs };
    }, [metrics, essays]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    };

    const topPerformers = useMemo(() => userData.slice(0, 3), [userData]);

    return (
        <div className="space-y-8 pb-20">
            {/* 1. Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'NUMERO CV', value: totals.cv, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'LEARNING POINTS (LP)', value: totals.lp, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'COMMUNITY POINTS (CP)', value: totals.cp, color: 'text-red-500', bg: 'bg-red-50' },
                    { label: 'NUMERO SHARING', value: totals.sharing, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: 'FACTURACIÓN', value: formatCurrency(totals.revenue) + '€', color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'BENEFICIO', value: formatCurrency(totals.profit) + '€', color: 'text-emerald-700', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`card p-4 border-none shadow-sm ${stat.bg} flex flex-col items-center text-center justify-center hover:scale-105 transition-all duration-300`}
                    >
                        <p className={`text-4xl font-heading font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                        <p className="text-[9px] uppercase tracking-widest font-black text-gray-500 mt-2 opacity-60 leading-tight">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* 2. Top Performers Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topPerformers.map((user, i) => (
                    <motion.div
                        key={user.user}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        className="bg-white rounded-3xl p-6 shadow-xl border-t-4 border-kairos-navy flex items-center space-x-6 relative overflow-hidden group"
                    >
                        <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
                            {i === 0 ? <Trophy size={100} /> : <Award size={100} />}
                        </div>
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-kairos-navy to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                {user.user[0].toUpperCase()}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-400 border-4 border-white flex items-center justify-center text-white shadow-sm">
                                {i === 0 ? <Star size={12} fill="currentColor" /> : <Award size={12} />}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                {i === 0 ? 'Líder Absoluto' : `Top ${i + 1} Kairos`}
                            </p>
                            <h4 className="text-xl font-heading font-bold text-kairos-navy -mt-1">{user.user}</h4>
                            <div className="flex items-center space-x-3 mt-1">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{user.lp} LP</span>
                                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{user.cp} CP</span>
                                <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">{user.cv} CV</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* 3. Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card p-8 bg-white border-none shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-heading font-black text-kairos-navy">Evolución del Equipo</h3>
                            <p className="text-xs text-gray-400 font-medium">Trayectoria detallada de nuestras métricas principales.</p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evolutionData}>
                                <defs>
                                    <linearGradient id="colorLP" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.lp} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.lp} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCP" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.cp} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.cp} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCV" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.cv} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.cv} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="chartDate"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                    padding={{ left: 10, right: 10 }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '15px' }}
                                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', paddingTop: '20px' }} />
                                <Area type="monotone" dataKey="lp" name="LEARNING POINTS" stroke={COLORS.lp} strokeWidth={3} fillOpacity={1} fill="url(#colorLP)" />
                                <Area type="monotone" dataKey="cp" name="COMMUNITY POINTS" stroke={COLORS.cp} strokeWidth={3} fillOpacity={1} fill="url(#colorCP)" />
                                <Area type="monotone" dataKey="cv" name="CUSTOMER VISITS" stroke={COLORS.cv} strokeWidth={3} fillOpacity={1} fill="url(#colorCV)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card p-8 bg-white border-none shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-heading font-black text-kairos-navy">Fuerza por Kairense</h3>
                            <p className="text-xs text-gray-400 font-medium">Distribución total de actividad acumulada.</p>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="user"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: '#0F1D42', fontWeight: 800 }}
                                    width={100}
                                />
                                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '15px' }} />
                                <Legend iconType="rect" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', paddingTop: '20px' }} />
                                <Bar dataKey="lp" name="LP (Conocimiento)" stackId="a" fill={COLORS.lp} radius={[4, 0, 0, 4]} />
                                <Bar dataKey="cp" name="CP (Comunidad)" stackId="a" fill={COLORS.cp} />
                                <Bar dataKey="cv" name="CV (Visitas)" stackId="a" fill={COLORS.cv} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* 4. Detailed Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-kairos-navy to-blue-900 text-white">
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <Trophy className="text-amber-400" size={24} />
                            <h3 className="text-2xl font-heading font-black">Clasificación General</h3>
                        </div>
                        <p className="text-sm opacity-80 font-medium tracking-wide">Desempeño acumulado del equipo</p>
                    </div>
                    <div className="px-4 py-2 bg-white/10 rounded-2xl text-[10px] uppercase font-black tracking-widest border border-white/20">
                        {userData.length} Kairenses Activos
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                                <th className="p-6 pl-10 border-b border-gray-100 italic">#</th>
                                <th className="p-6 border-b border-gray-100">Miembro del Equipo</th>
                                <th className="p-6 text-center border-b border-gray-100 bg-amber-50/30 text-amber-600">Visitas (CV)</th>
                                <th className="p-6 text-center border-b border-gray-100 bg-blue-50/30 text-blue-600">Aprendizaje (LP)</th>
                                <th className="p-6 text-center border-b border-gray-100 bg-red-50/30 text-red-600">Comunidad (CP)</th>
                                <th className="p-6 text-right border-b border-gray-100">Factu. / Benef.</th>
                                <th className="p-6 text-center border-b border-gray-100">Justificantes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {userData.map((user, idx) => (
                                <tr key={user.user} className="hover:bg-blue-50/30 transition-all group">
                                    <td className="p-6 pl-10">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black transition-all ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 group-hover:bg-kairos-navy group-hover:text-white'}`}>
                                            {idx + 1}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-2xl bg-kairos-navy text-white flex items-center justify-center font-black text-xs shadow-md group-hover:scale-110 transition-transform">
                                                {user.user[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-kairos-navy leading-none mb-1 group-hover:translate-x-1 transition-transform">{user.user}</p>
                                                <p className="text-[10px] text-gray-400 leading-none">@{user.user}.alumni...</p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-6 text-center">
                                        <span className="text-lg font-black text-amber-600">{user.cv || '0'}</span>
                                    </td>

                                    <td className="p-6 text-center">
                                        <span className="text-lg font-black text-blue-600">{user.lp || '0'}</span>
                                    </td>

                                    <td className="p-6 text-center">
                                        <span className="text-lg font-black text-red-500">{user.cp || '0'}</span>
                                    </td>

                                    <td className="p-6 text-right">
                                        <p className="text-xs font-black text-kairos-navy leading-tight">{formatCurrency(user.revenue)}€</p>
                                        <p className="text-[10px] font-bold text-emerald-600 leading-tight">+{formatCurrency(user.profit)}€ profit</p>
                                    </td>

                                    <td className="p-6">
                                        <div className="flex items-center justify-center space-x-3">
                                            {user.cv_pdf_url && (
                                                <a href={user.cv_pdf_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 hover:scale-110 transition-all border border-amber-100" title="Ver Justificante CV">
                                                    <FileText size={18} />
                                                </a>
                                            )}
                                            {user.sharing_pdf_url && (
                                                <a href={user.sharing_pdf_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 hover:scale-110 transition-all border border-purple-100" title="Ver Justificante Sharing">
                                                    <FileText size={18} />
                                                </a>
                                            )}
                                            {user.cp_pdf_url && (
                                                <a href={user.cp_pdf_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:scale-110 transition-all border border-red-100" title="Ver Justificante CP">
                                                    <FileText size={18} />
                                                </a>
                                            )}
                                            {!user.cv_pdf_url && !user.sharing_pdf_url && !user.cp_pdf_url && <span className="text-gray-200 text-xs font-black opacity-20">—</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* 5. Detailed Audit Log (Grouping by User) */}
            <div className="mt-12 space-y-6">
                <div className="flex items-center space-x-3 px-2">
                    <FileText className="text-kairos-navy" size={24} />
                    <h3 className="text-2xl font-heading font-black text-kairos-navy">Log Detallado de Justificantes</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {userData.map((user) => (
                        <div key={`log-${user.user}`} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <button
                                onClick={() => setExpandedUser(expandedUser === user.user ? null : user.user)}
                                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-kairos-navy font-black">
                                        {user.user[0].toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-black text-kairos-navy">{user.user}</h4>
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                                            {(auditLog[user.user]?.length || 0)} Registros Realizados
                                        </p>
                                    </div>
                                </div>
                                {expandedUser === user.user ? <ChevronUp size={20} className="text-gray-300" /> : <ChevronDown size={20} className="text-gray-300" />}
                            </button>

                            <AnimatePresence>
                                {expandedUser === user.user && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-gray-50"
                                    >
                                        <div className="bg-gray-50/50 p-6">
                                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                            <th className="p-4 pl-6">Fecha</th>
                                                            <th className="p-4">Categoría</th>
                                                            <th className="p-4 text-center">Valor</th>
                                                            <th className="p-4 text-right pr-6">Documento</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {(auditLog[user.user] || []).map((entry) => (
                                                            <React.Fragment key={entry.id}>
                                                                {/* CV Row */}
                                                                {entry.cv > 0 && (
                                                                    <tr className="hover:bg-amber-50/30 transition-colors">
                                                                        <td className="p-4 pl-6 text-xs text-gray-400 font-bold">{entry.date}</td>
                                                                        <td className="p-4">
                                                                            <span className="flex items-center space-x-2 text-[10px] font-black uppercase text-amber-600">
                                                                                <Target size={12} />
                                                                                <span>Customer Visit (CV)</span>
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-4 text-center text-xs font-black text-kairos-navy">{entry.cv}</td>
                                                                        <td className="p-4 text-right pr-6">
                                                                            {entry.cv_pdf_url ? (
                                                                                <a href={entry.cv_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-blue-500 hover:text-blue-700 font-black text-[10px]">
                                                                                    <span>VER PDF</span>
                                                                                    <ExternalLink size={10} />
                                                                                </a>
                                                                            ) : <span className="text-gray-200 text-[10px]">Sin adjunto</span>}
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                                {/* Sharing Row */}
                                                                {entry.sharing > 0 && (
                                                                    <tr className="hover:bg-purple-50/30 transition-colors">
                                                                        <td className="p-4 pl-6 text-xs text-gray-400 font-bold">{entry.date}</td>
                                                                        <td className="p-4">
                                                                            <span className="flex items-center space-x-2 text-[10px] font-black uppercase text-purple-600">
                                                                                <Users size={12} />
                                                                                <span>Sharing</span>
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-4 text-center text-xs font-black text-kairos-navy">{entry.sharing}</td>
                                                                        <td className="p-4 text-right pr-6">
                                                                            {entry.sharing_pdf_url ? (
                                                                                <a href={entry.sharing_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-blue-500 hover:text-blue-700 font-black text-[10px]">
                                                                                    <span>VER PDF</span>
                                                                                    <ExternalLink size={10} />
                                                                                </a>
                                                                            ) : <span className="text-gray-200 text-[10px]">Sin adjunto</span>}
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                                {/* CP Row */}
                                                                {entry.cp > 0 && (
                                                                    <tr className="hover:bg-red-50/30 transition-colors">
                                                                        <td className="p-4 pl-6 text-xs text-gray-400 font-bold">{entry.date}</td>
                                                                        <td className="p-4">
                                                                            <span className="flex items-center space-x-2 text-[10px] font-black uppercase text-red-500">
                                                                                <Award size={12} />
                                                                                <span>Comunity Points (CP)</span>
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-4 text-center text-xs font-black text-kairos-navy">{entry.cp}</td>
                                                                        <td className="p-4 text-right pr-6">
                                                                            {entry.cp_pdf_url ? (
                                                                                <a href={entry.cp_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-blue-500 hover:text-blue-700 font-black text-[10px]">
                                                                                    <span>VER PDF</span>
                                                                                    <ExternalLink size={10} />
                                                                                </a>
                                                                            ) : <span className="text-gray-200 text-[10px]">Sin adjunto</span>}
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                        {auditLog[user.user]?.length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="p-10 text-center text-gray-300 italic text-sm">
                                                                    No hay registros detallados para este usuario.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
