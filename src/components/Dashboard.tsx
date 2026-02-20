import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { Essay } from '../constants';
import { motion } from 'framer-motion';

interface DashboardProps {
    essays: Essay[];
}

const COLORS = ['#0F1D42', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const Dashboard: React.FC<DashboardProps> = ({ essays }) => {
    // Process data for charts
    const categoryData = essays.reduce((acc: any[], essay) => {
        const existing = acc.find(i => i.name === essay.category);
        if (existing) existing.value += 1;
        else acc.push({ name: essay.category, value: 1 });
        return acc;
    }, []);

    const authorData = essays.reduce((acc: any[], essay) => {
        const name = essay.author.split('@')[0].split('.').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
        const existing = acc.find(i => i.name === name);
        if (existing) existing.count += 1;
        else acc.push({ name, count: 1 });
        return acc;
    }, []);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="card"
                >
                    <h3 className="text-lg font-heading font-bold text-kairos-navy mb-6">Enfoque de Aprendizaje</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Learning Activity */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="card"
                >
                    <h3 className="text-lg font-heading font-bold text-kairos-navy mb-6">Líderes de Conocimiento</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={authorData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f8f8f8' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="count" fill="#0F1D42" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Ensayos', value: essays.length },
                    { label: 'Categorías Exploradas', value: new Set(essays.map(e => e.category)).size },
                    { label: 'Mentes Activas', value: new Set(essays.map(e => e.author)).size },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="card text-center py-10"
                    >
                        <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">{stat.label}</p>
                        <p className="text-4xl font-heading font-bold text-kairos-navy">{stat.value}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
