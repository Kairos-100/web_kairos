import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Trophy,
    Star,
    Award,
    ChevronDown,
    Share2,
    Target,
    Zap,
    BookOpen,
    Clock
} from 'lucide-react';
import type { MetricEntry, Essay } from '../constants';
import { DocumentExplorer, type UnifiedDocument } from './DocumentExplorer';
import type { ClockifyUserTime, ClockifyProjectSummary } from '../lib/clockify';
import { CLOCKIFY_USER_MAP } from '../constants';
import { ReportPanel } from './ReportPanel';

interface TeamViewProps {
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
    cv: 'text-amber-500',
    cvBg: 'bg-amber-50',
    lp: 'text-blue-500',
    lpBg: 'bg-blue-50',
    cp: 'text-red-500',
    cpBg: 'bg-red-50',
    sh: 'text-purple-500',
    shBg: 'bg-purple-50',
};

export const TeamView: React.FC<TeamViewProps> = ({
    metrics,
    essays,
    clockifyData,
    currentUserEmail,
    onEditEssay,
    onDeleteEssay,
    onEditMetric,
    onDeleteMetric
}) => {
    const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'cv' | 'lp' | 'cp' | 'sh'>('all');

    // Aggregate User Data
    const userData = useMemo(() => {
        const grouped: Record<string, any> = {};

        metrics.forEach(m => {
            const user = m.user_email.split('@')[0];
            if (!grouped[user]) {
                grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0 };
            }
            grouped[user].cv += m.cv || 0;
            grouped[user].cp += m.cp || 0;
            grouped[user].sharing += m.sharing || 0;
            grouped[user].revenue += m.revenue || 0;
            grouped[user].profit += m.profit || 0;
        });

        essays.forEach(e => {
            const user = e.author.split('@')[0];
            if (!grouped[user]) {
                grouped[user] = { user, cv: 0, lp: 0, cp: 0, sharing: 0, revenue: 0, profit: 0 };
            }
            grouped[user].lp += e.points || 0;
        });

        return Object.values(grouped).sort((a: any, b: any) =>
            (b.lp + b.cp + b.cv + b.sharing) - (a.lp + a.cp + a.cv + a.sharing)
        );
    }, [metrics, essays]);
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
        };

        const timeline = [
            ...userMetrics.map(m => ({
                id: m.id,
                date: m.date,
                type: 'metric' as const,
                cv: m.cv,
                cp: m.cp,
                sharing: m.sharing,
                cv_pdf: m.cv_pdf_url,
                cp_pdf: m.cp_pdf_url,
                sharing_pdf: m.sharing_pdf_url,
                cv_title: m.cv_title,
                cv_desc: m.cv_description,
                sharing_title: m.sharing_title,
                sharing_desc: m.sharing_description,
                cp_title: m.cp_title,
                cp_desc: m.cp_description,
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
            const [d1, m1, y1] = a.rawDate.split('/').map(Number);
            const [d2, m2, y2] = b.rawDate.split('/').map(Number);
            return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
        });

        const filteredTimeline = timeline.filter(item => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'cv') return item.type === 'metric' && item.cv > 0;
            if (activeFilter === 'lp') return item.type === 'essay';
            if (activeFilter === 'cp') return item.type === 'metric' && item.cp > 0;
            if (activeFilter === 'sh') return item.type === 'metric' && item.sharing > 0;
            return false;
        });

        return { name: profileName, stats, timeline: filteredTimeline };
    }, [selectedProfile, metrics, essays, activeFilter]);

    if (selectedProfile && selectedUserDetail) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 pb-20"
            >
                {/* Profile Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => { setSelectedProfile(null); setActiveFilter('all'); }}
                            className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-kairos-navy hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <ChevronDown className="rotate-90" size={24} />
                        </button>
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-kairos-navy to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                {selectedUserDetail.name[0].toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-3xl font-heading font-black text-kairos-navy leading-none mb-1">{selectedUserDetail.name}</h2>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest opacity-60">Actividad del Kairense</p>
                            </div>
                        </div>
                    </div>

                    {activeFilter !== 'all' && (
                        <button
                            onClick={() => setActiveFilter('all')}
                            className="px-4 py-2 bg-kairos-navy text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm flex items-center space-x-2"
                        >
                            <span>Ver todo el historial</span>
                        </button>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { id: 'cv', label: 'VISITAS (CV)', value: selectedUserDetail.stats.cv, color: COLORS.cv, bg: COLORS.cvBg, icon: Users },
                        { id: 'lp', label: 'LEARNING (LP)', value: selectedUserDetail.stats.lp, color: COLORS.lp, bg: COLORS.lpBg, icon: BookOpen },
                        { id: 'cp', label: 'COMUNIDAD (CP)', value: selectedUserDetail.stats.cp, color: COLORS.cp, bg: COLORS.cpBg, icon: Target },
                        { id: 'sh', label: 'SHARING', value: selectedUserDetail.stats.sharing, color: COLORS.sh, bg: COLORS.shBg, icon: Share2 },
                    ].map((stat, i) => (
                        <motion.button
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setActiveFilter(activeFilter === stat.id ? 'all' : stat.id as any)}
                            className={`p-6 border-2 transition-all rounded-[32px] flex flex-col items-center text-center justify-center relative overflow-hidden ${activeFilter === stat.id
                                ? `border-current ${stat.color} ${stat.bg} shadow-lg scale-[1.02] z-10`
                                : `border-transparent ${stat.bg} hover:border-gray-200 opacity-80 hover:opacity-100`
                                }`}
                        >
                            {activeFilter === stat.id && (
                                <motion.div
                                    layoutId="activeFilterGlow"
                                    className="absolute inset-0 bg-white/40 blur-2xl"
                                />
                            )}
                            <stat.icon className={`${stat.color} mb-2 relative z-10`} size={20} />
                            <p className={`text-4xl font-heading font-black tracking-tighter ${stat.color} relative z-10`}>{stat.value}</p>
                            <p className="text-[10px] uppercase tracking-widest font-black text-gray-500 mt-2 opacity-60 relative z-10">{stat.label}</p>
                        </motion.button>
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
                            return uName === expected || uName.includes(expected) || expected.includes(uName) || uEmail.includes(expected);
                        }

                        const normalizedTarget = target.toLowerCase();
                        return uName.includes(normalizedTarget) || normalizedTarget.includes(uName) || uEmail.includes(normalizedTarget);
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
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-xs font-bold text-gray-700">{proj.projectName}</span>
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
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })()}

                {/* Timeline */}
                <DocumentExplorer
                    title="Timeline de Actividad"
                    hideSearch={true}
                    currentUserEmail={currentUserEmail}
                    onSelectEssay={(id: string) => {
                        const essay = essays.find(e => e.id === id);
                        if (essay && onEditEssay) onEditEssay(essay);
                    }}
                    onDelete={(doc: UnifiedDocument) => {
                        if (doc.type === 'tesis' && onDeleteEssay) {
                            onDeleteEssay(doc.id, doc.pdfUrl);
                        } else if (onDeleteMetric) {
                            onDeleteMetric(doc.id);
                        }
                    }}
                    onEdit={(doc: UnifiedDocument) => {
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
                                    (item as any).cp_title || 'Community Point'),
                        description: item.type === 'essay' ? (item as any).category :
                            ((item as any).cv > 0 ? (item as any).cv_desc :
                                (item as any).sharing > 0 ? (item as any).sharing_desc : (item as any).cp_desc),
                        author: selectedUserDetail.name + '@alumni.mondragon.edu', // Standard format
                        date: item.date,
                        category: item.type === 'essay' ? (item as any).category :
                            ((item as any).cv > 0 ? 'Comercial' :
                                (item as any).sharing > 0 ? 'Comunidad' : 'Iniciativa'),
                        pdfUrl: item.type === 'essay' ? (item as any).pdf :
                            ((item as any).cv_pdf || (item as any).sharing_pdf || (item as any).cp_pdf || ''),
                        type: item.type === 'essay' ? 'tesis' :
                            ((item as any).cv > 0 ? 'cv' :
                                (item as any).sharing > 0 ? 'sharing' : 'cp'),
                        points: item.type === 'essay' ? `${(item as any).points} LP` :
                            ((item as any).cv > 0 ? `+${(item as any).cv} CV` :
                                (item as any).sharing > 0 ? `+${(item as any).sharing} SH` : `+${(item as any).cp} CP`),
                        isMetric: item.type !== 'essay'
                    }))}
                />
            </motion.div>
        );
    }

    return (
        <div className="space-y-12 pb-20">
            <ReportPanel metrics={metrics} essays={essays} clockifyUsers={clockifyData?.users || []} />

            {/* Top Performers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {userData.slice(0, 3).map((user, i) => (
                    <motion.div
                        key={user.user}
                        onClick={() => setSelectedProfile(user.user)}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
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
                                {i === 0 ? <Star size={12} fill="currentColor" /> : <Zap size={12} />}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                {i === 0 ? 'Líder del Equipo' : `Destacado Top ${i + 1}`}
                            </p>
                            <h4 className="text-xl font-heading font-bold text-kairos-navy -mt-1">{user.user}</h4>
                            <div className="flex items-center space-x-3 mt-1">
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{user.lp} LP</span>
                                <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">{user.cv} CV</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Team List Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden"
            >
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-kairos-navy text-white">
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <Users size={24} className="text-blue-400" />
                            <h3 className="text-2xl font-heading font-black">Miembros del Equipo</h3>
                        </div>
                        <p className="text-sm opacity-60">Seguimiento de aportaciones individuales</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                                <th className="p-6 pl-10 border-b border-gray-100 italic">#</th>
                                <th className="p-6 border-b border-gray-100">Miembro</th>
                                <th className="p-6 text-center border-b border-gray-100 bg-amber-50/30 text-amber-600">CV</th>
                                <th className="p-6 text-center border-b border-gray-100 bg-emerald-50/30 text-emerald-600">Fact.</th>
                                <th className="p-6 text-center border-b border-gray-100 bg-emerald-50/10 text-emerald-800">Benef.</th>
                                <th className="p-6 text-center border-b border-gray-100 bg-blue-50/30 text-blue-600">LP</th>
                                <th className="p-6 text-center border-b border-gray-100 bg-red-50/30 text-red-600">CP</th>
                                <th className="p-6 text-center border-b border-gray-100 bg-purple-50/30 text-purple-600">SH</th>
                                <th className="p-6 text-center border-b border-gray-100 bg-blue-50/10 text-blue-800">TIEMPO</th>
                                <th className="p-6 text-center border-b border-gray-100">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {userData.map((user, idx) => (
                                <tr
                                    key={user.user}
                                    className="hover:bg-blue-50/30 transition-all group cursor-pointer"
                                    onClick={() => setSelectedProfile(user.user)}
                                >
                                    <td className="p-6 pl-10">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 group-hover:bg-kairos-navy group-hover:text-white'}`}>
                                            {idx + 1}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-2xl bg-kairos-navy text-white flex items-center justify-center font-black text-xs">
                                                {user.user[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-kairos-navy group-hover:text-blue-600 transition-colors">{user.user}</p>
                                                <p className="text-[10px] text-gray-400">@{user.user}.alumni</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center font-black text-amber-600">{user.cv}</td>
                                    <td className="p-6 text-center font-black text-emerald-600">
                                        <span className="text-[10px] opacity-40 mr-0.5">€</span>
                                        {user.revenue.toLocaleString('es-ES')}
                                    </td>
                                    <td className="p-6 text-center font-black text-emerald-800">
                                        <span className="text-[10px] opacity-40 mr-0.5">€</span>
                                        {user.profit.toLocaleString('es-ES')}
                                    </td>
                                    <td className="p-6 text-center font-black text-blue-600">{user.lp}</td>
                                    <td className="p-6 text-center font-black text-red-600">{user.cp}</td>
                                    <td className="p-6 text-center font-black text-purple-600">{user.sharing}</td>
                                    <td className="p-6 text-center">
                                        {(() => {
                                            const target = user.user;
                                            const clockifyUser = clockifyData?.users.find(u => {
                                                const expectedClockifyName = CLOCKIFY_USER_MAP[target];
                                                const uName = u.userName.toLowerCase();
                                                const uEmail = u.email.toLowerCase();

                                                if (expectedClockifyName) {
                                                    const expected = expectedClockifyName.toLowerCase();
                                                    return uName === expected || uName.includes(expected) || expected.includes(uName) || uEmail.includes(expected);
                                                }

                                                const normalizedTarget = target.toLowerCase();
                                                return uName.includes(normalizedTarget) || normalizedTarget.includes(uName) || uEmail.includes(normalizedTarget);
                                            });
                                            if (!clockifyUser) return <span className="text-gray-300 text-[10px]">—</span>;
                                            const hours = Math.floor(clockifyUser.totalTime / 3600);
                                            const mins = Math.floor((clockifyUser.totalTime % 3600) / 60);
                                            return (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-blue-800 font-black">{hours}h {mins}m</span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-black text-kairos-navy">
                                            {user.cv + user.lp + user.cp + user.sharing}
                                        </span>
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
