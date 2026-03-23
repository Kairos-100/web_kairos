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
    Target,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [syncResult, setSyncResult] = React.useState<string | null>(null);

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const { error } = await supabase.functions.invoke('sync-holded-projects');
            if (error) throw error;
            setSyncResult('¡Listo!');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
            console.error('Error syncing Holded:', err);
            setSyncResult('Error');
        } finally {
            setIsSyncing(false);
        }
    };

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
                // Priority: Use subtotal for net invoicing, fallback to total
                const amount = Number(inv.subtotal ?? inv.total) || 0;
                
                if (inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform' || inv.type === 'debitnote') {
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
                const amount = Number(inv.subtotal ?? inv.total) || 0;
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
        const normalize = (s: string) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const safeProjects = Array.isArray(holdedProjects) ? holdedProjects : [];
        const safeSnapshots = Array.isArray(holdedSnapshots) ? holdedSnapshots : [];
        const safeAllInvoices = Array.isArray(allInvoices) ? allInvoices : [];

        // A. Handle projects and Snapshots grouped by Normalized Name
        const projectFinances = new Map<string, { income: number; expenses: number; profit: number; originalName: string; holdedIds: Set<string> }>();
        
        safeProjects.forEach(p => {
            const name = p.name || 'Sin Nombre';
            const normName = normalize(name);
            const hid = p.holded_id || (p as any).project_id || p.id;
            
            if (!projectFinances.has(normName)) {
                projectFinances.set(normName, {
                    originalName: name,
                    holdedIds: new Set(),
                    income: 0,
                    expenses: 0,
                    profit: 0
                });
            }
            if (hid) projectFinances.get(normName)?.holdedIds.add(hid);
        });

        // B. Update/Accumulate with Snapshot metrics (Only most recent per Holded ID)
        const sortedSnapshots = [...safeSnapshots].sort((a, b) => 
            new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
        );
        const processedSnapshotIds = new Set<string>();

        sortedSnapshots.forEach(s => {
            const name = s.name || 'Sin Nombre';
            const normName = normalize(name);
            const hid = s.holded_id || (s as any).project_id || s.id;
            
            if (!hid || processedSnapshotIds.has(hid)) return;
            processedSnapshotIds.add(hid);
            
            if (!projectFinances.has(normName)) {
                projectFinances.set(normName, {
                    originalName: name,
                    holdedIds: new Set(),
                    income: 0,
                    expenses: 0,
                    profit: 0
                });
            }
            
            const current = projectFinances.get(normName)!;
            current.holdedIds.add(hid);
            
            current.income += Number(s.metrics?.total_income) || 0;
            current.expenses += Number(s.metrics?.total_expenses) || 0;
            current.profit = current.income - current.expenses;
        });

        // C. Fallback: Aggregate metrics from ALL Invoices
        const invoicesByProject = new Map<string, HoldedInvoice[]>();
        const unmappedInvoices: HoldedInvoice[] = [];

        safeAllInvoices.forEach(inv => {
            const raw = inv.raw_data || {};
            const tags = Array.isArray(raw.tags) ? raw.tags : [];
            const concept = (inv.notes || '').toLowerCase() + (inv.contact_name || '').toLowerCase();
            
            // 1. Try Official project_id
            let projectGroupKey: string | undefined = undefined;
            if (inv.project_id) {
                const found = Array.from(projectFinances.entries()).find(([_, f]) => f.holdedIds.has(inv.project_id!));
                if (found) projectGroupKey = found[0];
            }
            
            // 2. Try Tag-based matching if no project_id or group key found
            if (!projectGroupKey && tags.length > 0) {
                for (const tag of tags) {
                    const normTag = normalize(String(tag));
                    const found = Array.from(projectFinances.entries()).find(([normName, _]) => normName.includes(normTag) || normTag.includes(normName));
                    if (found) {
                        projectGroupKey = found[0];
                        break;
                    }
                }
            }

            // 3. Try Name-based matching (Heuristic)
            if (!projectGroupKey) {
                const found = Array.from(projectFinances.entries()).find(([normName, _]) => normName.length > 3 && concept.includes(normName));
                if (found) {
                    projectGroupKey = found[0];
                }
            }

            if (projectGroupKey) {
                if (!invoicesByProject.has(projectGroupKey)) invoicesByProject.set(projectGroupKey, []);
                invoicesByProject.get(projectGroupKey)?.push(inv);

                const current = projectFinances.get(projectGroupKey);
                if (current) {
                    const amount = Number(inv.subtotal ?? inv.total) || 0;
                    
                    // CRITICAL LOGIC: 
                    // If the invoice was found via heuristics (inv.project_id is null or didn't match), 
                    // it means it's NOT in the official Holded project statistics (snapshot).
                    // We must add it to the total.
                    // If it was ALREADY linked to this project in Holded, it's likely already in the snapshot metrics,
                    // so we only add it if the snapshot metrics were empty (fallback).
                    
                    const isLinkedOfficial = inv.project_id && current.holdedIds.has(inv.project_id);
                    const shouldAddToTotal = !isLinkedOfficial || (current.income === 0 && current.expenses === 0);

                    if (shouldAddToTotal) {
                        if (inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform' || inv.type === 'debitnote') {
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
                if (inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform' || inv.type === 'debitnote') unmappedIncome += amount;
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
                holdedIds: new Set(['unmapped_virtual_id']),
                income: unmappedIncome,
                expenses: unmappedExpenses,
                profit: unmappedIncome - unmappedExpenses
            });
            invoicesByProject.set('unmapped_virtual_id', unmappedInvoices);
        }

        // Identify users per project from Clockify - INCLUDING HOURS
        const projectMemberData = new Map<string, Map<string, number>>(); // normProjectName -> { userEmail -> durationSeconds }
        
        if (clockifyData?.users) {
            console.log("FinanceView: Processing Clockify users:", clockifyData.users.length);
            clockifyData.users.forEach((u: any) => {
                u.projects?.forEach((p: any) => {
                    if (p.projectName) {
                        const normName = normalize(p.projectName);
                        if (!projectMemberData.has(normName)) projectMemberData.set(normName, new Map());
                        const currentHours = projectMemberData.get(normName)?.get(u.email) || 0;
                        projectMemberData.get(normName)?.set(u.email, currentHours + (p.time || 0));
                    }
                    p.detailedEntries?.forEach((e: any) => {
                        e.tags?.forEach((tagName: string) => {
                            const normTag = normalize(tagName);
                            if (!projectMemberData.has(normTag)) projectMemberData.set(normTag, new Map());
                            const currentHours = projectMemberData.get(normTag)?.get(u.email) || 0;
                            projectMemberData.get(normTag)?.set(u.email, currentHours + (e.time || 0));
                        });
                    });
                });
            });
            console.log("FinanceView: projectMemberData keys:", Array.from(projectMemberData.keys()));
        }

        const perUserHolded: Record<string, { billing: number; profit: number }> = {};
        const perProjectHolded: Array<{
            id: string;
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

        projectFinances.forEach((f, normName) => {
            const memberMap = projectMemberData.get(normName) || new Map<string, number>();
            const userList = Array.from(memberMap.keys());
            const totalProjectSeconds = Array.from(memberMap.values()).reduce((a, b) => a + b, 0);
            const totalProjectHours = totalProjectSeconds / 3600;
            
            const sharedProfit = f.profit * 0.5;
            const incomePerUser = userList.length > 0 ? f.income / userList.length : 0;
            const profitPerUser = userList.length > 0 ? sharedProfit / userList.length : 0;
            const rentabilityPerHour = totalProjectHours > 0 ? f.income / totalProjectHours : 0;

            const projectInvoices = invoicesByProject.get(normName) || [];
            const memberBreakdown = Array.from(memberMap.entries()).map(([email, seconds]) => ({
                email,
                hours: seconds / 3600
            })).sort((a, b) => b.hours - a.hours);
            
            perProjectHolded.push({
                id: normName,
                name: f.originalName,
                totalIncome: f.income,
                totalExpenses: f.expenses,
                totalProfit: f.profit,
                sharedIncome: f.income, 
                sharedProfit,
                users: userList,
                memberBreakdown,
                totalHours: totalProjectHours,
                rentabilityPerHour,
                profitPerUser,
                invoices: projectInvoices.sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0))
            });

            userList.forEach(email => {
                const userSeconds = memberMap.get(email) || 0;
                if (!perUserHolded[email]) perUserHolded[email] = { billing: 0, profit: 0, hours: 0 };
                perUserHolded[email].billing += incomePerUser;
                perUserHolded[email].profit += profitPerUser;
                perUserHolded[email].hours += userSeconds / 3600;
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
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Facturación (Base Imp.)</span>
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
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-sm ${
                                isSyncing 
                                ? 'bg-gray-100 text-gray-400' 
                                : 'bg-kairos-navy text-white hover:bg-blue-900 shadow-blue-50'
                            }`}
                        >
                            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                            <span>{isSyncing ? 'Sincronizando...' : syncResult || 'Sincronizar'}</span>
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
                                <React.Fragment key={proj.id || proj.name}>
                                    <tr 
                                        onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)}
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
                                                {(proj.memberBreakdown || []).length > 0 ? (
                                                    proj.memberBreakdown.map(member => (
                                                        <span key={member.email} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg border border-blue-100 uppercase">
                                                            {member.email.split('@')[0]} ({Math.round(member.hours)}h)
                                                        </span>
                                                    ))
                                                ) : <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Sin vincular</span>}
                                            </div>
                                            {proj.totalHours > 0 && (
                                                <p className="text-[8px] font-black text-gray-400 mt-1 uppercase tracking-tighter">
                                                    Total: {Math.round(proj.totalHours)}h • {formatCurrency(proj.rentabilityPerHour)}/h
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {(proj.users || []).length > 0 ? <p className="text-sm font-black text-emerald-600">+{formatCurrency(proj.profitPerUser)}</p> : <span className="text-gray-300">—</span>}
                                        </td>
                                    </tr>
                                    {expandedProject === proj.id && (
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
                                                                const isIncome = inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform' || inv.type === 'debitnote' || (inv.type === 'treasury' && Number(inv.total) > 0);
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
                                                                                        {inv.type === 'proform' ? 'Proforma' : inv.type === 'debitnote' ? 'D. Note' : inv.type === 'treasury' ? 'Banco' : inv.type === 'purchaserefund' ? 'Abono Compra' : inv.type === 'creditnote' ? 'Abono Venta' : inv.type}
                                                                                    </span>
                                                                                    {inv.status && (
                                                                                        <span className={`ml-1.5 px-1.5 py-0.5 text-[8px] rounded uppercase font-black tracking-tighter ${
                                                                                            inv.status === 'paid' || inv.status === '1' || inv.status === '2' ? 'bg-emerald-100 text-emerald-700' : 
                                                                                            inv.status === '0' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                                                                        }`}>
                                                                                            {inv.status === 'paid' || inv.status === '1' || inv.status === '2' ? 'Pagado' : inv.status === '0' ? 'Pendiente' : inv.status}
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{inv.doc_number} • {inv.date ? new Date(Number(inv.date) * 1000).toLocaleDateString() : '—'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <p className={`text-xs font-black ${isIncome || isRefund ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                                            {isIncome ? '+' : '-'}{formatCurrency(Math.abs(Number(inv.subtotal ?? inv.total)))}
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
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                            Facturación: {formatCurrency(data.billing)} • {Math.round(data.hours || 0)}h
                                        </p>
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
                            const isIncome = inv.type === 'invoice' || inv.type === 'salesreceipt' || inv.type === 'proform' || inv.type === 'debitnote' || (inv.type === 'treasury' && Number(inv.total) > 0);
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
                                                <span className="ml-2 text-[7px] text-gray-300 font-black uppercase tracking-tighter">{inv.type === 'proform' ? 'PROF' : inv.type === 'debitnote' ? 'DEBT' : inv.type === 'treasury' ? 'BANK' : inv.type === 'purchaserefund' ? 'REFD' : ''}</span>
                                            </p>
                                            <p className="text-[9px] text-gray-400 truncate">{inv.doc_number}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-xs font-black ${isIncome || isRefund ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {isIncome ? '+' : '-'}{formatCurrency(Math.abs(Number(inv.subtotal ?? inv.total)))}
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
