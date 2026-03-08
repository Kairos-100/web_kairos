import React, { useMemo, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, Maximize2, Minimize2, Calendar, Filter
} from 'recharts';
import type { MetricEntry, Essay } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, Trophy, Star, Award, ChevronDown, ChevronUp, ExternalLink, Target, Clock, Share2, BookOpen } from 'lucide-react';
import { DocumentExplorer } from './DocumentExplorer';
import { parseDate } from '../lib/dates';
import type { ClockifyUserTime, ClockifyProjectSummary } from '../lib/clockify';
import { CLOCKIFY_USER_MAP } from '../constants';

interface MetricsViewProps {
    metrics: MetricEntry[];
    essays: Essay[];
    clockifyData: {
        users: ClockifyUserTime[];
        projects: ClockifyProjectSummary[];
        totalTime: number;
    } | null;
    currentUserEmail?: string | null;
    onEditEssay?: (essay: Essay) => void;
    onDeleteEssay?: (id: string, pdfUrl?: string) => void;
    onEditMetric?: (metric: MetricEntry) => void;
    onDeleteMetric?: (id: string) => void;
}

const COLORS = {
    cv: '#F59E0B',
    lp: '#3B82F6',
    cp: '#EF4444',
    sharing: '#8B5CF6',
    revenue: '#10B981',
    profit: '#059669',
};

