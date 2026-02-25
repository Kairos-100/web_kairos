import React, { useMemo } from 'react';
import { Clock, BookOpen, TrendingUp, Calendar, User, ArrowUpRight } from 'lucide-react';
import type { Essay, MetricEntry } from '../constants';
import { motion } from 'framer-motion';

interface ActivityViewProps {
    essays: Essay[];
    metrics: MetricEntry[];
}

interface ActivityItem {
    id: string;
    type: 'tesis' | 'metrica';
    title: string;
    author: string;
    refDate: string;
    createdAt: string;
    data: any;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ essays, metrics }) => {
    const activityFeed = useMemo(() => {
        const feed: ActivityItem[] = [
            ...essays.map(e => ({
                id: `essay-${e.id}`,
                type: 'tesis' as const,
                title: e.title,
                author: e.author,
                refDate: e.date,
                createdAt: (e as any).created_at || e.date, // Fallback if created_at not present
                data: e
            })),
            ...metrics.map(m => ({
                id: `metric-${m.id}`,
                type: 'metrica' as const,
                title: `Registro de Métricas - ${m.user_email.split('@')[0]}`,
                author: m.user_email,
                refDate: m.date,
                createdAt: m.created_at,
                data: m
            }))
        ];

        // Sort by created_at descending
        return feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [essays, metrics]);

    const formatDateTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-heading font-bold text-kairos-navy">Log de Actividad</h3>
                        <p className="text-sm text-gray-500">Cronología de aportaciones y registros en Kairos.</p>
                    </div>
                    <div className="flex space-x-2">
                        <div className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <BookOpen size={12} />
                            <span>Tesis</span>
                        </div>
                        <div className="flex items-center space-x-1 px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <TrendingUp size={12} />
                            <span>Métricas</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-gray-50">
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Actividad</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Autor</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Fecha Ref.</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap text-right">Subido el</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {activityFeed.map((item, index) => (
                                <motion.tr
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group hover:bg-gray-50/50 transition-colors"
                                >
                                    <td className="py-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'tesis' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                            {item.type === 'tesis' ? <BookOpen size={16} /> : <TrendingUp size={16} />}
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-kairos-navy line-clamp-1">{item.title}</span>
                                            <div className="flex flex-col space-y-0.5">
                                                <span className="text-[10px] text-gray-400 font-medium tracking-tight">
                                                    {item.type === 'tesis' ? 'Nuevo conocimiento compartido' : 'Registro de actividad comercial'}
                                                </span>
                                                {item.type === 'metrica' && (
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                                                        {item.data.cv > 0 && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">CV{item.data.cv_title ? `: ${item.data.cv_title}` : ''}</span>}
                                                        {item.data.sharing > 0 && <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">SH{item.data.sharing_title ? `: ${item.data.sharing_title}` : ''}</span>}
                                                        {item.data.cp > 0 && <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">CP{item.data.cp_title ? `: ${item.data.cp_title}` : ''}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                                                <User size={12} className="text-gray-400" />
                                            </div>
                                            <span className="text-xs font-bold text-gray-600">{item.author.split('@')[0]}</span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center space-x-1.5 text-xs text-kairos-navy font-bold">
                                            <Calendar size={12} className="text-gray-300" />
                                            <span>{item.refDate}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center space-x-1 text-xs font-bold text-gray-500">
                                                <Clock size={12} className="text-gray-300" />
                                                <span>{formatDateTime(item.createdAt)}</span>
                                            </div>
                                            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-300 group-hover:text-blue-500 transition-colors flex items-center">
                                                Ver detalle <ArrowUpRight size={10} className="ml-1" />
                                            </span>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                            {activityFeed.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400 italic text-sm">
                                        No hay actividad registrada aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
