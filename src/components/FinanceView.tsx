import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    Wallet, 
    ArrowUpRight, 
    ArrowDownRight, 
    Building2, 
    TrendingUp, 
    Receipt,
    Target,
    Users
} from 'lucide-react';
import type { HoldedInvoice, HoldedSnapshot } from '../constants';
import type { ClockifyUserTime, ClockifyProjectSummary } from '../lib/clockify';

interface FinanceViewProps {
    invoices: HoldedInvoice[];
    holdedSnapshots: HoldedSnapshot[];
    clockifyData: {
        users: ClockifyUserTime[];
        projects: ClockifyProjectSummary[];
        totalTime: number;
    } | null;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ 
    invoices, 
    holdedSnapshots,
    clockifyData 
}) => {
    // 1. Calculate Global Metrics
    const globalMetrics = useMemo(() => {
        const income = invoices
            .reduce((acc, inv) => {
                const amount = inv.total || 0;
                if (inv.type === 'invoice' || inv.type === 'salesreceipt') {
                    return acc + amount;
                } else if (inv.type === 'creditnote') {
                    return acc - amount;
                }
                return acc;
            }, 0);
            
        const expenses = invoices
            .reduce((acc, inv) => {
                const amount = inv.total || 0;
                if (inv.type === 'purchase' || inv.type === 'expense') {
                    return acc + amount;
                }
                return acc;
            }, 0);

        return {
            income,
            expenses,
            profit: income - expenses
        };
    }, [invoices]);

    // 2. Project-Centric Distribution Logic
    const finances = useMemo(() => {
        const normalize = (s: string) => s.trim().toLowerCase();

        // Map Holded Projects to their latest billing/profit
        const projectFinances = new Map<string, { income: number; profit: number; originalName: string }>();
        holdedSnapshots.forEach(s => {
            if (s.name) {
                const normName = normalize(s.name);
                if (!projectFinances.has(normName)) {
                    projectFinances.set(normName, { 
                        originalName: s.name,
                        income: s.metrics?.total_income || 0, 
                        profit: (s.metrics?.total_income || 0) - (s.metrics?.total_expenses || 0)
                    });
                }
            }
        });

        // Identify users per project from Clockify
        const projectUsers = new Map<string, Set<string>>();
        clockifyData?.users.forEach((u: any) => {
            u.projects.forEach((p: any) => {
                if (p.projectName) {
                    const normName = normalize(p.projectName);
                    if (!projectUsers.has(normName)) projectUsers.set(normName, new Set());
                    projectUsers.get(normName)?.add(u.email);
                }
                p.detailedEntries?.forEach((e: any) => {
                    e.tags?.forEach((tag: string) => {
                        const normTag = normalize(tag);
                        if (!projectUsers.has(normTag)) projectUsers.set(normTag, new Set());
                        projectUsers.get(normTag)?.add(u.email);
                    });
                });
            });
        });

        const perUserHolded: Record<string, { billing: number; profit: number }> = {};
        const perProjectHolded: Array<{
            name: string;
            totalIncome: number;
            totalProfit: number;
            sharedIncome: number;
            sharedProfit: number;
            users: string[];
            profitPerUser: number;
        }> = [];

        projectFinances.forEach((f, normalizedName) => {
            const users = projectUsers.get(normalizedName);
            const userList = users ? Array.from(users) : [];
            
            const sharedIncome = f.income * 0.5;
            const sharedProfit = f.profit * 0.5;
            const profitPerUser = userList.length > 0 ? sharedProfit / userList.length : 0;
            const incomePerUser = userList.length > 0 ? sharedIncome / userList.length : 0;

            perProjectHolded.push({
                name: f.originalName,
                totalIncome: f.income,
                totalProfit: f.profit,
                sharedIncome,
                sharedProfit,
                users: userList,
                profitPerUser
            });

            userList.forEach(email => {
                if (!perUserHolded[email]) perUserHolded[email] = { billing: 0, profit: 0 };
                perUserHolded[email].billing += incomePerUser;
                perUserHolded[email].profit += profitPerUser;
            });
        });

        const unmatchedProjects = perProjectHolded
            .filter(p => p.users.length === 0 && (p.totalIncome > 0 || p.totalProfit !== 0))
            .map(p => p.name);

        return {
            perProject: perProjectHolded,
            perUser: perUserHolded,
            unmatched: unmatchedProjects
        };
    }, [holdedSnapshots, clockifyData]);

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8 pb-12">
            {/* 1. Global Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[32px] border border-emerald-100 shadow-xl shadow-emerald-50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Wallet size={80} className="text-emerald-600" /></div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 text-emerald-600 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center"><TrendingUp size={16} /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Facturación Total</span>
                        </div>
                        <h2 className="text-4xl font-black text-kairos-navy mb-1">{formatCurrency(globalMetrics.income)}</h2>
                        <p className="text-xs text-emerald-600 font-bold flex items-center space-x-1"><ArrowUpRight size={14} /><span>Sincronizado con Holded</span></p>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-8 rounded-[32px] border border-rose-100 shadow-xl shadow-rose-50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform text-rose-600"><ArrowDownRight size={80} /></div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 text-rose-600 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center"><Receipt size={16} /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Gastos Acumulados</span>
                        </div>
                        <h2 className="text-4xl font-black text-kairos-navy mb-1">{formatCurrency(globalMetrics.expenses)}</h2>
                        <p className="text-xs text-rose-600 font-bold">Costes operativos y compras</p>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-kairos-navy to-blue-900 p-8 rounded-[32px] shadow-2xl relative overflow-hidden group text-white">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Building2 size={80} /></div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white"><Target size={16} /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Beneficio Neto</span>
                        </div>
                        <h2 className="text-4xl font-black mb-1">{formatCurrency(globalMetrics.profit)}</h2>
                        <p className="text-xs text-white/60 font-medium">Resultado después de gastos</p>
                    </div>
                </motion.div>
            </div>

            {/* 2. Unmatched Projects Alert */}
            {finances.unmatched.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0"><Target size={20} /></div>
                        <div>
                            <h4 className="text-sm font-black text-amber-900 leading-tight">Proyectos de Holded sin vincular</h4>
                            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mt-0.5">Estos proyectos no tienen etiquetas coincidentes en Clockify (50/50 no aplicado)</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {finances.unmatched.map(name => (
                            <span key={name} className="px-3 py-1 bg-white/50 border border-amber-200 text-amber-800 text-[10px] font-black rounded-xl italic">"{name}"</span>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* 3. Project Centric Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-kairos-navy">Desglose por Proyecto (Holded)</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Visión por proyecto y reparto 50/50</p>
                    </div>
                    <Target className="text-gray-300" size={24} />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-[10px] uppercase font-black tracking-widest bg-gray-50/30">
                                <th className="px-8 py-4">Proyecto</th>
                                <th className="px-8 py-4 text-right">Facturación</th>
                                <th className="px-8 py-4 text-right">Beneficio</th>
                                <th className="px-8 py-4 text-right text-emerald-600">50% Reparto</th>
                                <th className="px-8 py-4">Equipo</th>
                                <th className="px-8 py-4 text-right">Per Cápita</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {finances.perProject.sort((a, b) => b.totalProfit - a.totalProfit).map((proj, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-8 py-6"><p className="text-sm font-black text-kairos-navy">{proj.name}</p></td>
                                    <td className="px-8 py-6 text-right"><span className="text-xs font-bold text-gray-600">{formatCurrency(proj.totalIncome)}</span></td>
                                    <td className="px-8 py-6 text-right"><p className={`text-xs font-black ${proj.totalProfit >= 0 ? 'text-kairos-navy' : 'text-rose-500'}`}>{formatCurrency(proj.totalProfit)}</p></td>
                                    <td className="px-8 py-6 text-right"><p className="text-sm font-black text-emerald-600">{formatCurrency(proj.sharedProfit)}</p></td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-1">
                                            {proj.users.length > 0 ? proj.users.map(email => (
                                                <span key={email} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg border border-blue-100 uppercase">{email.split('@')[0]}</span>
                                            )) : <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Sin vincular</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {proj.users.length > 0 ? <p className="text-sm font-black text-emerald-600">+{formatCurrency(proj.profitPerUser)}</p> : <span className="text-gray-300">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* 4. Individual Summary Ranking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-kairos-navy">Resumen por Persona</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Totales acumulados del periodo</p>
                        </div>
                        <Users className="text-gray-200" size={24} />
                    </div>
                    <div className="space-y-4">
                        {Object.entries(finances.perUser).sort((a, b) => b[1].profit - a[1].profit).map(([email, data]) => (
                            <div key={email} className="bg-gray-50/50 p-4 rounded-2xl flex items-center justify-between group hover:bg-emerald-50/30 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black text-kairos-navy">{email[0].toUpperCase()}</div>
                                    <div>
                                        <p className="text-sm font-black text-kairos-navy lowercase">{email.split('@')[0]}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Facturación: {formatCurrency(data.billing)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-emerald-600">+{formatCurrency(data.profit)}</p>
                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg">Ganancia</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* 5. Recent Invoices List Mini */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-8 overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-kairos-navy">Últimas Facturas</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sincronización Holded</p>
                        </div>
                        <Receipt className="text-gray-200" size={24} />
                    </div>
                    <div className="space-y-3">
                        {invoices.slice(0, 8).map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-3 truncate">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${inv.type === 'invoice' || inv.type === 'salesreceipt' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {inv.type === 'invoice' || inv.type === 'salesreceipt' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-black text-kairos-navy truncate">{inv.contact_name}</p>
                                        <p className="text-[9px] text-gray-400 truncate">{inv.doc_number}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-xs font-black ${inv.type === 'invoice' || inv.type === 'salesreceipt' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {inv.type === 'invoice' || inv.type === 'salesreceipt' ? '+' : '-'}{inv.total.toLocaleString()}€
                                    </p>
                                    <span className="text-[8px] text-gray-300 font-bold">{new Date(inv.date * 1000).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
