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
    Users,
    RefreshCw,
    Info
} from 'lucide-react';
import type { HoldedInvoice } from '../constants';
import { supabase } from '../lib/supabase';

interface HoldedHubProps {
    invoices: HoldedInvoice[];
    perUserHolded: Record<string, { billing: number; profit: number }>;
    unmatchedProjects?: string[];
    projectDistribution?: Array<{
        name: string;
        totalIncome: number;
        totalProfit: number;
        sharedIncome: number;
        sharedProfit: number;
        users: string[];
        profitPerUser: number;
    }>;
}

export const HoldedHub: React.FC<HoldedHubProps> = ({ 
    invoices, 
    perUserHolded, 
    unmatchedProjects = [],
    projectDistribution = []
}) => {
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [syncResult, setSyncResult] = React.useState<string | null>(null);

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const { error } = await supabase.functions.invoke('sync-holded-projects');
            if (error) throw error;
            setSyncResult('¡Sincronización completada!');
            // Refresh the page or data after sync
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (err: any) {
            console.error('Error syncing Holded:', err);
            setSyncResult('Error al sincronizar');
        } finally {
            setIsSyncing(false);
        }
    };

    // 1. Calculate Global Metrics
    const globalMetrics = useMemo(() => {
        // Income = invoices + salesreceipts + proform + debitnote - creditnotes + positive treasury
        const income = invoices
            .reduce((acc, inv) => {
                const amount = Number(inv.subtotal ?? inv.total) || 0;
                if (inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform' || inv.type === 'debitnote') {
                    return acc + amount;
                } else if (inv.type === 'creditnote') {
                    return acc - amount; // Correctly subtract credit notes
                } else if (inv.type === 'treasury' && amount > 0) {
                    return acc + amount;
                }
                return acc;
            }, 0);
            
        // Expenses = purchases + generic expenses + negative treasury - purchaserefunds
        const expenses = invoices
            .reduce((acc, inv) => {
                const amount = Number(inv.subtotal ?? inv.total) || 0;
                if (inv.type === 'purchase' || inv.type === 'expense') {
                    return acc + amount;
                } else if (inv.type === 'purchaserefund') {
                    return acc - amount; // Correctly subtract purchase refunds
                } else if (inv.type === 'treasury' && amount < 0) {
                    return acc + Math.abs(amount);
                }
                return acc;
            }, 0);

        return {
            income,
            expenses,
            profit: income - expenses
        };
    }, [invoices]);

    // 2. Formatting Helpers
    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8 pb-12">
            {/* Header section with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Available Cash / Total Billing Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-[32px] border border-emerald-100 shadow-xl shadow-emerald-50 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Wallet size={80} className="text-emerald-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 text-emerald-600 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <TrendingUp size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Facturación Total</span>
                        </div>
                        <h2 className="text-4xl font-black text-kairos-navy mb-1">{formatCurrency(globalMetrics.income)}</h2>
                        <p className="text-xs text-emerald-600 font-bold flex items-center space-x-1">
                            <ArrowUpRight size={14} />
                            <span>100% de los proyectos activos</span>
                        </p>
                    </div>
                </motion.div>

                {/* Expenses Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-8 rounded-[32px] border border-rose-100 shadow-xl shadow-rose-50 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform text-rose-600">
                        <ArrowDownRight size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 text-rose-600 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                                <Receipt size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Gastos Acumulados</span>
                        </div>
                        <h2 className="text-4xl font-black text-kairos-navy mb-1">{formatCurrency(globalMetrics.expenses)}</h2>
                        <p className="text-xs text-rose-600 font-bold flex items-center space-x-1">
                            <span>Costes operativos y compras</span>
                        </p>
                    </div>
                </motion.div>

                {/* Net Profit Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-kairos-navy to-blue-900 p-8 rounded-[32px] shadow-2xl relative overflow-hidden group text-white"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Building2 size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                                <Target size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Beneficio Neto (Caja)</span>
                        </div>
                        <h2 className="text-4xl font-black mb-1">{formatCurrency(globalMetrics.profit)}</h2>
                        <p className="text-xs text-white/60 font-medium">
                            Resultado disponible después de gastos
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Sync Action Area */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
                <div className="flex items-center space-x-2 text-gray-400">
                    <Info size={14} className="text-blue-400" />
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        Los totales incluyen <span className="text-kairos-navy">Facturas, Proformas, Abonos, Gastos</span> y <span className="text-kairos-navy">Movimientos Bancarios</span> sin vincular.
                    </p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-lg active:scale-95 ${
                        isSyncing 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-kairos-navy text-white hover:bg-blue-900 shadow-blue-100'
                    }`}
                >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                    <span>{isSyncing ? 'Sincronizando Holded...' : syncResult || 'Sincronizar Holded Ahora'}</span>
                </button>
            </div>

            {/* Debugging / Unmatched Projects Section */}
            {unmatchedProjects.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                            <Target size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-amber-900 leading-tight">Proyectos de Holded sin vincular</h4>
                            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mt-0.5">Estos proyectos no tienen etiquetas coincidentes en Clockify (50/50 no aplicado)</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {unmatchedProjects.map(name => (
                            <span key={name} className="px-3 py-1 bg-white/50 border border-amber-200 text-amber-800 text-[10px] font-black rounded-xl italic">
                                "{name}"
                            </span>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Project-Centric Breakdown */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden"
            >
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-kairos-navy">Desglose por Proyecto (Holded)</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Visión por proyecto antes del reparto 50/50</p>
                    </div>
                    <Target className="text-gray-300" size={24} />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-[10px] uppercase font-black tracking-widest bg-gray-50/30">
                                <th className="px-8 py-4">Proyecto</th>
                                <th className="px-8 py-4 text-right">Facturación</th>
                                <th className="px-8 py-4 text-right">Beneficio Total</th>
                                <th className="px-8 py-4 text-right text-emerald-600">50% a Repartir</th>
                                <th className="px-8 py-4">Kairenses</th>
                                <th className="px-8 py-4 text-right">Beneficio/Persona</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {projectDistribution.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-12 text-center text-xs text-gray-400 italic">
                                        No hay datos de proyectos disponibles.
                                    </td>
                                </tr>
                            ) : (
                                projectDistribution
                                    .sort((a, b) => b.totalProfit - a.totalProfit)
                                    .map((proj, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-kairos-navy">{proj.name}</p>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-xs font-bold text-gray-600">{formatCurrency(proj.totalIncome)}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className={`text-xs font-black ${proj.totalProfit >= 0 ? 'text-kairos-navy' : 'text-rose-500'}`}>
                                                    {formatCurrency(proj.totalProfit)}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-sm font-black text-emerald-600">
                                                    {formatCurrency(proj.sharedProfit)}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-wrap gap-1">
                                                    {proj.users.length > 0 ? (
                                                        proj.users.map(email => (
                                                            <span key={email} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg border border-blue-100 uppercase">
                                                                {email.split('@')[0]}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Sin vincular</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {proj.users.length > 0 ? (
                                                    <p className="text-sm font-black text-emerald-600">+{formatCurrency(proj.profitPerUser)}</p>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Per-Person Split Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Earnings List */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-8"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-kairos-navy">Reparto Individual (50/50)</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Basado en etiquetas de Clockify</p>
                        </div>
                        <Users className="text-gray-200" size={24} />
                    </div>
                    
                    <div className="space-y-4">
                        {Object.entries(perUserHolded).sort((a, b) => b[1].profit - a[1].profit).map(([email, data]) => (
                            <div key={email} className="bg-gray-50/50 p-4 rounded-2xl flex items-center justify-between group hover:bg-emerald-50/30 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black text-kairos-navy">
                                        {email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-kairos-navy lowercase">{email.split('@')[0]}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Facturación: {formatCurrency(data.billing)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-emerald-600">+{formatCurrency(data.profit)}</p>
                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg">Ganancia Propia</span>
                                </div>
                            </div>
                        ))}
                        {Object.keys(perUserHolded).length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-xs text-gray-400 italic">No hay datos de reparto aún. Asegúrate de que las etiquetas de Clockify coincidan con los proyectos de Holded.</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Recent Invoices List Mini */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-8 overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-kairos-navy">Últimas Facturas</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sincronización en tiempo real</p>
                        </div>
                        <Receipt className="text-gray-200" size={24} />
                    </div>

                    <div className="space-y-3">
                        {invoices.slice(0, 5).map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-3 truncate">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${inv.type === 'invoice' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {inv.type === 'invoice' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-black text-kairos-navy truncate">
                                            {inv.contact_name}
                                            {inv.status && (
                                                <span className={`ml-1.5 px-1 py-0.5 text-[7px] rounded uppercase font-black tracking-tighter ${
                                                    inv.status === 'paid' || inv.status === '1' || inv.status === '2' ? 'bg-emerald-50 text-emerald-600' : 
                                                    inv.status === '0' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'
                                                }`}>
                                                    {inv.status === 'paid' || inv.status === '1' || inv.status === '2' ? 'PAG' : inv.status === '0' ? 'PEND' : inv.status.substring(0,4)}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-[9px] text-gray-400 truncate">{inv.doc_number}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-xs font-black ${inv.type === 'invoice' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {inv.type === 'invoice' ? '+' : '-'}{inv.total.toLocaleString()}€
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
