import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    Users,
    Search,
    Filter,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Building2,
    TrendingUp,
    Receipt,
    Target
} from 'lucide-react';
import type { HoldedInvoice, HoldedSnapshot, HoldedProject } from '../constants';
import type { ClockifyUserTime, ClockifyProjectSummary } from '../lib/clockify';

interface FinanceViewProps {
    invoices: HoldedInvoice[];
    allInvoices: HoldedInvoice[];
    holdedSnapshots: HoldedSnapshot[];
    holdedProjects: HoldedProject[];
    clockifyData: {
        users: ClockifyUserTime[];
        projects: ClockifyProjectSummary[];
        totalTime: number;
    } | null;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ 
    invoices = [], 
    allInvoices = [],
    holdedSnapshots = [],
    holdedProjects = [],
    clockifyData 
}) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [showEmptyProjects, setShowEmptyProjects] = React.useState(true);
    const [expandedProject, setExpandedProject] = React.useState<string | null>(null);

    const formatCurrency = (val: any) => {
        const num = Number(val) || 0;
        return new Intl.NumberFormat('es-ES', { 
            style: 'currency', 
            currency: 'EUR', 
            maximumFractionDigits: 0 
        }).format(num);
    };

    // 1. Calculate Global Metrics
    const globalMetrics = useMemo(() => {
        const safeInvoices = Array.isArray(invoices) ? invoices : [];
        const income = safeInvoices
            .reduce((acc, inv) => {
                const amount = Number(inv.total) || 0;
                if (inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform') {
                    return acc + amount;
                } else if (inv.type === 'creditnote') {
                    return acc - amount;
                } else if (inv.type === 'treasury' && amount > 0) {
                    return acc + amount;
                }
                return acc;
            }, 0);
            
        const expenses = safeInvoices
            .reduce((acc, inv) => {
                const amount = Number(inv.total) || 0;
                if (inv.type === 'purchase' || inv.type === 'expense') {
                    return acc + amount;
                } else if (inv.type === 'purchaserefund') {
                    return acc - amount;
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

    // 2. Project-Centric Distribution Logic
    const finances = useMemo(() => {
        const normalize = (s: string) => (s || '').trim().toLowerCase();
        const safeProjects = Array.isArray(holdedProjects) ? holdedProjects : [];
        const safeSnapshots = Array.isArray(holdedSnapshots) ? holdedSnapshots : [];
        const safeAllInvoices = Array.isArray(allInvoices) ? allInvoices : [];

        // A. Start with all projects from holded_projects
        const projectFinances = new Map<string, { income: number; expenses: number; profit: number; originalName: string; holdedId: string }>();
        
        safeProjects.forEach(p => {
            const id = p.holded_id || (p as any).project_id || p.id;
            if (id) {
                projectFinances.set(id, {
                    originalName: p.name || 'Sin Nombre',
                    holdedId: id,
                    income: 0,
                    expenses: 0,
                    profit: 0
                });
            }
        });

        // B. Update with Snapshot metrics
        safeSnapshots.forEach(s => {
            const id = s.holded_id || (s as any).project_id || s.id;
            if (id) {
                const current = projectFinances.get(id);
                const income = Number(s.metrics?.total_income) || 0;
                const expenses = Number(s.metrics?.total_expenses) || 0;
                
                if (!current || (income > 0 || expenses > 0)) {
                    projectFinances.set(id, { 
                        originalName: s.name || current?.originalName || 'Sin Nombre',
                        holdedId: id,
                        income: income || current?.income || 0, 
                        expenses: expenses || current?.expenses || 0,
                        profit: (income || current?.income || 0) - (expenses || current?.expenses || 0)
                    });
                }
            }
        });

        // C. Fallback: Aggregate metrics from ALL Invoices
        const invoicesByProject = new Map<string, HoldedInvoice[]>();
        const unmappedInvoices: HoldedInvoice[] = [];

        safeAllInvoices.forEach(inv => {
            const raw = inv.raw_data || {};
            const tags = Array.isArray(raw.tags) ? raw.tags : [];
            const concept = (inv.notes || '').toLowerCase() + (inv.contact_name || '').toLowerCase();
            
            // 1. Try Official project_id
            let id = inv.project_id;
            
            // 2. Try Tag-based matching if no project_id
            if (!id && tags.length > 0) {
                for (const tag of tags) {
                    const normTag = normalize(String(tag));
                    // Look for a project whose name matches the tag
                    const found = safeProjects.find(p => normalize(p.name).includes(normTag) || normTag.includes(normalize(p.name)));
                    if (found) {
                        id = found.holded_id || found.id;
                        break;
                    }
                }
            }

            // 3. Try Name-based matching (Heuristic)
            if (!id) {
                const found = safeProjects.find(p => concept.includes(normalize(p.name)) && normalize(p.name).length > 3);
                if (found) {
                    id = found.holded_id || found.id;
                }
            }

            if (id) {
                if (!invoicesByProject.has(id)) invoicesByProject.set(id, []);
                invoicesByProject.get(id)?.push(inv);

                const current = projectFinances.get(id);
                // We always update the fallback total if snapshots were zero OR if this is a treasury/proform item that snapshots might miss
                if (current && (current.income === 0 && current.expenses === 0)) {
                    const amount = Number(inv.total) || 0;
                    if (inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform') {
                        current.income += amount;
                    } else if (inv.type === 'creditnote') {
                        current.income -= amount;
                    } else if (inv.type === 'purchase' || inv.type === 'expense') {
                        current.expenses += amount;
                    } else if (inv.type === 'purchaserefund') {
                        current.expenses -= amount;
                    } else if (inv.type === 'treasury') {
                        if (amount > 0) current.income += amount;
                        else current.expenses += Math.abs(amount);
                    }
                    current.profit = current.income - current.expenses;
                }
            } else {
                unmappedInvoices.push(inv);
            }
        });

        // D. Create a virtual project for Unmapped items
        if (unmappedInvoices.length > 0) {
            let unmappedIncome = 0;
            let unmappedExpenses = 0;
            unmappedInvoices.forEach(inv => {
                const amount = Number(inv.total) || 0;
                if (inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform') unmappedIncome += amount;
                else if (inv.type === 'creditnote') unmappedIncome -= amount;
                else if (inv.type === 'purchase' || inv.type === 'expense') unmappedExpenses += amount;
                else if (inv.type === 'purchaserefund') unmappedExpenses -= amount;
                else if (inv.type === 'treasury') {
                    if (amount > 0) unmappedIncome += amount;
                    else unmappedExpenses += Math.abs(amount);
                }
            });

            projectFinances.set('unmapped_virtual_id', {
                originalName: 'OTROS / SIN PROYECTO',
                holdedId: 'unmapped_virtual_id',
                income: unmappedIncome,
                expenses: unmappedExpenses,
                profit: unmappedIncome - unmappedExpenses
            });
            invoicesByProject.set('unmapped_virtual_id', unmappedInvoices);
        }

        // Identify users per project from Clockify
        const projectUsers = new Map<string, Set<string>>();
        clockifyData?.users?.forEach((u: any) => {
            u.projects?.forEach((p: any) => {
                if (p.projectName) {
                    const normName = normalize(p.projectName);
                    if (!projectUsers.get(normName)) projectUsers.set(normName, new Set());
                    projectUsers.get(normName)?.add(u.email);
                }
                p.detailedEntries?.forEach((e: any) => {
                    e.tags?.forEach((tag: any) => {
                        const normTag = normalize(tag.name);
                        if (!projectUsers.get(normTag)) projectUsers.set(normTag, new Set());
                        projectUsers.get(normTag)?.add(u.email);
                    });
                });
            });
        });

        const perUserHolded: Record<string, { billing: number; profit: number }> = {};
        const perProjectHolded: Array<{
            name: string;
            totalIncome: number;
            totalExpenses: number;
            totalProfit: number;
            sharedIncome: number;
            sharedProfit: number;
            users: string[];
            profitPerUser: number;
            invoices: HoldedInvoice[];
        }> = [];

        projectFinances.forEach((f) => {
            const normName = normalize(f.originalName);
            const users = projectUsers.get(normName) || new Set<string>();
            const userList = Array.from(users);
            
            const sharedProfit = f.profit * 0.5;
            const incomePerUser = userList.length > 0 ? f.income / userList.length : 0;
            const profitPerUser = userList.length > 0 ? sharedProfit / userList.length : 0;

            const projectInvoices = invoicesByProject.get(f.holdedId) || [];
            
            perProjectHolded.push({
                name: f.originalName,
                totalIncome: f.income,
                totalExpenses: f.expenses,
                totalProfit: f.profit,
                sharedIncome: f.income, 
                sharedProfit,
                users: userList,
                profitPerUser,
                invoices: projectInvoices.sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0))
            });

            userList.forEach(email => {
                if (!perUserHolded[email]) perUserHolded[email] = { billing: 0, profit: 0 };
                perUserHolded[email].billing += incomePerUser;
                perUserHolded[email].profit += profitPerUser;
            });
        });

        const unmatchedProjects = perProjectHolded
            .filter(p => p.users.length === 0 && (p.totalIncome > 0 || p.totalExpenses > 0))
            .map(p => p.name);

        const filtered = perProjectHolded.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const hasActivity = p.totalIncome > 0 || p.totalExpenses > 0;
            return matchesSearch && (showEmptyProjects || hasActivity);
        });

        return {
            perProject: filtered.sort((a, b) => b.totalProfit - a.totalProfit),
            perUser: perUserHolded,
            unmatched: unmatchedProjects
        };
    }, [holdedSnapshots, holdedProjects, allInvoices, clockifyData, searchTerm, showEmptyProjects]);

    return (
        <div className="space-y-8 pb-12">
            {/* Global Metrics Cards */}
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

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-kairos-navy">Proyectos en Holded</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Historial total y distribución por equipo</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input 
                                type="text" 
                                placeholder="Buscar proyecto..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-200 transition-all w-64"
                            />
                        </div>
                        <button 
                            onClick={() => setShowEmptyProjects(!showEmptyProjects)}
                            className={`p-2 rounded-xl border transition-all ${showEmptyProjects ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-white border-gray-100 text-gray-400'}`}
                        >
                            <Filter size={16} />
                        </button>
                        <Target className="text-gray-300 ml-2" size={24} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-[10px] uppercase font-black tracking-widest bg-gray-50/30">
                                <th className="px-8 py-4">Proyecto</th>
                                <th className="px-8 py-4 text-right">Facturación</th>
                                <th className="px-8 py-4 text-right">Gastos</th>
                                <th className="px-8 py-4 text-right">Beneficio</th>
                                <th className="px-8 py-4 text-right text-emerald-600">50% Reparto</th>
                                <th className="px-8 py-4">Equipo</th>
                                <th className="px-8 py-4 text-right">Per Cápita</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {finances.perProject.map((proj) => (
                                <React.Fragment key={proj.name}>
                                    <tr 
                                        onClick={() => setExpandedProject(expandedProject === proj.name ? null : proj.name)}
                                        className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${proj.totalProfit >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                                <p className="text-sm font-black text-kairos-navy">{proj.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right"><span className="text-xs font-bold text-gray-600">{formatCurrency(proj.totalIncome)}</span></td>
                                        <td className="px-8 py-6 text-right"><span className="text-xs font-bold text-rose-400">{formatCurrency(proj.totalExpenses)}</span></td>
                                        <td className="px-8 py-6 text-right"><p className={`text-xs font-black ${proj.totalProfit >= 0 ? 'text-kairos-navy' : 'text-rose-500'}`}>{formatCurrency(proj.totalProfit)}</p></td>
                                        <td className="px-8 py-6 text-right"><p className="text-sm font-black text-emerald-600">{formatCurrency(proj.sharedProfit)}</p></td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-wrap gap-1">
                                                {(proj.users || []).length > 0 ? (
                                                    proj.users.map(email => (
                                                        <span key={email} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg border border-blue-100 uppercase">{email.split('@')[0]}</span>
                                                    ))
                                                ) : <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Sin vincular</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {(proj.users || []).length > 0 ? <p className="text-sm font-black text-emerald-600">+{formatCurrency(proj.profitPerUser)}</p> : <span className="text-gray-300">—</span>}
                                        </td>
                                    </tr>
                                    {expandedProject === proj.name && (
                                        <tr className="bg-gray-50/50">
                                            <td colSpan={7} className="px-12 py-6">
                                                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                                    <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                            <Receipt size={12} /> Desglose de Facturas y Gastos
                                                        </h5>
                                                        <span className="text-[10px] font-bold text-gray-400">{(proj.invoices || []).length} documentos</span>
                                                    </div>
                                                        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                                                            {(proj.invoices || []).length > 0 ? proj.invoices.map((inv, i) => {
                                                                const isIncome = inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform' || (inv.type === 'treasury' && Number(inv.total) > 0);
                                                                const isRefund = inv.type === 'purchaserefund' || inv.type === 'creditnote';
                                                                
                                                                return (
                                                                    <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                                                        <div className="flex items-center space-x-3">
                                                                            <div className={`p-2 rounded-lg ${isIncome || isRefund ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                                {isIncome || isRefund ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-black text-kairos-navy">
                                                                                    {inv.contact_name || 'Sin contacto'}
                                                                                    <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-[8px] text-gray-400 rounded uppercase font-bold tracking-widest">
                                                                                        {inv.type === 'proform' ? 'Proforma' : inv.type === 'treasury' ? 'Banco' : inv.type === 'purchaserefund' ? 'Abono Compra' : inv.type === 'creditnote' ? 'Abono Venta' : inv.type}
                                                                                    </span>
                                                                                </p>
                                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{inv.doc_number} • {inv.date ? new Date(Number(inv.date) * 1000).toLocaleDateString() : '—'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <p className={`text-xs font-black ${isIncome || isRefund ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                                            {isIncome ? '+' : '-'}{formatCurrency(Math.abs(Number(inv.total)))}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            }) : (
                                                            <div className="px-6 py-8 text-center text-[10px] text-gray-400 italic">No hay documentos individuales.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-kairos-navy">Resumen por Persona</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Totales del periodo</p>
                        </div>
                        <Users className="text-gray-200" size={24} />
                    </div>
                    <div className="space-y-4">
                        {Object.entries(finances.perUser || {}).sort((a: any, b: any) => b[1].profit - a[1].profit).map(([email, data]: any) => (
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

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-8 overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-kairos-navy">Últimas Facturas</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sincronización Holded</p>
                        </div>
                        <Receipt className="text-gray-200" size={24} />
                    </div>
                    <div className="space-y-3">
                        {(invoices || []).slice(0, 8).map((inv) => {
                            const isIncome = inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform' || (inv.type === 'treasury' && Number(inv.total) > 0);
                            const isRefund = inv.type === 'purchaserefund' || inv.type === 'creditnote';
                            
                            return (
                                <div key={inv.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-3 truncate">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isIncome || isRefund ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {isIncome || isRefund ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                        </div>
                                        <div className="truncate">
                                            <p className="text-xs font-black text-kairos-navy truncate">
                                                {inv.contact_name}
                                                <span className="ml-2 text-[7px] text-gray-300 font-black uppercase tracking-tighter">{inv.type === 'proform' ? 'PROF' : inv.type === 'treasury' ? 'BANK' : inv.type === 'purchaserefund' ? 'REFD' : ''}</span>
                                            </p>
                                            <p className="text-[9px] text-gray-400 truncate">{inv.doc_number}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-xs font-black ${isIncome || isRefund ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {isIncome ? '+' : '-'}{formatCurrency(Math.abs(Number(inv.total)))}
                                        </p>
                                        <span className="text-[8px] text-gray-300 font-bold">{inv.date ? new Date(Number(inv.date) * 1000).toLocaleDateString() : '—'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
