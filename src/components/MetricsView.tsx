import React, { useMemo, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, BarChart, Bar, Cell
} from 'recharts';
import type { MetricEntry, Essay } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, Trophy, Star, Award, ChevronDown, ChevronUp, ExternalLink, Target, Clock, Share2, BookOpen, Maximize2, Minimize2, Filter, Calendar } from 'lucide-react';
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
    const [timeRange, setTimeRange] = useState<'all' | '30d' | '7d'>('all');
    const [visibleMetrics, setVisibleMetrics] = useState<string[]>(['lp', 'cp', 'cv']);

    // 1. Summary Stats
    const totals = useMemo(() => {
        const metricTotals = metrics.reduce((acc, m) => ({
            cv: acc.cv + (m.cv || 0),
            cp: acc.cp + (m.cp || 0),
            sharing: acc.sharing + (m.sharing || 0),
            revenue: acc.revenue + (m.revenue || 0),
            profit: acc.profit + (m.profit || 0),
            bp: acc.bp + (m.bp || 0),
        }), { cv: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, bp: 0 });

        const lpTotal = essays.reduce((acc, e) => acc + (e.points || 0), 0);

        return {
            ...metricTotals,
            lp: lpTotal + metricTotals.bp
        };
    }, [metrics, essays]);


    // 2. Evolution Data
    const evolutionData = useMemo(() => {
        const grouped: Record<string, any> = {};
        const now = new Date();
        const rangeDate = timeRange === '7d'
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
            : timeRange === '30d'
                ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
                : null;

        // Fill gaps if range is limited
        if (rangeDate) {
            let temp = new Date(rangeDate);
            while (temp <= new Date()) {
                const ds = temp.toISOString().split('T')[0];
                grouped[ds] = { date: ds, cv: 0, lp: 0, cp: 0, sharing: 0 };
                temp.setDate(temp.getDate() + 1);
            }
        }

        metrics.forEach(m => {
            const mDate = parseDate(m.date);
            if (rangeDate && mDate < rangeDate) return;

            const user = m.user_email.split('@')[0];
            if (evolutionUser !== 'team' && user !== evolutionUser) return;

            const ds = m.date;
            if (!grouped[ds]) grouped[ds] = { date: ds, cv: 0, lp: 0, cp: 0, sharing: 0 };
            grouped[ds].cv += m.cv || 0;
            grouped[ds].cp += m.cp || 0;
            grouped[ds].sharing += m.sharing || 0;
            grouped[ds].lp += m.bp || 0;
        });

        essays.forEach(e => {
            const eDate = parseDate(e.date);
            if (rangeDate && eDate < rangeDate) return;

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
    }, [metrics, essays, evolutionUser, timeRange]);
    const { userData, auditLog } = useMemo(() => {
        const grouped: Record<string, any> = {};
        const logs: Record<string, MetricEntry[]> = {};

        metrics.forEach(m => {
            const user = m.user_email.split('@')[0];
            if (!grouped[user]) {
                grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, cv_pdf_urls: [], sharing_pdf_urls: [], cp_pdf_urls: [], bp_pdf_urls: [] };
            }
            if (!logs[user]) logs[user] = [];

            grouped[user].cv += m.cv || 0;
            grouped[user].cp += m.cp || 0;
            grouped[user].sharing += m.sharing || 0;
            grouped[user].revenue += m.revenue || 0;
            grouped[user].profit += m.profit || 0;
            grouped[user].lp += m.bp || 0;
            if (m.cv_pdf_url && !grouped[user].cv_pdf_urls.includes(m.cv_pdf_url)) grouped[user].cv_pdf_urls.push(m.cv_pdf_url);
            if (m.sharing_pdf_url && !grouped[user].sharing_pdf_urls.includes(m.sharing_pdf_url)) grouped[user].sharing_pdf_urls.push(m.sharing_pdf_url);
            if (m.cp_pdf_url && !grouped[user].cp_pdf_urls.includes(m.cp_pdf_url)) grouped[user].cp_pdf_urls.push(m.cp_pdf_url);
            if (m.bp_pdf_url && !grouped[user].bp_pdf_urls.includes(m.bp_pdf_url)) grouped[user].bp_pdf_urls.push(m.bp_pdf_url);

            logs[user].push({ ...m, bp: m.bp || 0 });
        });

        essays.forEach(e => {
            const user = e.author.split('@')[0];
            if (!grouped[user]) {
                grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0, cv_pdf_urls: [], sharing_pdf_urls: [], cp_pdf_urls: [], bp_pdf_urls: [] };
            }
            if (!logs[user]) logs[user] = [];

            grouped[user].lp += e.points || 0;
            if (e.pdfUrl && !grouped[user].bp_pdf_urls.includes(e.pdfUrl)) {
                grouped[user].bp_pdf_urls.push(e.pdfUrl);
            }

            // Create a pseudo-metric entry for the audit log
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
                bp: e.points || 0,
                bp_title: e.title,
                bp_description: e.category,
                bp_pdf_url: e.pdfUrl
            });
        });

        const sortedUsers = Object.values(grouped).map((u: any) => ({
            ...u,
            finalLp: u.lp,
            totalScore: u.lp + u.cp + u.cv + u.sharing
        })).sort((a: any, b: any) => b.totalScore - a.totalScore);

        // Sort each user's log by date descending
        Object.keys(logs).forEach(u => {
            logs[u].sort((a, b) => {
                return parseDate(b.date).getTime() - parseDate(a.date).getTime();
            });
        });

        return { userData: sortedUsers, auditLog: logs };
    }, [metrics, essays]);


    const topPerformers = useMemo(() => userData.slice(0, 3), [userData]);

    // 4. Selected User Detail Data
    const selectedUserDetail = useMemo(() => {
        if (!selectedProfile) return null;

        const profileName = selectedProfile;
        const userMetrics = metrics.filter(m => m.user_email.split('@')[0] === profileName);
        const userEssays = essays.filter(e => e.author.split('@')[0] === profileName);

        // Agregate personal totals
        const stats = {
            cv: userMetrics.reduce((acc, m) => acc + (m.cv || 0), 0),
            cp: userMetrics.reduce((acc, m) => acc + (m.cp || 0), 0),
            lp: userEssays.reduce((acc, e) => acc + (e.points || 0), 0) + userMetrics.reduce((acc, m) => acc + (m.bp || 0), 0),
            sharing: userMetrics.reduce((acc, m) => acc + (m.sharing || 0), 0),
            revenue: userMetrics.reduce((acc, m) => acc + (m.revenue || 0), 0),
            profit: userMetrics.reduce((acc, m) => acc + (m.profit || 0), 0),
        };

        // Merged Timeline
        const timeline = [
            ...userMetrics.map(m => ({
                id: m.id,
                date: m.date,
                type: 'metric' as const,
                cv: m.cv,
                cp: m.cp,
                sharing: m.sharing,
                bp: m.bp,
                cv_pdf: m.cv_pdf_url,
                cp_pdf: m.cp_pdf_url,
                sharing_pdf: m.sharing_pdf_url,
                cv_title: m.cv_title,
                cv_desc: m.cv_description,
                sharing_title: m.sharing_title,
                sharing_desc: m.sharing_description,
                cp_title: m.cp_title,
                cp_desc: m.cp_description,
                bp_title: m.bp_title,
                rawDate: m.date
            })),
            ...userEssays.map(e => ({
                id: e.id,
                date: e.date,
                type: 'essay' as const,
                title: e.title,
                points: e.points,
                pdf: e.pdfUrl,
                category: e.category,
                contributionType: e.type,
                rawDate: e.date
            }))
        ].sort((a, b) => {
            return parseDate(b.rawDate).getTime() - parseDate(a.rawDate).getTime();
        });

        return { name: profileName, stats, timeline };
    }, [selectedProfile, metrics, essays]);

    if (selectedProfile && selectedUserDetail) {
        return (
            <div className="space-y-8 pb-20">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => setSelectedProfile(null)}
                            className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-kairos-navy hover:bg-gray-100 transition-colors shadow-sm"
                        >
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

                {/* Personal Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'VISITAS (CV)', value: selectedUserDetail.stats.cv, color: 'text-amber-500', bg: 'bg-amber-50' },
                        { label: 'LEARNING (LP)', value: selectedUserDetail.stats.lp, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { label: 'COMUNIDAD (CP)', value: selectedUserDetail.stats.cp, color: 'text-red-500', bg: 'bg-red-50' },
                        { label: 'SHARING', value: selectedUserDetail.stats.sharing, color: 'text-purple-500', bg: 'bg-purple-50' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`card p-6 border-none shadow-sm ${stat.bg} flex flex-col items-center text-center justify-center`}
                        >
                            <p className={`text-4xl font-heading font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                            <p className="text-[10px] uppercase tracking-widest font-black text-gray-500 mt-2 opacity-60">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Clockify Project Breakdown for Individual */}
                {(() => {
                    const target = selectedUserDetail.name;
                    const clockifyUser = clockifyData?.users.find(u => {
                        const expectedClockifyName = CLOCKIFY_USER_MAP[target];
                        const uName = u.userName.toLowerCase();
                        const uEmail = u.email.toLowerCase();

                        if (expectedClockifyName) {
                            const expected = expectedClockifyName.toLowerCase();
                            return uName === expected || uName.includes(expected) || expected.includes(uName);
                        }

                        const normalizedTarget = target.toLowerCase();
                        return uName.includes(normalizedTarget) || normalizedTarget.includes(uName) || uEmail.includes(normalizedTarget) || uEmail.startsWith(normalizedTarget);
                    });
                    if (!clockifyUser || clockifyUser.projects.length === 0) return null;

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Clock size={20} />
                                    </div>
                                    <h3 className="text-xl font-heading font-black text-kairos-navy">Distribución de Tiempo (Esta Semana)</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Semanal</p>
                                    <p className="text-xl font-black text-blue-600">
                                        {Math.floor(clockifyUser.totalTime / 3600)}h {Math.floor((clockifyUser.totalTime % 3600) / 60)}m
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {clockifyUser.projects.map((proj, idx) => {
                                    const percentage = (proj.time / clockifyUser.totalTime) * 100;
                                    const isExpanded = expandedProject === proj.projectName;

                                    return (
                                        <div key={idx} className="group/project">
                                            <button
                                                onClick={() => setExpandedProject(isExpanded ? null : proj.projectName)}
                                                className="w-full text-left bg-transparent hover:bg-gray-50/50 p-2 -m-2 rounded-xl transition-colors"
                                            >
                                                <div className="flex justify-between items-end mb-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs font-bold text-gray-700">{proj.projectName}</span>
                                                        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-400">{Math.floor(proj.time / 3600)}h {Math.floor((proj.time % 3600) / 60)}m ({percentage.toFixed(1)}%)</span>
                                                </div>
                                                <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: proj.color || '#3B82F6' }}
                                                    />
                                                </div>
                                            </button>

                                            <AnimatePresence>
                                                {isExpanded && proj.detailedEntries && proj.detailedEntries.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mt-3 ml-4 space-y-2 border-l-2 border-gray-100 pl-4 mb-4"
                                                    >
                                                        {proj.detailedEntries.map((entry, eIdx) => (
                                                            <div key={eIdx} className="flex justify-between items-start">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-bold text-gray-600 leading-tight">{entry.description}</span>
                                                                    <span className="text-[8px] text-gray-400 font-medium">{new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                                                </div>
                                                                <span className="text-[10px] font-black text-blue-600 whitespace-nowrap ml-4">
                                                                    {Math.floor(entry.time / 3600)}h {Math.floor((entry.time % 3600) / 60)}m
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </motion.div>
                                                )}
                                                {isExpanded && (!proj.detailedEntries || proj.detailedEntries.length === 0) && (
                                                    <motion.p
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="text-[10px] text-gray-400 italic mt-2 ml-8 mb-4"
                                                    >
                                                        No hay registros detallados disponibles.
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })()}

                {/* Combined Timeline */}
                <DocumentExplorer
                    title="Timeline de Actividad"
                    hideSearch={true}
                    currentUserEmail={currentUserEmail}
                    onSelectEssay={(id) => {
                        const essay = essays.find(e => e.id === id);
                        if (essay && onEditEssay) onEditEssay(essay);
                    }}
                    onDelete={(doc) => {
                        if (doc.type === 'tesis' && onDeleteEssay) {
                            onDeleteEssay(doc.id, doc.pdfUrl);
                        } else if (onDeleteMetric) {
                            onDeleteMetric(doc.id);
                        }
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
                    initialDocuments={selectedUserDetail.timeline.map(item => ({
                        id: item.id,
                        title: item.type === 'essay' ? (item as any).title :
                            ((item as any).cv > 0 ? (item as any).cv_title || 'Customer Visit' :
                                (item as any).sharing > 0 ? (item as any).sharing_title || 'Sharing' :
                                    (item as any).bp > 0 ? (item as any).bp_title || 'Learning Point (BP)' :
                                        (item as any).cp_title || 'Community Point'),
                        description: item.type === 'essay' ? (item as any).category :
                            ((item as any).cv > 0 ? (item as any).cv_desc :
                                (item as any).sharing > 0 ? (item as any).sharing_desc :
                                    (item as any).bp > 0 ? (item as any).bp_desc : (item as any).cp_desc),
                        author: selectedUserDetail.name + '@alumni.mondragon.edu', // Standard format
                        date: item.date,
                        category: item.type === 'essay' ? (item as any).category :
                            ((item as any).cv > 0 ? 'Comercial' :
                                (item as any).sharing > 0 ? 'Comunidad' :
                                    (item as any).bp > 0 ? 'Aprendizaje' : 'Iniciativa'),
                        pdfUrl: item.type === 'essay' ? (item as any).pdf :
                            ((item as any).cv_pdf || (item as any).sharing_pdf || (item as any).bp_pdf || (item as any).cp_pdf || ''),
                        type: item.type === 'essay' ? 'tesis' :
                            ((item as any).cv > 0 ? 'cv' :
                                (item as any).sharing > 0 ? 'sharing' :
                                    (item as any).bp > 0 ? 'bp' : 'cp'),
                        points: item.type === 'essay' ? `${(item as any).points} LP` :
                            ((item as any).cv > 0 ? `+${(item as any).cv} CV` :
                                (item as any).sharing > 0 ? `+${(item as any).sharing} SH` :
                                    (item as any).bp > 0 ? `+${(item as any).bp} BP` : `+${(item as any).cp} CP`),
                        isMetric: item.type !== 'essay'
                    }))}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* 1. Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'NUMERO CV', value: totals.cv, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'LEARNING POINTS (LP)', value: totals.lp, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'COMMUNITY POINTS (CP)', value: totals.cp, color: 'text-red-500', bg: 'bg-red-50' },
                    { label: 'NUMERO SHARING', value: totals.sharing, color: 'text-purple-500', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`card p-4 border-none shadow-sm ${stat.bg} flex flex-col items-center text-center justify-center hover:scale-105 transition-all duration-300`}
                    >
                        <p className={`text-2xl md:text-4xl font-heading font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                        <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-black text-gray-500 mt-2 opacity-60 leading-tight">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* 2. Top Performers Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topPerformers.map((user, i) => (
                    <motion.div
                        key={user.user}
                        onClick={() => setSelectedProfile(user.user)}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        className="bg-white rounded-3xl p-6 shadow-xl border-t-4 border-kairos-navy flex items-center space-x-6 relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all"
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
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card p-8 bg-white border-none shadow-xl evolution-card">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h3 className="text-xl font-heading font-black text-kairos-navy">
                                {evolutionUser === 'team' ? 'Evolución del Equipo' : `Trayectoria: ${evolutionUser}`}
                            </h3>
                            <p className="text-xs text-gray-400 font-medium">
                                {evolutionUser === 'team'
                                    ? 'Impacto colectivo acumulado por categorías.'
                                    : `Seguimiento individual de aportaciones.`}
                            </p>
                        </div>

                        <div className="flex items-center space-x-3 min-w-0 max-w-full">
                            <div className="flex-1 min-w-0 flex items-center bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100/50 backdrop-blur-sm overflow-hidden">
                                <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide no-scrollbar px-1">
                                    <button
                                        onClick={() => setEvolutionUser('team')}
                                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${evolutionUser === 'team' ? 'bg-kairos-navy text-white shadow-lg' : 'text-gray-400 hover:text-kairos-navy hover:bg-white'}`}
                                    >
                                        Global
                                    </button>
                                    <div className="w-[1px] h-4 bg-gray-200 mx-1 flex-shrink-0" />
                                    {userData.map((user) => (
                                        <button
                                            key={user.user}
                                            onClick={() => setEvolutionUser(user.user)}
                                            className={`flex-shrink-0 w-9 h-9 rounded-xl text-[11px] font-black uppercase transition-all duration-300 flex items-center justify-center relative ${evolutionUser === user.user ? 'bg-blue-600 text-white shadow-lg scale-110 z-10' : 'text-gray-400 hover:bg-white hover:text-blue-500'}`}
                                            title={user.user}
                                        >
                                            {user.user[0]}
                                            {evolutionUser === user.user && (
                                                <motion.div layoutId="activeBubble" className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => setIsChartExpanded(true)}
                                className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-kairos-navy hover:text-white transition-all shadow-sm flex-shrink-0"
                                title="Expandir gráfico"
                            >
                                <Maximize2 size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="h-72 w-full cursor-zoom-in" onClick={() => setIsChartExpanded(true)}>
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
                                <Area type="monotone" dataKey="lp" name="LEARNING POINTS" stroke={COLORS.lp} strokeWidth={3} fillOpacity={1} fill="url(#colorLP)" hide={!visibleMetrics.includes('lp')} />
                                <Area type="monotone" dataKey="cp" name="COMMUNITY POINTS" stroke={COLORS.cp} strokeWidth={3} fillOpacity={1} fill="url(#colorCP)" hide={!visibleMetrics.includes('cp')} />
                                <Area type="monotone" dataKey="cv" name="CUSTOMER VISITS" stroke={COLORS.cv} strokeWidth={3} fillOpacity={1} fill="url(#colorCV)" hide={!visibleMetrics.includes('cv')} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Focus Mode Overlay */}
                <AnimatePresence>
                    {isChartExpanded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl p-4 md:p-12 overflow-y-auto"
                        >
                            <div className="max-w-7xl mx-auto h-full flex flex-col">
                                <div className="flex items-center justify-between mb-12">
                                    <div>
                                        <h2 className="text-4xl font-heading font-black text-kairos-navy mb-2">
                                            {evolutionUser === 'team' ? 'Análisis Global' : `Foco: ${evolutionUser}`}
                                        </h2>
                                        <div className="flex items-center space-x-2 min-w-0 max-w-full">
                                            <div className="flex-1 min-w-0 flex items-center bg-gray-100/50 p-1 rounded-xl overflow-hidden">
                                                <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide no-scrollbar px-1">
                                                    <button
                                                        onClick={() => setEvolutionUser('team')}
                                                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${evolutionUser === 'team' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}
                                                    >
                                                        Global
                                                    </button>
                                                    {userData.map(user => (
                                                        <button
                                                            key={user.user}
                                                            onClick={() => setEvolutionUser(user.user)}
                                                            className={`flex-shrink-0 w-7 h-7 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center ${evolutionUser === user.user ? 'bg-blue-600 text-white scale-110' : 'text-gray-400 hover:text-blue-500'}`}
                                                        >
                                                            {user.user[0]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="text-gray-300 mx-2 flex-shrink-0">|</span>
                                            <p className="text-gray-400 font-medium truncate">Filtra y analiza tendencias detalladas.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsChartExpanded(false)}
                                        className="p-4 bg-gray-100 text-gray-600 rounded-3xl hover:bg-black hover:text-white transition-all shadow-xl"
                                    >
                                        <Minimize2 size={24} />
                                    </button>
                                </div>

                                {/* Advanced Filters Bar */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                    {/* Time Range */}
                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                        <label className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">
                                            <Calendar size={12} />
                                            <span>Rango Temporal</span>
                                        </label>
                                        <div className="flex space-x-2">
                                            {(['all', '30d', '7d'] as const).map(range => (
                                                <button
                                                    key={range}
                                                    onClick={() => setTimeRange(range)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${timeRange === range ? 'bg-black text-white' : 'bg-white text-gray-400 hover:text-black shadow-sm'}`}
                                                >
                                                    {range === 'all' ? 'Todo' : range === '30d' ? '30 días' : '7 días'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Metrics Toggle */}
                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 md:col-span-2">
                                        <label className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">
                                            <Filter size={12} />
                                            <span>Métricas Visibles</span>
                                        </label>
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { id: 'lp', name: 'Learning Points', color: COLORS.lp },
                                                { id: 'cp', name: 'Community Points', color: COLORS.cp },
                                                { id: 'cv', name: 'Customer Visits', color: COLORS.cv }
                                            ].map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setVisibleMetrics(prev =>
                                                        prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                                                    )}
                                                    className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all border-2 flex items-center space-x-2 ${visibleMetrics.includes(m.id) ? 'bg-white shadow-md' : 'bg-transparent border-gray-100 text-gray-300'}`}
                                                    style={{ borderColor: visibleMetrics.includes(m.id) ? m.color : 'transparent', color: visibleMetrics.includes(m.id) ? '#0F1D42' : undefined }}
                                                >
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                                                    <span>{m.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Chart */}
                                <div className="flex-grow min-h-[450px] bg-white rounded-[40px] p-8 shadow-2xl border border-gray-50 relative overflow-hidden">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={evolutionData}>
                                            <defs>
                                                <linearGradient id="colorLP_exp" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.lp} stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor={COLORS.lp} stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorCP_exp" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.cp} stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor={COLORS.cp} stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorCV_exp" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.cv} stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor={COLORS.cv} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="chartDate"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                                                padding={{ left: 20, right: 20 }}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '30px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', padding: '25px' }}
                                                itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '900', paddingTop: '30px' }} />
                                            <Area
                                                type="monotone"
                                                dataKey="lp"
                                                name="LEARNING POINTS"
                                                stroke={COLORS.lp}
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorLP_exp)"
                                                hide={!visibleMetrics.includes('lp')}
                                                animationDuration={1000}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="cp"
                                                name="COMMUNITY POINTS"
                                                stroke={COLORS.cp}
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorCP_exp)"
                                                hide={!visibleMetrics.includes('cp')}
                                                animationDuration={1000}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="cv"
                                                name="CUSTOMER VISITS"
                                                stroke={COLORS.cv}
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorCV_exp)"
                                                hide={!visibleMetrics.includes('cv')}
                                                animationDuration={1000}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                            <BarChart
                                data={userData}
                                layout="vertical"
                                onClick={(data) => {
                                    if (data && data.activeLabel) {
                                        setEvolutionUser(String(data.activeLabel));
                                        // Scroll to evolution chart if on mobile
                                        if (window.innerWidth < 1024) {
                                            document.querySelector('.evolution-card')?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="user"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: window.innerWidth < 768 ? 9 : 11, fill: '#0F1D42', fontWeight: 800 }}
                                    width={window.innerWidth < 768 ? 70 : 100}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '15px' }}
                                    cursor={{ fill: '#f8fafc', radius: 10 }}
                                />
                                <Legend iconType="rect" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', paddingTop: '20px' }} />
                                <Bar dataKey="lp" name="LP (Conocimiento)" stackId="a" fill={COLORS.lp} radius={evolutionUser === 'team' ? [4, 0, 0, 4] : 0} />
                                <Bar dataKey="cp" name="CP (Comunidad)" stackId="a" fill={COLORS.cp} />
                                <Bar dataKey="cv" name="CV (Visitas)" stackId="a" fill={COLORS.cv} radius={evolutionUser === 'team' ? [0, 4, 4, 0] : 0} />
                                {evolutionUser !== 'team' && (
                                    <Bar dataKey="totalScore" fill="transparent">
                                        {userData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                stroke={entry.user === evolutionUser ? '#3B82F6' : 'transparent'}
                                                strokeWidth={3}
                                                fill="transparent"
                                            />
                                        ))}
                                    </Bar>
                                )}
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
                    <div className="min-w-[1000px] lg:min-w-0">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                                    <th className="p-6 pl-10 border-b border-gray-100 italic">#</th>
                                    <th className="p-6 border-b border-gray-100">Miembro del Equipo</th>
                                    <th className="p-6 text-center border-b border-gray-100 bg-amber-50/30 text-amber-600">Visitas (CV)</th>
                                    <th className="p-6 text-center border-b border-gray-100 bg-blue-50/30 text-blue-600">Aprendizaje (LP)</th>
                                    <th className="p-6 text-center border-b border-gray-100 bg-red-50/30 text-red-600">Comunidad (CP)</th>
                                    <th className="p-6 text-center border-b border-gray-100 bg-kairos-navy/10 text-kairos-navy font-black">Score Total</th>
                                    <th className="p-6 text-center border-b border-gray-100 bg-blue-50/10 text-blue-800">Tiempo</th>
                                    <th className="p-6 text-center border-b border-gray-100">Justificantes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {userData.map((user, idx) => (
                                    <React.Fragment key={user.user}>
                                        <tr className="hover:bg-blue-50/30 transition-all group">
                                            <td className="p-6 pl-10">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black transition-all ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 group-hover:bg-kairos-navy group-hover:text-white'}`}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div
                                                    className="flex items-center space-x-4 cursor-pointer group/name"
                                                    onClick={() => setSelectedProfile(user.user)}
                                                >
                                                    <div className="w-10 h-10 rounded-2xl bg-kairos-navy text-white flex items-center justify-center font-black text-xs shadow-md group-hover:scale-110 transition-transform">
                                                        {user.user[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-kairos-navy leading-none mb-1 group-hover/name:text-blue-600 transition-colors">{user.user}</p>
                                                        <p className="text-[10px] text-gray-400 leading-none">@{user.user}.alumni...</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-6 text-center">
                                                <span className="text-lg font-black text-amber-600">{user.cv || '0'}</span>
                                            </td>

                                            <td className="p-6 text-center">
                                                <div
                                                    className={`flex flex-col items-center justify-center ${user.finalLp > 0 ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                                                    onClick={(e) => {
                                                        if (user.finalLp > 0) {
                                                            e.stopPropagation();
                                                            setExpandedLpUser(expandedLpUser === user.user ? null : user.user);
                                                            setExpandedTimeUser(null);
                                                        }
                                                    }}
                                                >
                                                    <span className="text-lg font-black text-blue-600">{user.finalLp || '0'}</span>
                                                    {user.finalLp > 0 && (
                                                        <span className="flex items-center space-x-1 mt-1 justify-center bg-blue-50 px-2 py-0.5 rounded-full">
                                                            <span className="text-[9px] uppercase font-black tracking-widest text-blue-500">Detalles</span>
                                                            {expandedLpUser === user.user ? <ChevronUp size={10} className="text-blue-500" /> : <ChevronDown size={10} className="text-blue-500" />}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-6 text-center">
                                                <span className="text-lg font-black text-red-500">{user.cp || '0'}</span>
                                            </td>


                                            <td className="p-6 text-center bg-gray-50/30">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xl font-black text-kairos-navy">{user.totalScore || '0'}</span>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">LP+CV+CP</span>
                                                </div>
                                            </td>

                                            <td className="p-6 text-center">
                                                {(() => {
                                                    const target = user.user;
                                                    const clockifyUser = clockifyData?.users.find(u => {
                                                        const expectedClockifyName = CLOCKIFY_USER_MAP[target];
                                                        const uName = u.userName.toLowerCase();
                                                        const uEmail = u.email.toLowerCase();

                                                        if (expectedClockifyName) {
                                                            const expected = expectedClockifyName.toLowerCase();
                                                            return uName === expected || uName.includes(expected) || expected.includes(uName);
                                                        }

                                                        const normalizedTarget = target.toLowerCase();
                                                        return uName.includes(normalizedTarget) || normalizedTarget.includes(uName) || uEmail.includes(normalizedTarget) || uEmail.startsWith(normalizedTarget);
                                                    });
                                                    if (!clockifyUser) return <span className="text-gray-300 text-[10px]">—</span>;
                                                    const hours = Math.floor(clockifyUser.totalTime / 3600);
                                                    const mins = Math.floor((clockifyUser.totalTime % 3600) / 60);
                                                    return (
                                                        <div
                                                            className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={(e) => { e.stopPropagation(); setExpandedTimeUser(expandedTimeUser === user.user ? null : user.user); setExpandedLpUser(null); }}
                                                        >
                                                            <span className="text-xl font-black text-blue-600">{hours}h {mins}m</span>
                                                            <span className="flex items-center space-x-1 mt-1 justify-center bg-blue-50 px-2 py-0.5 rounded-full">
                                                                <span className="text-[9px] uppercase font-black tracking-widest text-blue-500">Clockify</span>
                                                                {expandedTimeUser === user.user ? <ChevronUp size={10} className="text-blue-500" /> : <ChevronDown size={10} className="text-blue-500" />}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            <td className="p-6">
                                                <div className="flex flex-col items-center space-y-2">
                                                    {/* Grouped Vouchers Mini-Grid */}
                                                    <div className="flex items-center justify-center -space-x-2">
                                                        {(() => {
                                                            const groups = [
                                                                { type: 'cv', urls: user.cv_pdf_urls || [], bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: <Target size={12} /> },
                                                                { type: 'sh', urls: user.sharing_pdf_urls || [], bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', icon: <Share2 size={12} /> },
                                                                { type: 'cp', urls: user.cp_pdf_urls || [], bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-100', icon: <Award size={12} /> },
                                                                { type: 'lp', urls: user.bp_pdf_urls || [], bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: <BookOpen size={12} /> }
                                                            ].filter(g => g.urls.length > 0);

                                                            if (groups.length === 0) return <span className="text-gray-200 text-xs font-black opacity-20">—</span>;

                                                            return groups.map((group) => {
                                                                const count = group.urls.length;
                                                                return (
                                                                    <div key={group.type} className="relative group/voucher">
                                                                        <a
                                                                            href={group.urls[0]}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className={`w-9 h-9 flex items-center justify-center ${group.bg} ${group.text} rounded-xl border ${group.border} shadow-sm hover:scale-110 hover:z-20 transition-all relative`}
                                                                        >
                                                                            {group.icon}
                                                                            {count > 1 && (
                                                                                <span className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[8px] font-black border-2 border-white ${group.bg} ${group.text} shadow-sm`}>
                                                                                    {count}
                                                                                </span>
                                                                            )}
                                                                        </a>
                                                                        {/* Simple Hover Preview for more links in this category if many */}
                                                                        {count > 1 && (
                                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover/voucher:flex flex-col bg-white border border-gray-100 rounded-xl shadow-xl p-2 z-50 min-w-[120px] pointer-events-auto">
                                                                                <p className="text-[8px] font-black uppercase text-gray-400 mb-1 px-1">Justificantes {group.type.toUpperCase()}</p>
                                                                                {group.urls.map((url: string, uidx: number) => (
                                                                                    <a key={uidx} href={url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg truncate block">
                                                                                        Documento {uidx + 1}
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        <AnimatePresence>
                                            {expandedTimeUser === user.user && (
                                                <tr>
                                                    <td colSpan={8} className="p-0 border-b border-gray-100 bg-blue-50/10 overflow-hidden">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="p-6 md:p-8"
                                                        >
                                                            {(() => {
                                                                const target = user.user;
                                                                const clockifyUser = clockifyData?.users.find(u => {
                                                                    const expectedClockifyName = CLOCKIFY_USER_MAP[target];
                                                                    const uName = u.userName.toLowerCase();
                                                                    const uEmail = u.email.toLowerCase();
                                                                    if (expectedClockifyName) {
                                                                        const expected = expectedClockifyName.toLowerCase();
                                                                        return uName === expected || uName.includes(expected) || expected.includes(uName);
                                                                    }
                                                                    const normalizedTarget = target.toLowerCase();
                                                                    return uName.includes(normalizedTarget) || normalizedTarget.includes(uName) || uEmail.includes(normalizedTarget) || uEmail.startsWith(normalizedTarget);
                                                                });

                                                                if (!clockifyUser || clockifyUser.projects.length === 0) {
                                                                    return <p className="text-sm text-gray-500 italic text-center">No hay registros detallados de Clockify disponibles.</p>;
                                                                }

                                                                return (
                                                                    <div className="space-y-4 max-w-4xl mx-auto">
                                                                        {clockifyUser.projects.map((proj, pIdx) => {
                                                                            const percentage = (proj.time / clockifyUser.totalTime) * 100;
                                                                            const isExpanded = expandedProject === proj.projectName;

                                                                            return (
                                                                                <div key={pIdx} className="group/project">
                                                                                    <button
                                                                                        onClick={() => setExpandedProject(isExpanded ? null : proj.projectName)}
                                                                                        className="w-full text-left bg-transparent hover:bg-gray-50/50 p-2 -m-2 rounded-xl transition-colors"
                                                                                    >
                                                                                        <div className="flex justify-between items-end mb-1">
                                                                                            <div className="flex items-center space-x-2">
                                                                                                <span className="text-xs font-bold text-gray-700">{proj.projectName}</span>
                                                                                                <ChevronDown size={12} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                                            </div>
                                                                                            <span className="text-[10px] font-black text-gray-400">{Math.floor(proj.time / 3600)}h {Math.floor((proj.time % 3600) / 60)}m ({percentage.toFixed(1)}%)</span>
                                                                                        </div>
                                                                                        <div className="h-2 bg-gray-50 rounded-full overflow-hidden shrink-0">
                                                                                            <motion.div
                                                                                                initial={{ width: 0 }}
                                                                                                animate={{ width: `${percentage}%` }}
                                                                                                className="h-full rounded-full"
                                                                                                style={{ backgroundColor: proj.color || '#3B82F6' }}
                                                                                            />
                                                                                        </div>
                                                                                    </button>

                                                                                    <AnimatePresence>
                                                                                        {isExpanded && proj.detailedEntries && proj.detailedEntries.length > 0 && (
                                                                                            <motion.div
                                                                                                initial={{ opacity: 0, height: 0 }}
                                                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                                                exit={{ opacity: 0, height: 0 }}
                                                                                                className="mt-3 ml-4 space-y-2 border-l-2 border-gray-100 pl-4 mb-4"
                                                                                            >
                                                                                                {proj.detailedEntries.map((entry, eIdx) => (
                                                                                                    <div key={eIdx} className="flex justify-between items-start">
                                                                                                        <div className="flex flex-col">
                                                                                                            <div className="flex items-center space-x-2">
                                                                                                                <span className="text-[10px] font-bold text-gray-600 leading-tight">{entry.description || 'Sin descripción'}</span>
                                                                                                                {entry.tags && entry.tags.length > 0 && (
                                                                                                                    <div className="flex gap-1">
                                                                                                                        {entry.tags.map(tag => (
                                                                                                                            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-[8px] font-bold text-gray-500 rounded uppercase tracking-widest">{tag}</span>
                                                                                                                        ))}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <span className="text-[8px] text-gray-400 font-medium">{new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                                                                                        </div>
                                                                                                        <span className="text-[10px] font-black text-blue-600 whitespace-nowrap ml-4 mt-0.5">
                                                                                                            {Math.floor(entry.time / 3600)}h {Math.floor((entry.time % 3600) / 60)}m
                                                                                                        </span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </motion.div>
                                                                                        )}
                                                                                        {isExpanded && (!proj.detailedEntries || proj.detailedEntries.length === 0) && (
                                                                                            <motion.p
                                                                                                initial={{ opacity: 0 }}
                                                                                                animate={{ opacity: 1 }}
                                                                                                className="text-[10px] text-gray-400 italic mt-2 ml-8 mb-4"
                                                                                            >
                                                                                                No hay registros detallados disponibles.
                                                                                            </motion.p>
                                                                                        )}
                                                                                    </AnimatePresence>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                        <AnimatePresence>
                                            {expandedLpUser === user.user && (
                                                <tr>
                                                    <td colSpan={8} className="p-0 border-b border-gray-100 bg-blue-50/10 overflow-hidden">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="p-6 md:p-8"
                                                        >
                                                            {(() => {
                                                                const userLogs = auditLog[user.user] || [];
                                                                const lpEntries = userLogs.filter(log => log.bp > 0);

                                                                if (lpEntries.length === 0) {
                                                                    return <p className="text-sm text-gray-500 italic text-center">No hay registros detallados de LP disponibles.</p>;
                                                                }

                                                                return (
                                                                    <div className="space-y-4 max-w-4xl mx-auto">
                                                                        <h4 className="text-sm font-black text-blue-800 mb-4 px-2">Desglose de APRENDIZAJE (LP)</h4>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            {lpEntries.map((log, idx) => (
                                                                                <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between">
                                                                                    <div>
                                                                                        <div className="flex justify-between items-start mb-2">
                                                                                            <span className="text-xs font-black text-kairos-navy leading-tight pr-2">{log.bp_title || 'Registro LP'}</span>
                                                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 font-black text-xs rounded-lg whitespace-nowrap">+{log.bp} LP</span>
                                                                                        </div>
                                                                                        <p className="text-[10px] text-gray-500 line-clamp-2 md:line-clamp-3 leading-relaxed">{log.bp_description || 'Sin descripción'}</p>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                                                                                        <span className="text-[9px] font-bold text-gray-400">{new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                                                        {log.bp_pdf_url && (
                                                                                            <a href={log.bp_pdf_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded-md">
                                                                                                <BookOpen size={10} />
                                                                                                <span>Ver Documento</span>
                                                                                            </a>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                                                        {(() => {
                                                            const userEntries = auditLog[user.user] || [];
                                                            let currentMonth = '';

                                                            return userEntries.map((entry) => {
                                                                const dateParts = entry.date.split('/');
                                                                const monthYear = dateParts.length === 3 ?
                                                                    new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) :
                                                                    'Fecha desconocida';

                                                                const showHeader = monthYear !== currentMonth;
                                                                currentMonth = monthYear;

                                                                return (
                                                                    <React.Fragment key={entry.id}>
                                                                        {showHeader && (
                                                                            <tr className="bg-gray-50/30">
                                                                                <td colSpan={4} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-kairos-navy/40">
                                                                                    {monthYear}
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                        {/* CV Row */}
                                                                        {entry.cv > 0 && (
                                                                            <tr className="hover:bg-amber-50/30 transition-colors">
                                                                                <td className="p-4 pl-6 text-xs text-gray-400 font-bold">{entry.date}</td>
                                                                                <td className="p-4">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="flex items-center space-x-2 text-[10px] font-black uppercase text-amber-600">
                                                                                            <Target size={12} />
                                                                                            <span>Customer Visit (CV)</span>
                                                                                        </span>
                                                                                        {entry.cv_title && <span className="text-[10px] font-bold text-gray-700 mt-1">{entry.cv_title}</span>}
                                                                                    </div>
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
                                                                                    <div className="flex flex-col">
                                                                                        <span className="flex items-center space-x-2 text-[10px] font-black uppercase text-purple-600">
                                                                                            <Users size={12} />
                                                                                            <span>Sharing</span>
                                                                                        </span>
                                                                                        {entry.sharing_title && <span className="text-[10px] font-bold text-gray-700 mt-1">{entry.sharing_title}</span>}
                                                                                    </div>
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
                                                                                    <div className="flex flex-col">
                                                                                        <span className="flex items-center space-x-2 text-[10px] font-black uppercase text-red-500">
                                                                                            <Award size={12} />
                                                                                            <span>Community Points (CP)</span>
                                                                                        </span>
                                                                                        {entry.cp_title && <span className="text-[10px] font-bold text-gray-700 mt-1">{entry.cp_title}</span>}
                                                                                    </div>
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
                                                                        {/* LP/BP Row */}
                                                                        {entry.bp > 0 && (
                                                                            <tr className="hover:bg-blue-50/30 transition-colors">
                                                                                <td className="p-4 pl-6 text-xs text-gray-400 font-bold">{entry.date}</td>
                                                                                <td className="p-4">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="flex items-center space-x-2 text-[10px] font-black uppercase text-blue-600">
                                                                                            <BookOpen size={12} />
                                                                                            <span>Learning Points (LP)</span>
                                                                                        </span>
                                                                                        {entry.bp_title && <span className="text-[10px] font-bold text-gray-700 mt-1">{entry.bp_title}</span>}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="p-4 text-center text-xs font-black text-kairos-navy">{entry.bp}</td>
                                                                                <td className="p-4 text-right pr-6">
                                                                                    {entry.bp_pdf_url ? (
                                                                                        <a href={entry.bp_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-blue-500 hover:text-blue-700 font-black text-[10px]">
                                                                                            <span>VER PDF</span>
                                                                                            <ExternalLink size={10} />
                                                                                        </a>
                                                                                    ) : <span className="text-gray-200 text-[10px]">Sin adjunto</span>}
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </React.Fragment>
                                                                );
                                                            });
                                                        })()}
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