export const MetricsView: React.FC<MetricsViewProps> = ({
    metrics,
    essays,
    clockifyData,
    currentUserEmail,
    onEditEssay,
    onDeleteEssay,
    onEditMetric,
    onDeleteMetric
}) => {
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const [expandedTimeUser, setExpandedTimeUser] = useState<string | null>(null);
    const [expandedLpUser, setExpandedLpUser] = useState<string | null>(null);
    const [evolutionUser, setEvolutionUser] = useState<string>('team');
    const [isChartExpanded, setIsChartExpanded] = useState(false);
    const [timeRange, setTimeRange] = useState<'all' | '7d' | '30d' | '90d' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [visibleMetrics, setVisibleMetrics] = useState<string[]>(['lp', 'cp', 'cv']);

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
        const now = new Date();

        let rangeStartDate: Date | null = null;
        let rangeEndDate: Date | null = new Date();

        if (timeRange === '7d') {
            rangeStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        } else if (timeRange === '30d') {
            rangeStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        } else if (timeRange === '90d') {
            rangeStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
        } else if (timeRange === 'custom' && customStartDate) {
            rangeStartDate = parseDate(customStartDate);
            if (customEndDate) rangeEndDate = parseDate(customEndDate);
        }

        if (rangeStartDate && rangeEndDate) {
            let temp = new Date(rangeStartDate);
            while (temp <= rangeEndDate) {
                const ds = temp.toISOString().split('T')[0];
                grouped[ds] = { date: ds, cv: 0, lp: 0, cp: 0, sharing: 0 };
                temp.setDate(temp.getDate() + 1);
            }
        }

        metrics.forEach(m => {
            const mDate = parseDate(m.date);
            if (rangeStartDate && mDate < rangeStartDate) return;
            if (rangeEndDate && mDate > rangeEndDate) return;

            const user = m.user_email.split('@')[0];
            if (evolutionUser !== 'team' && user !== evolutionUser) return;

            const ds = m.date;
            if (!grouped[ds]) grouped[ds] = { date: ds, cv: 0, lp: 0, cp: 0, sharing: 0 };
            grouped[ds].cv += m.cv || 0;
            grouped[ds].cp += m.cp || 0;
            grouped[ds].sharing += m.sharing || 0;
        });

        essays.forEach(e => {
            const eDate = parseDate(e.date);
            if (rangeStartDate && eDate < rangeStartDate) return;
            if (rangeEndDate && eDate > rangeEndDate) return;

            const user = e.author.split('@')[0];
            if (evolutionUser !== 'team' && user !== evolutionUser) return;

            const ds = e.date;
            if (!grouped[ds]) grouped[ds] = { date: ds, cv: 0, lp: 0, cp: 0, sharing: 0 };
            grouped[ds].lp += e.points || 0;
        });

        return Object.values(grouped).sort((a: any, b: any) => {
            return parseDate(a.date).getTime() - parseDate(b.date).getTime();
        }).map((item: any) => {
            const dateObj = parseDate(item.date);
            return {
                ...item,
                chartDate: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
            };
        });
    }, [metrics, essays, evolutionUser, timeRange, customStartDate, customEndDate]);

    const { userData, auditLog } = useMemo(() => {
        const grouped: Record<string, any> = {};
        const logs: Record<string, any[]> = {};

        metrics.forEach(m => {
            const user = m.user_email.split('@')[0];
            if (!grouped[user]) {
                grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, cv_pdf_urls: [], sharing_pdf_urls: [], cp_pdf_urls: [] };
            }
            if (!logs[user]) logs[user] = [];

            grouped[user].cv += m.cv || 0;
            grouped[user].cp += m.cp || 0;
            grouped[user].sharing += m.sharing || 0;
            grouped[user].revenue += m.revenue || 0;
            grouped[user].profit += m.profit || 0;

            if (m.cv_pdf_url && !grouped[user].cv_pdf_urls.includes(m.cv_pdf_url)) grouped[user].cv_pdf_urls.push(m.cv_pdf_url);
            if (m.sharing_pdf_url && !grouped[user].sharing_pdf_urls.includes(m.sharing_pdf_url)) grouped[user].sharing_pdf_urls.push(m.sharing_pdf_url);
            if (m.cp_pdf_url && !grouped[user].cp_pdf_urls.includes(m.cp_pdf_url)) grouped[user].cp_pdf_urls.push(m.cp_pdf_url);

            logs[user].push({ ...m });
        });

        essays.forEach(e => {
            const user = e.author.split('@')[0];
            if (!grouped[user]) {
                grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, cv_pdf_urls: [], sharing_pdf_urls: [], cp_pdf_urls: [] };
            }
            if (!logs[user]) logs[user] = [];

            grouped[user].lp += e.points || 0;

            logs[user].push({
                id: e.id,
                created_at: new Date().toISOString(),
                user_email: e.author,
                date: e.date,
                cv: 0,
                cp: 0,
                sharing: 0,
                revenue: 0,
                profit: 0,
                type: 'essay',
                title: e.title,
                points: e.points,
                pdfUrl: e.pdfUrl
            });
        });

        const sortedUsers = Object.values(grouped).map((u: any) => ({
            ...u,
            totalScore: u.lp + u.cp + u.cv + u.sharing
        })).sort((a: any, b: any) => b.totalScore - a.totalScore);

        Object.keys(logs).forEach(u => {
            logs[u].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
        });

        return { userData: sortedUsers, auditLog: logs };
    }, [metrics, essays]);

    const topPerformers = useMemo(() => userData.slice(0, 3), [userData]);

    const selectedUserDetail = useMemo(() => {
        if (!selectedProfile) return null;

        const profileName = selectedProfile;
        const userMetrics = metrics.filter(m => m.user_email.split('@')[0] === profileName);
        const userEssays = essays.filter(e => e.author.split('@')[0] === profileName);

        const stats = {
            cv: userMetrics.reduce((acc, m) => acc + (m.cv || 0), 0),
            cp: userMetrics.reduce((acc, m) => acc + (m.cp || 0), 0),
            lp: userEssays.reduce((acc, e) => acc + (e.points || 0), 0),
            sharing: userMetrics.reduce((acc, m) => acc + (m.sharing || 0), 0),
            revenue: userMetrics.reduce((acc, m) => acc + (m.revenue || 0), 0),
            profit: userMetrics.reduce((acc, m) => acc + (m.profit || 0), 0),
        };

        const timeline = [
            ...userMetrics.map(m => ({
                ...m,
                type: 'metric' as const,
                rawDate: m.date
            })),
            ...userEssays.map(e => ({
                ...e,
                type: 'essay' as const,
                rawDate: e.date
            }))
        ].sort((a, b) => parseDate(b.rawDate).getTime() - parseDate(a.rawDate).getTime());

        return { name: profileName, stats, timeline };
    }, [selectedProfile, metrics, essays]);

    if (selectedProfile && selectedUserDetail) {
        return (
            <div className="space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-6">
                        <button onClick={() => setSelectedProfile(null)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-kairos-navy hover:bg-gray-100 transition-colors shadow-sm">
                            <ChevronDown className="rotate-90" size={24} />
                        </button>
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-kairos-navy to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                {selectedUserDetail.name[0].toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-3xl font-heading font-black text-kairos-navy leading-none mb-1">{selectedUserDetail.name}</h2>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest opacity-60">Ficha Personal Kairense</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'VISITAS (CV)', value: selectedUserDetail.stats.cv, color: 'text-amber-500', bg: 'bg-amber-50' },
                        { label: 'LEARNING (LP)', value: selectedUserDetail.stats.lp, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { label: 'COMUNIDAD (CP)', value: selectedUserDetail.stats.cp, color: 'text-red-500', bg: 'bg-red-50' },
                        { label: 'SHARING', value: selectedUserDetail.stats.sharing, color: 'text-purple-500', bg: 'bg-purple-50' },
                    ].map((stat, i) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`card p-6 border-none shadow-sm ${stat.bg} flex flex-col items-center text-center justify-center`}>
                            <p className={`text-4xl font-heading font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                            <p className="text-[10px] uppercase tracking-widest font-black text-gray-500 mt-2 opacity-60">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                <DocumentExplorer
                    title="Timeline de Actividad"
                    hideSearch={true}
                    currentUserEmail={currentUserEmail}
                    onDelete={(doc) => {
                        if (doc.type === 'tesis' && onDeleteEssay) onDeleteEssay(doc.id, doc.pdfUrl);
                        else if (onDeleteMetric) onDeleteMetric(doc.id);
                    }}
                    onEdit={(doc) => {
                        if (doc.type === 'tesis' && onEditEssay) {
                            const essay = essays.find(e => e.id === doc.id);
                            if (essay) onEditEssay(essay);
                        } else if (onEditMetric) {
                            const metric = metrics.find(m => m.id === doc.id);
                            if (metric) onEditMetric(metric);
                        }
                    }}
                    initialDocuments={selectedUserDetail.timeline.map((item: any) => ({
                        id: item.id,
                        title: item.type === 'essay' ? item.title : (item.cv > 0 ? 'Customer Visit' : item.sharing > 0 ? 'Sharing' : 'Community Point'),
                        description: item.type === 'essay' ? item.category : (item.cp_description || ''),
                        author: selectedUserDetail.name,
                        date: item.date,
                        category: item.type === 'essay' ? 'Aprendizaje' : (item.cv > 0 ? 'Comercial' : 'Comunidad'),
                        pdfUrl: item.type === 'essay' ? item.pdfUrl : (item.cv_pdf_url || item.sharing_pdf_url || item.cp_pdf_url || ''),
                        type: item.type === 'essay' ? 'tesis' : (item.cv > 0 ? 'cv' : item.sharing > 0 ? 'sharing' : 'cp'),
                        points: item.type === 'essay' ? `${item.points} LP` : (item.cv > 0 ? `+${item.cv} CV` : item.sharing > 0 ? `+${item.sharing} SH` : `+${item.cp} CP`),
                        isMetric: item.type !== 'essay'
                    }))}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'NUMERO CV', value: totals.cv, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'LEARNING (LP)', value: totals.lp, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'COMMUNITY (CP)', value: totals.cp, color: 'text-red-500', bg: 'bg-red-50' },
                    { label: 'SHARING', value: totals.sharing, color: 'text-purple-500', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`card p-4 border-none shadow-sm ${stat.bg} flex flex-col items-center text-center justify-center hover:scale-105 transition-all duration-300`}>
                        <p className={`text-2xl md:text-4xl font-heading font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                        <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-black text-gray-500 mt-2 opacity-60 leading-tight">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topPerformers.map((user, i) => (
                    <motion.div key={user.user} onClick={() => setSelectedProfile(user.user)} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + (i * 0.1) }} className="bg-white rounded-3xl p-6 shadow-xl border-t-4 border-kairos-navy flex items-center space-x-6 relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all">
                        <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
                            {i === 0 ? <Trophy size={100} /> : <Award size={100} />}
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-kairos-navy to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                            {user.user[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{i === 0 ? 'Líder Absoluto' : `Top ${i + 1} Kairos`}</p>
                            <h4 className="text-xl font-heading font-bold text-kairos-navy -mt-1">{user.user}</h4>
                            <div className="flex items-center space-x-3 mt-1">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{user.lp} LP</span>
                                <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">{user.cv} CV</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card p-8 bg-white shadow-xl">
                    <h3 className="text-xl font-heading font-black text-kairos-navy mb-4">Evolución del Equipo</h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="chartDate" hide />
                                <YAxis hide />
                                <Tooltip />
                                <Area type="monotone" dataKey="lp" stroke={COLORS.lp} fill={COLORS.lp} fillOpacity={0.1} />
                                <Area type="monotone" dataKey="cv" stroke={COLORS.cv} fill={COLORS.cv} fillOpacity={0.1} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
