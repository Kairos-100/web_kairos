import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { Essay } from '../constants';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, BookOpen, Layers } from 'lucide-react';

interface ScoresViewProps {
    essays: Essay[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export const ScoresView: React.FC<ScoresViewProps> = ({ essays }) => {
    // Process data for charts
    // 1. Points per day
    const pointsByDay = essays.reduce((acc: Record<string, number>, essay) => {
        const date = essay.date;
        const points = essay.points || 0;
        acc[date] = (acc[date] || 0) + points;
        return acc;
    }, {});

    const chartData = Object.entries(pointsByDay)
        .map(([date, points]) => ({ date, points }))
        .sort((a, b) => {
            const [da, ma, ya] = a.date.split('/').map(Number);
            const [db, mb, yb] = b.date.split('/').map(Number);
            return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
        });

    // 2. Type distribution
    const typeData = essays.reduce((acc: any[], essay) => {
        const typeLabel = essay.type === 'molecula' ? 'Moléculas' : essay.type === 'libro' ? 'Libros' : 'Otros';
        const existing = acc.find(i => i.name === typeLabel);
        if (existing) existing.value += (essay.points || 0);
        else acc.push({ name: typeLabel, value: (essay.points || 0) });
        return acc;
    }, []);

    const totalScore = essays.reduce((sum, e) => sum + (e.points || 0), 0);
    const moleculasCount = essays.filter(e => e.type === 'molecula').length;
    const librosCount = essays.filter(e => e.type === 'libro').length;

    // 3. Top Contributors
    const topContributors = essays.reduce((acc: Record<string, number>, essay) => {
        const name = essay.author.split('@')[0].split('.').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
        acc[name] = (acc[name] || 0) + (essay.points || 0);
        return acc;
    }, {});

    const rankingData = Object.entries(topContributors)
        .map(([name, points]) => ({ name, points }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

    return (
        <div className="space-y-8 pb-20">
            {/* Header / Total Score */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="geometric-bg text-white p-10 rounded-3xl shadow-xl flex flex-col items-center text-center relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
                <Trophy size={48} className="text-yellow-400 mb-4" />
                <h2 className="text-xl font-bold uppercase tracking-widest opacity-60 mb-2">Puntuación Total</h2>
                <div className="text-7xl font-heading font-bold mb-4">{totalScore}</div>
                <p className="text-blue-200 font-medium max-w-sm">
                    Has acumulado puntos a través de la publicación de Moléculas y Libros de conocimiento.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Cards */}
                <div className="lg:col-span-1 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="card flex items-center space-x-4 p-6"
                    >
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Layers size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Moléculas</p>
                            <p className="text-2xl font-heading font-bold text-kairos-navy">{moleculasCount}</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="card flex items-center space-x-4 p-6"
                    >
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Libros</p>
                            <p className="text-2xl font-heading font-bold text-kairos-navy">{librosCount}</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="card p-6"
                    >
                        <h3 className="text-sm font-bold text-kairos-navy mb-4 uppercase tracking-widest">Distribución de Puntos</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {typeData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

                {/* Score Evolution Chart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-2 card p-8"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-heading font-bold text-kairos-navy">Evolución de Puntos</h3>
                            <p className="text-sm text-gray-400">Puntos acumulados por día de publicación</p>
                        </div>
                        <TrendingUp size={24} className="text-blue-500" />
                    </div>

                    <div className="h-48 w-full mb-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontWeight: 700, color: '#0F1D42' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="points"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorPoints)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="border-t border-gray-50 pt-8">
                        <h4 className="text-sm font-bold text-kairos-navy mb-4 uppercase tracking-widest flex items-center">
                            <Trophy size={16} className="text-yellow-500 mr-2" />
                            Ranking de Contribuidores
                        </h4>
                        <div className="space-y-4">
                            {rankingData.map((user, index) => (
                                <div key={user.name} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                                            {index + 1}
                                        </span>
                                        <span className="text-sm font-bold text-kairos-navy">{user.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-blue-600">{user.points} pts</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Daily Breakdown List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8"
            >
                <h3 className="text-xl font-heading font-bold text-kairos-navy mb-6">Desglose de Aportaciones</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-gray-50">
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Fecha</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Título</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Autor</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoría</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Puntos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {essays
                                .sort((a, b) => {
                                    const [da, ma, ya] = a.date.split('/').map(Number);
                                    const [db, mb, yb] = b.date.split('/').map(Number);
                                    return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
                                })
                                .map((essay) => (
                                    <tr key={essay.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 text-sm font-medium text-gray-400">{essay.date}</td>
                                        <td className="py-4 text-sm font-bold text-kairos-navy">{essay.title}</td>
                                        <td className="py-4 text-xs font-medium text-gray-500">{essay.author.split('@')[0]}</td>
                                        <td className="py-4 text-xs font-bold text-blue-600/70">{essay.category}</td>
                                        <td className="py-4">
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${essay.type === 'molecula' ? 'bg-blue-50 text-blue-600' :
                                                essay.type === 'libro' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                                                }`}>
                                                {essay.type || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-sm font-bold text-kairos-navy text-right">
                                            +{essay.points || 0}
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
